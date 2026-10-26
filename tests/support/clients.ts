// PocketBase SDK clients for tests; each helper returns its own instance with an in-memory auth store.
// Используется и из src/**/*.integration.spec.ts (tsconfig.spec.json), где нет типов Node: поэтому глобальный crypto вместо node:crypto.
import PocketBase, { BaseAuthStore } from 'pocketbase';
import { inject } from 'vitest';

export interface TestUser {
    id: string;
    email: string;
    password: string;
}

export function asGuest(): PocketBase {
    return new PocketBase(inject('pbUrl'), new BaseAuthStore());
}

export async function asSuperuser(): Promise<PocketBase> {
    const { email, password } = inject('pbSuperuser');
    const pb = asGuest();
    await pb.collection('_superusers').authWithPassword(email, password);
    return pb;
}

export async function createUser(overrides: Record<string, unknown> = {}): Promise<TestUser> {
    const data = {
        email: `user-${crypto.randomUUID()}@test.local`,
        password: crypto.randomUUID(),
        ...overrides,
    };
    const record = await (
        await asSuperuser()
    )
        .collection('users')
        .create({ ...data, passwordConfirm: data.password });
    return { id: record.id, email: String(data.email), password: String(data.password) };
}

export async function asUser(user: TestUser): Promise<PocketBase> {
    const pb = asGuest();
    await pb.collection('users').authWithPassword(user.email, user.password);
    return pb;
}
