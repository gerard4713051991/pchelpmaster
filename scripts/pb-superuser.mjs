// Creates the PocketBase superuser or resets its password (idempotent).
import { execFileSync } from 'node:child_process';

const { PB_SUPERUSER_EMAIL: email, PB_SUPERUSER_PASSWORD: password } = process.env;
const dir = process.env.PB_DIR || 'pocketbase/pb_data';

if (!email || !password) {
  console.error('PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD must be set (see .env.example)');
  process.exit(1);
}

execFileSync('pocketbase', ['superuser', 'upsert', email, password, '--dir', dir], { stdio: 'inherit' });
