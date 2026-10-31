// Смоук стенда e2e: приложение и тестовый PocketBase подняты, прокси /pb работает, axe и фикстуры работают.
import { expectNoA11yViolations } from './a11y';
import { expect, test } from './fixtures';

test.describe('главная', () => {
    test('главная отвечает статусом 200', async ({ page }) => {
        const response = await page.goto('/');

        expect(response?.status()).toBe(200);
    });

    test.describe('HTML от сервера', () => {
        // Без JS браузер показывает ровно ту разметку, что отдал SSR.
        test.use({ javaScriptEnabled: false });

        test('в HTML от сервера есть main и h1', async ({ page }) => {
            await page.goto('/');

            await expect(page.getByRole('main')).toBeVisible();
            await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        });
    });

    test('на отрисованной главной есть main и h1', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('main')).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('на главной нет нарушений доступности', async ({ page }) => {
        await page.goto('/');

        await expectNoA11yViolations(page);
    });
});

test.describe('прокси /pb', () => {
    test('/pb/api/health с origin приложения отдаёт health PocketBase', async ({ request }) => {
        const response = await request.get('/pb/api/health');

        expect(response.status()).toBe(200);
        // Без прокси ng serve ответил бы на неизвестный путь index.html со статусом 200.
        expect(await response.json()).toMatchObject({ code: 200 });
    });
});

test.describe('хелпер expectNoA11yViolations', () => {
    test('падает на нарушении WCAG и называет правило', async ({ page }) => {
        await page.setContent(
            '<!doctype html><html lang="ru"><head><title>Тест</title></head>' +
                '<body><main><h1>Тест</h1><img src="data:,"></main></body></html>',
        );

        await expect(expectNoA11yViolations(page)).rejects.toThrow(/image-alt/);
    });

    test('падает и на правилах best-practice', async ({ page }) => {
        // Нет main и h1: это правила best-practice, а не WCAG.
        await page.setContent(
            '<!doctype html><html lang="ru"><head><title>Тест</title></head>' +
                '<body><p>Текст</p></body></html>',
        );

        await expect(expectNoA11yViolations(page)).rejects.toThrow(/landmark-one-main/);
    });

    test('не падает на чистой странице', async ({ page }) => {
        await page.setContent(
            '<!doctype html><html lang="ru"><head><title>Тест</title></head>' +
                '<body><main><h1>Тест</h1><p>Текст</p></main></body></html>',
        );

        await expect(expectNoA11yViolations(page)).resolves.toBeUndefined();
    });
});

test.describe('фикстуры', () => {
    test('api действует от имени user', async ({ api, user }) => {
        expect(api.authStore.record?.id).toBe(user.id);
        await expect(api.collection('users').getOne(user.id)).resolves.toMatchObject({
            email: user.email,
        });
    });

    test('signedInPage: cookie pb_auth с Path=/, SameSite=Lax, без HttpOnly', async ({
        signedInPage,
    }) => {
        const cookies = await signedInPage.context().cookies();

        expect(cookies.find((c) => c.name === 'pb_auth')).toMatchObject({
            path: '/',
            sameSite: 'Lax',
            httpOnly: false,
        });
    });

    test('signedInPage: токен из cookie принимает auth-refresh через /pb', async ({
        signedInPage,
        user,
    }) => {
        await signedInPage.goto('/');

        // Выполняется в браузере: cookie читается из document.cookie, как её прочитает SDK.
        const result = await signedInPage.evaluate(async () => {
            const raw = document.cookie
                .split('; ')
                .find((c) => c.startsWith('pb_auth='))
                ?.slice('pb_auth='.length);
            const { token } = JSON.parse(decodeURIComponent(raw ?? '{}')) as { token?: string };
            const response = await fetch('/pb/api/collections/users/auth-refresh', {
                method: 'POST',
                headers: { Authorization: token ?? '' },
            });
            const body = (await response.json()) as { record?: { id?: string } };
            return { status: response.status, recordId: body.record?.id };
        });

        expect(result).toEqual({ status: 200, recordId: user.id });
    });

    test('обычная page остаётся гостевой рядом с signedInPage', async ({ page, signedInPage }) => {
        const signedInCookies = await signedInPage.context().cookies();
        const guestCookies = await page.context().cookies();

        expect(signedInCookies.map((c) => c.name)).toContain('pb_auth');
        expect(guestCookies.map((c) => c.name)).not.toContain('pb_auth');
    });
});
