import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type PocketBase from 'pocketbase';
import { inject } from 'vitest';
import { asSuperuser, asUser, createUser } from '../../../../tests/support/clients';
import { NetworkError } from '../../shared/errors/domain-errors';
import { PB_URL } from '../../shared/pocketbase/pb-url';
import { POCKETBASE, providePocketBase } from '../../shared/pocketbase/pocketbase-client';
import type { AuthService } from '../domain/auth-service';
import { describeAuthServiceContract } from '../testing/auth-service.contract';
import { PocketBaseAuthService } from './pocketbase-auth-service';

// Сервис из отдельного инжектора приложения, как у отдельного SSR-запроса или вкладки.
function createService(pbUrl: string = inject('pbUrl')): { auth: AuthService; pb: PocketBase } {
    const injector = createEnvironmentInjector(
        [providePocketBase(), { provide: PB_URL, useValue: pbUrl }, PocketBaseAuthService],
        TestBed.inject(EnvironmentInjector),
    );
    return { auth: injector.get(PocketBaseAuthService), pb: injector.get(POCKETBASE) };
}

/** Токен и запись настоящего входа, как их кладёт в auth store cookie. */
async function sessionOf(user: Awaited<ReturnType<typeof createUser>>) {
    const { authStore } = await asUser(user);
    return { token: authStore.token, record: authStore.record };
}

/** JWT с той же шапкой и данными, но чужой подписью: локально выглядит валидным, сервер отвергает. */
function withBrokenSignature(token: string): string {
    const [header, payload, signature] = token.split('.');
    return `${header}.${payload}.${'x'.repeat(signature.length)}`;
}

describeAuthServiceContract(() => createService().auth);

describe('PocketBaseAuthService против тестового PocketBase', () => {
    it('register сохраняет пользователя в users', async () => {
        const { auth } = createService();
        const email = `user-${crypto.randomUUID()}@test.local`;

        const user = await auth.register({ email, password: crypto.randomUUID(), name: 'Иван' });

        const record = await (
            await asSuperuser()
        )
            .collection('users')
            .getFirstListItem(`email = "${email}"`);
        expect(record.id).toBe(user.id);
        expect(record['name']).toBe('Иван');
    });

    it('login пользователя, созданного в PocketBase, отдаёт id, email и имя', async () => {
        const created = await createUser({ name: 'Иван' });
        const { auth } = createService();

        await auth.login(created.email, created.password);

        expect(auth.user()).toEqual({ id: created.id, email: created.email, name: 'Иван' });
    });

    it('restore с валидным токеном обновляет токен и данные пользователя', async () => {
        const created = await createUser({ name: 'Иван' });
        const { token, record } = await sessionOf(created);
        const { auth, pb } = createService();
        pb.authStore.save(token, record);
        await (await asSuperuser()).collection('users').update(created.id, { name: 'Пётр' });
        // JWT выпущенный в ту же секунду совпадает с прежним: ждём смены секунды в exp.
        await new Promise((resolve) => setTimeout(resolve, 1100));

        await auth.restore();

        expect(auth.user()).toEqual({ id: created.id, email: created.email, name: 'Пётр' });
        expect(auth.isAuthenticated()).toBe(true);
        expect(pb.authStore.token).not.toBe('');
        expect(pb.authStore.token).not.toBe(token);
    });

    it('restore с испорченным токеном завершает сессию', async () => {
        const { token, record } = await sessionOf(await createUser());
        const { auth, pb } = createService();
        pb.authStore.save(withBrokenSignature(token), record);
        expect(auth.user()).not.toBeNull();

        await auth.restore();

        expect(auth.user()).toBeNull();
        expect(auth.isAuthenticated()).toBe(false);
        expect(pb.authStore.token).toBe('');
    });

    it('restore без токена ничего не делает', async () => {
        const { auth } = createService();

        await expect(auth.restore()).resolves.toBeUndefined();

        expect(auth.user()).toBeNull();
    });

    it('user() следует за любым изменением auth store', async () => {
        const created = await createUser();
        const { auth, pb } = createService();
        await auth.login(created.email, created.password);

        pb.authStore.clear();

        expect(auth.user()).toBeNull();
        expect(auth.isAuthenticated()).toBe(false);
    });

    it('сессии двух пользователей в разных инжекторах независимы', async () => {
        const [userA, userB] = await Promise.all([createUser(), createUser()]);
        const a = createService().auth;
        const b = createService().auth;

        await Promise.all([
            a.login(userA.email, userA.password),
            b.login(userB.email, userB.password),
        ]);

        expect(a.user()?.id).toBe(userA.id);
        expect(b.user()?.id).toBe(userB.id);

        a.logout();

        expect(a.user()).toBeNull();
        expect(b.user()?.id).toBe(userB.id);
    });

    describe('PocketBase недоступен', () => {
        const unreachableUrl = 'http://127.0.0.1:1';

        it('login → NetworkError', async () => {
            const { auth } = createService(unreachableUrl);

            await expect(auth.login('user@test.local', 'password-1')).rejects.toBeInstanceOf(
                NetworkError,
            );
            expect(auth.user()).toBeNull();
        });

        it('restore сохраняет сессию', async () => {
            const created = await createUser();
            const { token, record } = await sessionOf(created);
            const { auth, pb } = createService(unreachableUrl);
            pb.authStore.save(token, record);

            await expect(auth.restore()).resolves.toBeUndefined();

            expect(auth.user()?.id).toBe(created.id);
            expect(pb.authStore.token).toBe(token);
        });
    });
});
