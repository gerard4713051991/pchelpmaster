import { NetworkError } from '../../shared/errors/domain-errors';
import { describeAuthServiceContract } from './auth-service.contract';
import { InMemoryAuthService } from './in-memory-auth-service';

describeAuthServiceContract(() => new InMemoryAuthService());

describe('InMemoryAuthService', () => {
    it('signInAs делает пользователя вошедшим', () => {
        const auth = new InMemoryAuthService();
        const user = { id: 'u1', email: 'user@test.local', name: 'Иван' };

        auth.signInAs(user);

        expect(auth.user()).toEqual(user);
        expect(auth.isAuthenticated()).toBe(true);
    });

    it('failNextWith отклоняет только следующий вызов', async () => {
        const auth = new InMemoryAuthService();
        const credentials = { email: 'user@test.local', password: 'password-1' };
        await auth.register(credentials);
        auth.logout();
        const error = new NetworkError();

        auth.failNextWith(error);

        await expect(auth.login(credentials.email, credentials.password)).rejects.toBe(error);
        expect(auth.user()).toBeNull();
        await expect(auth.login(credentials.email, credentials.password)).resolves.toMatchObject({
            email: credentials.email,
        });
    });
});
