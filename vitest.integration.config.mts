import { defineConfig } from 'vitest/config';

// Дополняет конфигурацию builder'а @angular/build:unit-test (цель test-integration в angular.json).
// Список файлов задаётся в angular.json: include из этого файла builder игнорирует.
export default defineConfig({
    test: {
        globalSetup: ['tests/support/global-setup.ts'],
        testTimeout: 20_000,
        hookTimeout: 20_000,
    },
});
