import {
    DOCUMENT,
    EnvironmentProviders,
    InjectionToken,
    inject,
    makeEnvironmentProviders,
} from '@angular/core';
import PocketBase, { BaseAuthStore } from 'pocketbase';
import { PB_PUBLIC_PATH, PB_URL } from './pb-url';

/** Клиент PocketBase: свой экземпляр на каждый инжектор приложения (на сервере — на каждый запрос). */
export const POCKETBASE = new InjectionToken<PocketBase>('POCKETBASE');

/** Регистрирует `PB_URL` (браузерный) и `POCKETBASE`; вызывается в `app.config.ts`. Только для инжектора приложения, не для `providers` компонента. */
export function providePocketBase(): EnvironmentProviders {
    return makeEnvironmentProviders([
        {
            provide: PB_URL,
            useFactory: () => inject(DOCUMENT).location.origin + PB_PUBLIC_PATH,
        },
        {
            provide: POCKETBASE,
            useFactory: () =>
                new PocketBase(inject(PB_URL), new BaseAuthStore()).autoCancellation(false),
        },
    ]);
}
