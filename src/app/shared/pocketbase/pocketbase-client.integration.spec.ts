import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type PocketBase from 'pocketbase';
import { inject } from 'vitest';
import { createUser, type TestUser } from '../../../../tests/support/clients';
import { PB_URL } from './pb-url';
import { POCKETBASE, providePocketBase } from './pocketbase-client';

// Клиент из отдельного инжектора приложения, как у отдельного SSR-запроса.
function pocketBaseFromDi(): PocketBase {
    return createEnvironmentInjector(
        [providePocketBase(), { provide: PB_URL, useValue: inject('pbUrl') }],
        TestBed.inject(EnvironmentInjector),
    ).get(POCKETBASE);
}

async function signedIn(user: TestUser): Promise<PocketBase> {
    const pb = pocketBaseFromDi();
    await pb.collection('users').authWithPassword(user.email, user.password);
    return pb;
}

describe('клиент PocketBase из DI против тестового PocketBase', () => {
    it('получает health со статусом 200', async () => {
        const health = await pocketBaseFromDi().health.check();

        expect(health.code).toBe(200);
    });

    it('не отменяет параллельные запросы одного типа', async () => {
        const pb = pocketBaseFromDi();

        const results = await Promise.all([pb.health.check(), pb.health.check()]);

        expect(results.map((r) => r.code)).toEqual([200, 200]);
    });

    it('клиенты двух пользователей и гостя не видят чужих записей', async () => {
        const [userA, userB] = await Promise.all([createUser(), createUser()]);
        const [pbA, pbB] = await Promise.all([signedIn(userA), signedIn(userB)]);
        const pbGuest = pocketBaseFromDi();

        expect(pbA.authStore.record?.id).toBe(userA.id);
        expect(pbB.authStore.record?.id).toBe(userB.id);
        expect(pbA.authStore.token).not.toBe(pbB.authStore.token);
        expect(pbGuest.authStore.isValid).toBe(false);

        await expect(pbA.collection('users').getOne(userA.id)).resolves.toMatchObject({
            id: userA.id,
        });
        await expect(pbB.collection('users').getOne(userB.id)).resolves.toMatchObject({
            id: userB.id,
        });
        await expect(pbA.collection('users').getOne(userB.id)).rejects.toMatchObject({
            status: 404,
        });
        await expect(pbB.collection('users').getOne(userA.id)).rejects.toMatchObject({
            status: 404,
        });
        await expect(pbGuest.collection('users').getOne(userA.id)).rejects.toMatchObject({
            status: 404,
        });
    });
});
