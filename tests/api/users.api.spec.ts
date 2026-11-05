import { describe, expect, it } from 'vitest';
import { asGuest, asSuperuser, asUser, createUser } from '../support/clients';

const newEmail = () => `user-${crypto.randomUUID()}@test.local`;

function register(overrides: Record<string, unknown> = {}) {
    const data = { email: newEmail(), password: crypto.randomUUID(), ...overrides };
    return asGuest()
        .collection('users')
        .create({ ...data, passwordConfirm: data.password });
}

const invalidField = (field: string) => ({
    status: 400,
    response: { data: { [field]: expect.anything() } },
});

describe('users: регистрация', () => {
    it('регистрирует гостя с валидными данными, неподтверждённым и с именем', async () => {
        const record = await register({ name: 'Иван' });

        expect(record['verified']).toBe(false);
        expect(record['name']).toBe('Иван');
    });

    it('регистрирует гостя без имени', async () => {
        await expect(register()).resolves.toMatchObject({ verified: false });
    });

    it('принимает пароль из 8 символов и имя из 100 символов', async () => {
        const name = 'я'.repeat(100);

        const record = await register({ password: 'a1b2c3d4', name });

        expect(record['name']).toBe(name);
    });

    it('не даёт гостю зарегистрироваться подтверждённым', async () => {
        const email = newEmail();

        // Поведение 6 допускает оба исхода: поле проигнорировано или запрос отклонён.
        await register({ email, verified: true }).catch((error: unknown) => {
            expect(error).toMatchObject({ status: 400 });
        });

        const su = await asSuperuser();
        const { items } = await su
            .collection('users')
            .getList(1, 1, { filter: su.filter('email = {:email}', { email }) });
        expect(items.map((record) => record['verified'])).not.toContain(true);
    });

    it('отклоняет повторный email с ошибкой в поле email', async () => {
        const email = newEmail();
        await register({ email });

        await expect(register({ email })).rejects.toMatchObject(invalidField('email'));
    });

    it('отклоняет тот же email в другом регистре с ошибкой в поле email', async () => {
        const email = newEmail();
        await register({ email });

        await expect(register({ email: email.toUpperCase() })).rejects.toMatchObject(
            invalidField('email'),
        );
    });

    it('отклоняет пароль из 7 символов с ошибкой в поле password', async () => {
        await expect(register({ password: 'a1b2c3d' })).rejects.toMatchObject(
            invalidField('password'),
        );
    });

    it('отклоняет невалидный email с ошибкой в поле email', async () => {
        await expect(register({ email: 'not-an-email' })).rejects.toMatchObject(
            invalidField('email'),
        );
    });

    it.each([
        'иван@test.local',
        'user@домен.рф',
        'user@test.рф',
        'a@b.c',
        'a@b',
        '@test.local',
        'user@.local',
    ])('отклоняет email %s с ошибкой в поле email', async (email) => {
        await expect(register({ email })).rejects.toMatchObject(invalidField('email'));
    });

    it.each(['a@b.cd', 'first.last+tag@sub.example.com'])('принимает email %s', async (email) => {
        await expect(register({ email })).resolves.toMatchObject({ id: expect.any(String) });
    });

    it('не даёт сменить email на не-ASCII даже суперпользователю', async () => {
        const a = await createUser();
        const su = await asSuperuser();

        await expect(
            su
                .collection('users')
                .update(a.id, { email: `иван-${crypto.randomUUID()}@test.local` }),
        ).rejects.toMatchObject(invalidField('email'));

        const record = await su.collection('users').getOne(a.id);
        expect(record['email']).toBe(a.email);
    });

    it('отклоняет имя из 101 символа с ошибкой в поле name', async () => {
        await expect(register({ name: 'я'.repeat(101) })).rejects.toMatchObject(
            invalidField('name'),
        );
    });
});

