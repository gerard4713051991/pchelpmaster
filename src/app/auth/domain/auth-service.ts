import type { Signal } from '@angular/core';
import type { User } from '../../users';

/** Сессия пользователя: вход, регистрация, выход, текущий пользователь. */
export abstract class AuthService {
    abstract readonly user: Signal<User | null>;
    abstract readonly isAuthenticated: Signal<boolean>;
    abstract login(email: string, password: string): Promise<User>;
    abstract register(data: { email: string; password: string; name?: string }): Promise<User>;
    abstract logout(): void;
    abstract restore(): Promise<void>;
}
