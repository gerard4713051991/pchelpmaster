// @ts-check
// Повторяет `location /pb/` из docs/architecture.md (раздел 7): только пути с префиксом `/pb/`, префикс срезается.
// Формат — `server.proxy` dev-сервера Vite (@angular/build).
/** @type {Record<string, { target: string; changeOrigin?: boolean; rewrite?: (path: string) => string }>} */
export default {
    '/pb/': {
        target: process.env['PB_URL'] || 'http://127.0.0.1:8090',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pb/, ''),
    },
};
