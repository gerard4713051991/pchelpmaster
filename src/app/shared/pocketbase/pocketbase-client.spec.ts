import { DOCUMENT, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LocalAuthStore } from 'pocketbase';
import { PB_PUBLIC_PATH, PB_URL, providePbUrlForServer } from './pb-url';
import { POCKETBASE, providePocketBase } from './pocketbase-client';

function createAppInjector(): EnvironmentInjector {
    return createEnvironmentInjector(
        [providePocketBase(), { provide: PB_URL, useValue: 'http://pb.test:1234' }],
        TestBed.inject(EnvironmentInjector),
    );
}

describe('клиент PocketBase в DI', () => {
    it('в одном инжекторе отдаёт один и тот же экземпляр', () => {
        TestBed.configureTestingModule({ providers: [providePocketBase()] });

        expect(TestBed.inject(POCKETBASE)).toBe(TestBed.inject(POCKETBASE));
    });

    it('в двух инжекторах отдаёт разные экземпляры с независимым authStore', () => {
        const a = createAppInjector().get(POCKETBASE);
        const b = createAppInjector().get(POCKETBASE);

        a.authStore.save('token-a', null);

        expect(a).not.toBe(b);
        expect(b.authStore.token).toBe('');
        expect(b.authStore.isValid).toBe(false);
    });

    it('берёт baseURL из PB_URL', () => {
        TestBed.configureTestingModule({
            providers: [providePocketBase(), { provide: PB_URL, useValue: 'http://pb.test:1234' }],
        });

        expect(TestBed.inject(POCKETBASE).baseURL).toBe('http://pb.test:1234');
    });

    it('хранит авторизацию в памяти, а не в localStorage', () => {
        TestBed.configureTestingModule({ providers: [providePocketBase()] });
        const pb = TestBed.inject(POCKETBASE);
        const keysBefore = Object.keys(localStorage);

        pb.authStore.save('token', null);

        expect(pb.authStore).not.toBeInstanceOf(LocalAuthStore);
        expect(Object.keys(localStorage)).toEqual(keysBefore);
    });
});

describe('PB_URL', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('PB_PUBLIC_PATH равен /pb', () => {
        expect(PB_PUBLIC_PATH).toBe('/pb');
    });

    it('в браузере — <origin>/pb', () => {
        TestBed.configureTestingModule({ providers: [providePocketBase()] });

        expect(TestBed.inject(PB_URL)).toBe(`${TestBed.inject(DOCUMENT).location.origin}/pb`);
    });

    it('на сервере — значение переменной окружения PB_URL', () => {
        vi.stubEnv('PB_URL', 'http://pb.internal:9000');
        TestBed.configureTestingModule({ providers: [providePbUrlForServer()] });

        expect(TestBed.inject(PB_URL)).toBe('http://pb.internal:9000');
    });

    it('на сервере без PB_URL — http://127.0.0.1:8090', () => {
        vi.stubEnv('PB_URL', undefined);
        TestBed.configureTestingModule({ providers: [providePbUrlForServer()] });

        expect(TestBed.inject(PB_URL)).toBe('http://127.0.0.1:8090');
    });

    it('на сервере с пустым PB_URL — http://127.0.0.1:8090', () => {
        vi.stubEnv('PB_URL', '');
        TestBed.configureTestingModule({ providers: [providePbUrlForServer()] });

        expect(TestBed.inject(PB_URL)).toBe('http://127.0.0.1:8090');
    });
});
