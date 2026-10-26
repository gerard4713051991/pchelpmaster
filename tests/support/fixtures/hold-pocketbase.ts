// Starts PocketBase and holds it until the process gets a signal; used to test cleanup on Ctrl+C.
import { startPocketBase } from '../pocketbase-server.ts';

const { url, dataDir } = await startPocketBase();
console.log(JSON.stringify({ url, dataDir }));
setInterval(() => undefined, 1 << 30);