describe('users: вход', () => {
    it('с верным паролем возвращает токен и запись пользователя', async () => {
        const user = await createUser();

        const auth = await asGuest()
            .collection('users')
            .authWithPassword(user.email, user.password);

        expect(auth.token).not.toBe('');
        expect(auth.record.id).toBe(user.id);
    });

    it('с неверным паролем отвечает 400', async () => {
        const user = await createUser();

        await expect(
            asGuest().collection('users').authWithPassword(user.email, 'wrong-password'),
        ).rejects.toMatchObject({ status: 400 });
    });

    it('из способов входа включён только пароль по email', async () => {
        const methods = await asGuest().collection('users').listAuthMethods();

        expect(methods.password.enabled).toBe(true);
        expect(methods.password.identityFields).toEqual(['email']);
        expect(methods.oauth2.enabled).toBe(false);
        expect(methods.otp.enabled).toBe(false);
        expect(methods.mfa.enabled).toBe(false);
    });
});

describe('users: доступ', () => {
    it('показывает пользователю в list только его самого', async () => {
        const a = await createUser();
        await createUser();

        const { items, totalItems } = await (await asUser(a)).collection('users').getList();

        expect(items.map((record) => record.id)).toEqual([a.id]);
        expect(totalItems).toBe(1);
    });

    it('отдаёт пользователю свою запись и не отдаёт чужую', async () => {
        const a = await createUser();
        const b = await createUser();
        const pb = await asUser(a);

        await expect(pb.collection('users').getOne(a.id)).resolves.toMatchObject({ id: a.id });
        await expect(pb.collection('users').getOne(b.id)).rejects.toMatchObject({ status: 404 });
    });

    it('не показывает пользователей гостю', async () => {
        const a = await createUser();
        const guest = asGuest();

        const { items, totalItems } = await guest.collection('users').getList();

        expect(items).toEqual([]);
        expect(totalItems).toBe(0);
        await expect(guest.collection('users').getOne(a.id)).rejects.toMatchObject({
            status: 404,
        });
    });

    it('не даёт гостю изменить и удалить пользователя', async () => {
        const a = await createUser({ name: 'А' });
        const guest = asGuest();

        await expect(
            guest.collection('users').update(a.id, { name: 'Взлом' }),
        ).rejects.toMatchObject({ status: 404 });
        await expect(guest.collection('users').delete(a.id)).rejects.toMatchObject({ status: 403 });

        const record = await (await asSuperuser()).collection('users').getOne(a.id);
        expect(record['name']).toBe('А');
    });

    it('не находит чужую запись через filter по email', async () => {
        const a = await createUser();
        const b = await createUser();

        for (const pb of [await asUser(a), asGuest()]) {
            const { items, totalItems } = await pb
                .collection('users')
                .getList(1, 50, { filter: pb.filter('email = {:email}', { email: b.email }) });

            expect(items).toEqual([]);
            expect(totalItems).toBe(0);
        }
    });

    it('даёт изменить своё имя и не даёт изменить чужое', async () => {
        const a = await createUser({ name: 'А' });
        const b = await createUser({ name: 'Б' });
        const pb = await asUser(a);

        await expect(pb.collection('users').update(a.id, { name: 'Новое' })).resolves.toMatchObject(
            { name: 'Новое' },
        );
        await expect(pb.collection('users').update(b.id, { name: 'Взлом' })).rejects.toMatchObject({
            status: 404,
        });

        const recordB = await (await asSuperuser()).collection('users').getOne(b.id);
        expect(recordB['name']).toBe('Б');
    });

    it('не даёт пользователю подтвердить себя через update', async () => {
        const a = await createUser();
        const pb = await asUser(a);

        // Важен итог, а не ответ: поле может быть проигнорировано или запрос отклонён.
        await pb
            .collection('users')
            .update(a.id, { verified: true })
            .catch(() => undefined);

        const record = await (await asSuperuser()).collection('users').getOne(a.id);
        expect(record['verified']).toBe(false);
    });

    it('не даёт пользователю удалить ни свою, ни чужую запись', async () => {
        const a = await createUser();
        const b = await createUser();
        const pb = await asUser(a);

        await expect(pb.collection('users').delete(a.id)).rejects.toMatchObject({ status: 403 });
        await expect(pb.collection('users').delete(b.id)).rejects.toMatchObject({ status: 403 });

        const su = await asSuperuser();
        await expect(su.collection('users').getOne(a.id)).resolves.toMatchObject({ id: a.id });
        await expect(su.collection('users').getOne(b.id)).resolves.toMatchObject({ id: b.id });
    });
});
