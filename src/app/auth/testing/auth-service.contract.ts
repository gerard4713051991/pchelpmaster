// Контракт AuthService: одни и те же кейсы для PocketBase-реализации и фейка в памяти.
// Явный импорт из vitest: файл не *.spec.ts и попадает в программу tsconfig.app.json без глобалов vitest.
import { describe, expect, it } from 'vitest';
import { InvalidCredentialsError, ValidationError } from '../../shared/errors/domain-errors';
import type { AuthService } from '../domain/auth-service';

function newCredentials(): { email: string; password: string } {
    return { email: `user-${crypto.randomUUID()}@test.local`, password: crypto.randomUUID() };
}

/** `setup` возвращает новый экземпляр сервиса без сессии. */
export function describeAuthServiceContract(setup: () => AuthService): void {
    describe('контракт AuthService', () => {
        it('до входа пользователя нет', () => {
            const auth = setup();

            expect(auth.user()).toBeNull();
            expect(auth.isAuthenticated()).toBe(false);
        });

        it('register создаёт пользователя и сразу входит', async () => {
            const auth = setup();
            const credentials = newCredentials();

            const user = await auth.register({ ...credentials, name: 'Иван' });

            expect(user).toEqual({
                id: expect.any(String),
                email: credentials.email,
                name: 'Иван',
            });
            expect(auth.user()).toEqual(user);
            expect(auth.isAuthenticated()).toBe(true);
        });

        it('register без имени — пустое имя', async () => {
            const auth = setup();

            const user = await auth.register(newCredentials());

            expect(user.name).toBe('');
        });

        it('register с занятым email → ValidationError с ошибкой в поле email', async () => {
            const auth = setup();
            const credentials = newCredentials();
            await auth.register(credentials);
            auth.logout();

            const error = await auth
                .register({ email: credentials.email, password: crypto.randomUUID() })
                .catch((e: unknown) => e);

            expect(error).toBeInstanceOf(ValidationError);
            expect((error as ValidationError).fieldErrors).toHaveProperty('email');
        });

        it('login с верным паролем входит и отдаёт id, email и имя', async () => {
            const auth = setup();
            const credentials = newCredentials();
            const registered = await auth.register({ ...credentials, name: 'Иван' });
            auth.logout();

            const user = await auth.login(credentials.email, credentials.password);

            expect(user).toEqual(registered);
            expect(auth.user()).toEqual({
                id: registered.id,
                email: credentials.email,
                name: 'Иван',
            });
            expect(auth.isAuthenticated()).toBe(true);
        });

        it('login с неверным паролем → InvalidCredentialsError, пользователя нет', async () => {
            const auth = setup();
            const credentials = newCredentials();
            await auth.register(credentials);
            auth.logout();

            await expect(auth.login(credentials.email, 'wrong-password')).rejects.toBeInstanceOf(
                InvalidCredentialsError,
            );
            expect(auth.user()).toBeNull();
            expect(auth.isAuthenticated()).toBe(false);
        });

        it('login с несуществующим email → InvalidCredentialsError', async () => {
            const auth = setup();
            const { email, password } = newCredentials();

            await expect(auth.login(email, password)).rejects.toBeInstanceOf(
                InvalidCredentialsError,
            );
        });

        it('logout завершает сессию', async () => {
            const auth = setup();
            await auth.register(newCredentials());

            auth.logout();

            expect(auth.user()).toBeNull();
            expect(auth.isAuthenticated()).toBe(false);
        });
    });
}
