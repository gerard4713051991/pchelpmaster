// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default defineConfig([
    { ignores: ['dist', '.angular', 'pocketbase'] },
    {
        files: ['**/*.ts'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended,
            tseslint.configs.stylistic,
            angular.configs.tsRecommended,
        ],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                { type: 'attribute', prefix: 'ksk', style: 'camelCase' },
            ],
            '@angular-eslint/component-selector': [
                'error',
                { type: 'element', prefix: 'ksk', style: 'kebab-case' },
            ],
        },
    },
    {
        files: ['**/*.ts'],
        ignores: ['src/app/shared/pocketbase/pocketbase-client.ts', 'tests/**'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: "NewExpression[callee.name='PocketBase']",
                    message:
                        'Клиент PocketBase создаёт только фабрика в shared/pocketbase/pocketbase-client.ts; получайте его через DI (POCKETBASE).',
                },
            ],
            // Импорт под другим именем или через subpath (`import PB from 'pocketbase/cjs'`) обходит селектор выше; `import type` остаётся можно.
            '@typescript-eslint/no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['pocketbase', 'pocketbase/*'],
                            importNames: ['default'],
                            allowTypeImports: true,
                            message:
                                'Класс PocketBase импортирует только фабрика в shared/pocketbase/pocketbase-client.ts; получайте клиент через DI (POCKETBASE).',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['**/domain/**/*.ts', '**/ui/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['pocketbase', 'pocketbase/*'],
                            message: 'pocketbase можно импортировать только в data/ и shared/.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['**/*.html'],
        extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    },
]);
