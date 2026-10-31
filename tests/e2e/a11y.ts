import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** Запускает axe со всеми правилами (WCAG и best-practice) и падает со списком нарушений. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
    const { violations } = await new AxeBuilder({ page }).analyze();
    if (violations.length === 0) return;

    const list = violations
        .map((v) => `- ${v.id}: ${v.help} (элементов: ${v.nodes.length})`)
        .join('\n');
    throw new Error(`Нарушения доступности:\n${list}`);
}
