// Держит тестовый PocketBase на порту из argv[2], пока процесс не получит сигнал; запускается как webServer Playwright.
// Выполняется под чистым Node, как fixtures/hold-pocketbase.ts.
import { startPocketBase } from './pocketbase-server.ts';

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Usage: node serve-test-pocketbase.ts <port>; got ${process.argv[2]}`);
}
const { url } = await startPocketBase({ port });
console.log(`Test PocketBase listening on ${url}`);
setInterval(() => undefined, 1 << 30);
