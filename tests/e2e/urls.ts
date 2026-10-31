// Адреса стенда e2e: порты не пересекаются с `pnpm pb:serve` (8090) и `pnpm start` (4200).
export const E2E_PB_PORT = 8190;
export const E2E_PB_URL = `http://127.0.0.1:${E2E_PB_PORT}`;
export const E2E_APP_URL = 'http://localhost:4300';
