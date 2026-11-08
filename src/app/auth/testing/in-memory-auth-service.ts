import { computed } from '@angular/core';
import type { User } from '../../users';
import { AuthService } from '../domain/auth-service';

// Заглушка контракта для тестов; реализация — задача 2.2.
/* eslint-disable @typescript-eslint/no-unused-vars -- параметры заглушки понадобятся реализации */
/** Фейк `AuthService` в памяти для тестов других слоёв и фич. */
export class InMemoryAuthService extends AuthService {
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

    /** Сразу делает пользователя вошедшим, без регистрации. */
    signInAs(_user: User): void {
        throw new Error('Not implemented');
    }

    /** Следующий вызов `login`, `register` или `restore` отклоняется этой ошибкой. */
    failNextWith(_error: Error): void {
        throw new Error('Not implemented');
    }
}
