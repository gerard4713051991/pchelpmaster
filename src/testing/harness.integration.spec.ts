// Временный дымовой тест стенда интеграционных тестов; удалить, когда появятся настоящие *.integration.spec.ts.
import { InjectionToken, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type PocketBase from 'pocketbase';
import { inject } from 'vitest';
import { asGuest, asSuperuser, asUser, createUser } from '../../tests/support/clients';

const PB = new InjectionToken<PocketBase>('PB');

describe('стенд интеграционных тестов', () => {
    it('URL тестового PocketBase доступен и GET /api/health отвечает 200', async () => {
        const response = await fetch(`${inject('pbUrl')}/api/health`);

        expect(response.status).toBe(200);
    });

    it('TestBed.inject() работает', () => {
        const GREETING = new InjectionToken<string>('GREETING');
        TestBed.configureTestingModule({ providers: [{ provide: GREETING, useValue: 'привет' }] });

        expect(TestBed.inject(Injector).get(GREETING)).toBe('привет');
    });

    it('createUser() создаёт пользователя на тестовом PocketBase', async () => {
        const user = await createUser();

        const record = await (await asSuperuser()).collection('users').getOne(user.id);

        expect(record['email']).toBe(user.email);
    });

    it('asUser(user) авторизован именно этим пользователем', async () => {
        const user = await createUser();

        const pb = await asUser(user);

        expect(pb.authStore.record?.id).toBe(user.id);
    });

    it('клиент PocketBase, полученный через DI, обращается к тестовому PocketBase', async () => {
        TestBed.configureTestingModule({ providers: [{ provide: PB, useFactory: asGuest }] });

        const health = await TestBed.inject(PB).health.check();

        expect(health.code).toBe(200);
    });
});
