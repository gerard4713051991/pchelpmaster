// Типы значений, которые global-setup отдаёт тестам через `project.provide` / `inject`.
import 'vitest';

declare module 'vitest' {
    export interface ProvidedContext {
        pbUrl: string;
        pbDataDir: string;
        pbSuperuser: { email: string; password: string };
    }
}
