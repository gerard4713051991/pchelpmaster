import type { TestProject } from 'vitest/node';
import { startPocketBase } from '../support/pocketbase-server';
import '../support/clients';

export default async function setup(project: TestProject) {
    const { url, dataDir, superuser, stop } = await startPocketBase();
    project.provide('pbUrl', url);
    project.provide('pbDataDir', dataDir);
    project.provide('pbSuperuser', superuser);
    return stop;
}
