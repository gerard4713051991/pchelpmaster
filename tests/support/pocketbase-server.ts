// Запускает временный PocketBase с миграциями и хуками проекта (см. docs/testing.md).
// Выполняется под чистым Node (tests/support/fixtures/hold-pocketbase.ts): только импорты node:* и стираемый TypeScript.
import { type ChildProcess, execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { rmSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { type AddressInfo, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const START_TIMEOUT_MS = 10_000;
const STOP_TIMEOUT_MS = 5_000;
const SIGNALS = ['SIGINT', 'SIGTERM'] as const;

/** Запущенный временный экземпляр PocketBase. */
export interface PocketBaseServer {
    url: string;
    dataDir: string;
    superuser: { email: string; password: string };
    /** Останавливает процесс и удаляет `dataDir`. Повторный вызов безопасен. */
    stop(): Promise<void>;
}

/**
 * Запускает одноразовый PocketBase на свободном порту (или на `port`, если он задан) и ждёт, пока он ответит на `/api/health`.
 *
 * Процесс и каталог данных удаляются при `stop()`, по `SIGINT`/`SIGTERM`, при выходе
 * и при ошибке запуска.
 *
 * @throws Если `pocketbase` нет в PATH, не создался суперпользователь или сервер не ответил
 * за {@link START_TIMEOUT_MS}. В сообщение ошибки включён вывод PocketBase.
 */
export async function startPocketBase({ port }: { port?: number } = {}): Promise<PocketBaseServer> {
    const superuser = { email: `superuser-${randomUUID()}@test.local`, password: randomUUID() };
    const dataDir = await mkdtemp(join(tmpdir(), 'pchelpcrm-pb-'));
    let child: ChildProcess | undefined;
    let stopping: Promise<void> | undefined;

    const onSignal = (signal: NodeJS.Signals) => {
        void stop().then(() => process.kill(process.pid, signal));
    };
    // Обработчик `exit` не может ждать, поэтому здесь только синхронные вызовы.
    const onExit = () => {
        child?.kill('SIGKILL');
        rmSync(dataDir, { recursive: true, force: true });
    };
    const stopProcess = async () => {
        if (child?.pid !== undefined && child.exitCode === null && child.signalCode === null) {
            const exited = once(child, 'exit');
            child.kill('SIGTERM');
            const timer = setTimeout(() => child?.kill('SIGKILL'), STOP_TIMEOUT_MS);
            await exited;
            clearTimeout(timer);
        }
        await rm(dataDir, { recursive: true, force: true });
        // Снимаются последними: сигнал во время очистки не должен убить владельца раньше её конца.
        for (const signal of SIGNALS) process.off(signal, onSignal);
        process.off('exit', onExit);
    };
    // Очистка выполняется один раз: повторные вызовы получают тот же промис.
    const stop = () => (stopping ??= stopProcess());

    for (const signal of SIGNALS) process.on(signal, onSignal);
    process.on('exit', onExit);

    try {
        await promisify(execFile)('pocketbase', [
            'superuser',
            'upsert',
            superuser.email,
            superuser.password,
            '--dir',
            dataDir,
        ]).catch((error: NodeJS.ErrnoException & { stdout?: string; stderr?: string }) => {
            if (error.code === 'ENOENT') throw binaryNotFound(error);
            throw new Error(`pocketbase superuser upsert failed:\n${error.stdout}${error.stderr}`);
        });

        const url = `http://127.0.0.1:${port ?? (await freePort())}`;
        let output = '';
        let spawnError: Error | undefined;
        const proc = spawn('pocketbase', [
            'serve',
            '--dir',
            dataDir,
            '--migrationsDir',
            'pocketbase/pb_migrations',
            '--hooksDir',
            'pocketbase/pb_hooks',
            '--http',
            url.slice('http://'.length),
            // Иначе изменения коллекций, сделанные тестами, попадут в pocketbase/pb_migrations.
            '--automigrate=false',
        ]);
        child = proc;
        proc.stdout.on('data', (chunk: Buffer) => (output += chunk));
        proc.stderr.on('data', (chunk: Buffer) => (output += chunk));
        proc.on('error', (error: NodeJS.ErrnoException) => {
            spawnError = error.code === 'ENOENT' ? binaryNotFound(error) : error;
        });

        for (const deadline = Date.now() + START_TIMEOUT_MS; ; await delay(100)) {
            if (spawnError) throw spawnError;
            if (proc.exitCode !== null || proc.signalCode !== null) {
                throw new Error(`PocketBase exited before becoming ready:\n${output}`);
            }
            if (await isHealthy(url)) return { url, dataDir, superuser, stop };
            if (Date.now() > deadline) {
                throw new Error(
                    `PocketBase did not answer /api/health within ${START_TIMEOUT_MS} ms:\n${output}`,
                );
            }
        }
    } catch (error) {
        await stop();
        throw error;
    }
}

function binaryNotFound(cause: Error): Error {
    return new Error('pocketbase binary not found in PATH: install PocketBase and add it to PATH', {
        cause,
    });
}

// shortcut: порт может быть занят между close() и запуском pocketbase serve; при нестабильности добавить повтор при ошибке привязки.
async function freePort(): Promise<number> {
    const server = createServer().listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    server.close();
    await once(server, 'close');
    return port;
}

async function isHealthy(url: string): Promise<boolean> {
    try {
        return (await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1_000) })).ok;
    } catch {
        return false;
    }
}
