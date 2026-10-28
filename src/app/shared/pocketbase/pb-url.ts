import { InjectionToken, Provider } from '@angular/core';

/** Путь, по которому браузер обращается к PocketBase на своём origin (nginx / прокси dev-сервера). */
export const PB_PUBLIC_PATH = '/pb';

/** Базовый адрес PocketBase: в браузере `<origin>/pb`, на сервере — `process.env.PB_URL`. */
export const PB_URL = new InjectionToken<string>('PB_URL');

/** Серверный провайдер `PB_URL` (регистрируется в `app.config.server.ts`). */
export function providePbUrlForServer(): Provider {
    return {
        provide: PB_URL,
        useFactory: () => process.env['PB_URL'] || 'http://127.0.0.1:8090',
    };
}
