import type { TestProject } from 'vitest/node';
import { startPocketBase } from './pocketbase-server';

export default async function setup(project: TestProject) {
    const { url, dataDir, superuser, stop } = await startPocketBase();
    project.provide('pbUrl', url);
    project.provide('pbDataDir', dataDir);
    project.provide('pbSuperuser', superuser);
    return stop;
}
