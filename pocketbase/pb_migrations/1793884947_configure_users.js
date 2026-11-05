/// <reference path="../pb_data/types.d.ts" />

function configureUsers(app, { deleteRule, nameMax, emailColumn }) {
    const users = app.findCollectionByNameOrId('users');

    users.listRule = 'id = @request.auth.id';
    users.viewRule = 'id = @request.auth.id';
    users.createRule = '';
    users.updateRule = 'id = @request.auth.id';
    users.deleteRule = deleteRule;

    // Встроенный индекс PocketBase учитывает регистр: без замены A@x.ru и a@x.ru — разные аккаунты.
    users.addIndex('idx_email__pb_users_auth_', true, emailColumn, "`email` != ''");

    users.fields.getByName('password').min = 8;
    users.fields.getByName('name').max = nameMax;

    users.passwordAuth.enabled = true;
    users.passwordAuth.identityFields = ['email'];
    users.oauth2.enabled = false;
    users.otp.enabled = false;
    users.mfa.enabled = false;

    app.save(users);
}

migrate(
    (app) =>
        configureUsers(app, {
            deleteRule: null,
            nameMax: 100,
            emailColumn: '`email` COLLATE NOCASE',
        }),
    (app) =>
        configureUsers(app, {
            deleteRule: 'id = @request.auth.id',
            nameMax: 255,
            emailColumn: '`email`',
        }),
);
