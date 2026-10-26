import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/api/**/*.api.spec.ts'],
        globalSetup: ['tests/support/global-setup.ts'],
        // Headroom for starting a temporary PocketBase inside a test.
        testTimeout: 20_000,
        hookTimeout: 20_000,
    },
});
