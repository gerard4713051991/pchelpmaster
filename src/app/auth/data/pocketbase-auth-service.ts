import { Service, computed } from '@angular/core';
import type { User } from '../../users';
import { AuthService } from '../domain/auth-service';

// Заглушка контракта для тестов; реализация — задача 2.2.
/* eslint-disable @typescript-eslint/no-unused-vars -- параметры заглушки понадобятся реализации */
// Регистрируется только через provideAuth() под токеном AuthService: авторегистрация дала бы второй экземпляр.
@Service({ autoProvided: false })
export class PocketBaseAuthService extends AuthService {
    readonly user = computed<User | null>(() => {
        throw new Error('Not implemented');
    });

    readonly isAuthenticated = computed<boolean>(() => {
        throw new Error('Not implemented');
    });

    login(_email: string, _password: string): Promise<User> {
        throw new Error('Not implemented');
    }

    register(_data: { email: string; password: string; name?: string }): Promise<User> {
        throw new Error('Not implemented');
    }

    logout(): void {
        throw new Error('Not implemented');
    }

    restore(): Promise<void> {
        throw new Error('Not implemented');
    }
}
