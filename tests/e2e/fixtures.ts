// Фикстуры e2e: пользователь и клиент API создаются через открытую регистрацию, без UI входа.
import { test as base, type Page } from '@playwright/test';
import PocketBase, { BaseAuthStore } from 'pocketbase';
import type { TestUser } from '../support/clients';
import { E2E_APP_URL, E2E_PB_URL } from './urls';

interface E2eFixtures {
    /** Новый пользователь, созданный через API тестового PocketBase. */
    user: TestUser;
    /** Страница в своём контексте браузера с cookie `pb_auth` пользователя `user`. */
    signedInPage: Page;
    /** SDK от имени `user` для подготовки данных. */
    api: PocketBase;
}

export const test = base.extend<E2eFixtures>({
    // Playwright требует деструктуризацию первым аргументом, даже пустую.
    // eslint-disable-next-line no-empty-pattern
    user: async ({}, use) => {
        const email = `user-${crypto.randomUUID()}@test.local`;
        const password = crypto.randomUUID();
        const pb = new PocketBase(E2E_PB_URL, new BaseAuthStore());
        const record = await pb
            .collection('users')
            .create({ email, password, passwordConfirm: password });
        await use({ id: record.id, email, password });
    },
    api: async ({ user }, use) => {
        const pb = new PocketBase(E2E_PB_URL, new BaseAuthStore());
        await pb.collection('users').authWithPassword(user.email, user.password);
        await use(pb);
    },
    // Свой контекст: встроенная `page` остаётся гостевой.
    signedInPage: async ({ browser, api }, use) => {
        const context = await browser.newContext({ baseURL: E2E_APP_URL });
        // Формат cookie тот же, что пишет приложение (exportToCookie); берём из неё только значение.
        const cookie = api.authStore.exportToCookie();
        const value = cookie.slice('pb_auth='.length, cookie.indexOf(';'));
        await context.addCookies([
            {
                name: 'pb_auth',
                value,
                url: E2E_APP_URL,
                sameSite: 'Lax',
                httpOnly: false,
            },
        ]);
        await use(await context.newPage());
        await context.close();
    },
});

export { expect } from '@playwright/test';
