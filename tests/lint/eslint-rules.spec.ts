// Проверяет, что конфиг ESLint действительно держит границы, от которых зависит изоляция данных при SSR:
// конфиг ломается молча (опечатка в glob, слишком широкое исключение), а `pnpm lint` при этом остаётся зелёным.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));
const eslint = new ESLint({ cwd: root });

async function ruleIds(code: string, file: string): Promise<string[]> {
    const [result] = await eslint.lintText(code, { filePath: join(root, file) });
    return result.messages.map((m) => m.ruleId ?? '');
}

const newPocketBase = `import PocketBase from 'pocketbase';\nexport const pb = new PocketBase('http://x');\n`;
const typeImport = `import type { RecordModel } from 'pocketbase';\nexport type R = RecordModel;\n`;
const valueImport = `import PocketBase from 'pocketbase';\nexport const P = PocketBase;\n`;

const aliasedImport = `import PB from 'pocketbase';\nexport const pb = new PB('http://x');\n`;
const subpathImport = `import PocketBase from 'pocketbase/cjs';\nexport const P = PocketBase;\n`;
const defaultTypeImport = `import type PocketBase from 'pocketbase';\nexport type P = PocketBase;\n`;
const aliasedSubpathImport = `import PB from 'pocketbase/cjs';\nexport const pb = new PB('http://x');\n`;

describe('ESLint: new PocketBase(', () => {
    it('запрещён и под другим именем импорта (import PB from)', async () => {
        expect(await ruleIds(aliasedImport, 'src/app/clients/data/x.ts')).toContain(
            '@typescript-eslint/no-restricted-imports',
        );
    });

    it('запрещён и через subpath (import PB from pocketbase/cjs)', async () => {
        expect(await ruleIds(aliasedSubpathImport, 'src/app/clients/data/x.ts')).toContain(
            '@typescript-eslint/no-restricted-imports',
        );
    });

    it('import type PocketBase разрешён вне фабрики', async () => {
        expect(await ruleIds(defaultTypeImport, 'src/app/clients/data/x.ts')).not.toContain(
            '@typescript-eslint/no-restricted-imports',
        );
    });

    it('запрещён вне фабрики', async () => {
        expect(await ruleIds(newPocketBase, 'src/app/clients/data/x.ts')).toContain(
            'no-restricted-syntax',
        );
    });

    it('разрешён в фабрике shared/pocketbase/pocketbase-client.ts', async () => {
        expect(
            await ruleIds(newPocketBase, 'src/app/shared/pocketbase/pocketbase-client.ts'),
        ).not.toContain('no-restricted-syntax');
    });

    it('разрешён в тестовых хелперах tests/', async () => {
        expect(await ruleIds(newPocketBase, 'tests/support/x.ts')).not.toContain(
            'no-restricted-syntax',
        );
    });
});

describe('ESLint: импорт pocketbase', () => {
    it('запрещён в domain/', async () => {
        expect(await ruleIds(valueImport, 'src/app/clients/domain/x.ts')).toContain(
            'no-restricted-imports',
        );
    });

    it('запрещён в ui/, в том числе import type', async () => {
        expect(await ruleIds(typeImport, 'src/app/clients/ui/x/x.ts')).toContain(
            'no-restricted-imports',
        );
    });

    it('запрещён в ui/ и через subpath (pocketbase/cjs)', async () => {
        expect(await ruleIds(subpathImport, 'src/app/clients/ui/x/x.ts')).toContain(
            'no-restricted-imports',
        );
    });

    it('разрешён в data/', async () => {
        expect(await ruleIds(valueImport, 'src/app/clients/data/x.ts')).not.toContain(
            'no-restricted-imports',
        );
    });
});
