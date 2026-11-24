import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { createApp } from './app.js';
import { initializeDatabase, openDatabase } from './config/database.js';
import { loadEnvironment, readConfig, repositoryRoot } from './config/env.js';
import { configureAgentRoutes } from './routes/agents.js';

async function main() {
  loadEnvironment();
  const config = readConfig();
  const staticDir = process.argv.includes('--static') ? join(repositoryRoot, 'frontend', 'dist') : undefined;
  if (staticDir) {
    await access(join(staticDir, 'index.html')).catch(() => {
      throw new Error('Ejecutá npm run build antes de npm start.');
    });
  }

  const db = await openDatabase(config);
  try {
    await initializeDatabase(db, config);
    const app = createApp({ db, config, staticDir, configureRoutes: configureAgentRoutes({
      storageDir: join(repositoryRoot,'.local','documents'),
    }) });
    const server = await new Promise((resolve, reject) => {
      const listener = app.listen(config.port, config.host, () => resolve(listener));
      listener.once('error', reject);
    });
    const host = config.host.includes(':') ? `[${config.host}]` : config.host;
    console.log(`RemateCR AI en http://${host}:${config.port}${staticDir ? '' : '/api/v1/health'}`);
    console.log(`SQL: ${db.kind}. Datos de demostración: ${config.demoData ? 'habilitados' : 'deshabilitados'}.`);
    let stopping = false;
    async function stop() {
      if (stopping) return;
      stopping = true;
      server.closeIdleConnections();
      await new Promise((resolve) => server.close(resolve));
      await db.close();
    }
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        stop().catch(() => {
          console.error('No se pudo cerrar la base de datos correctamente.');
          process.exitCode = 1;
        });
      });
    }
  } catch (error) {
    await db.close();
    throw error;
  }
}

main().catch((error) => {
  console.error('No se pudo iniciar RemateCR AI:', error instanceof Error ? error.message : 'error desconocido');
  process.exitCode = 1;
});
