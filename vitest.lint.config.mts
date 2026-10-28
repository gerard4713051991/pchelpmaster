import { defineConfig } from 'vitest/config';

// Тесты конфига ESLint: запускаются первым шагом в pnpm test, test:api и test:integration.
export default defineConfig({
    test: {
        include: ['tests/lint/**/*.spec.ts'],
    },
});
