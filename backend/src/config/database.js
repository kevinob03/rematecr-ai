import { createHash } from 'node:crypto';
import { mkdir, open, readdir, readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { repositoryRoot } from './env.js';

const { Pool } = pg;

function postgresql(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, max: 10 });
  pool.on('error', (error) => console.error('Conexión SQL inactiva interrumpida.', error.code || 'DB_ERROR'));
  return {
    kind: 'postgresql',
    query: (sql, values) => pool.query(sql, values),
    async transaction(run) {
      const client = await pool.connect();
      let discard = false;
      try {
        await client.query('BEGIN');
        const result = await run({
          query: (sql, values) => client.query(sql, values),
          exec: (sql) => client.query(sql),
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          discard = true;
        }
        throw error;
      } finally {
        client.release(discard);
      }
    },
    close: () => pool.end(),
  };
}

async function lockDataDirectory(dataDir) {
  if (dataDir === 'memory://') return async () => {};
  await mkdir(dirname(dataDir), { recursive: true });
  const path = dataDir + '.lock';
  let lock;
  try {
    lock = await open(path, 'wx', 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    await clearAbandonedLock(path);
    lock = await open(path, 'wx', 0o600).catch((failure) => {
      if (failure.code === 'EEXIST') throw databaseInUse(path);
      throw failure;
    });
  }
  const unlock = async () => {
    await lock.close();
    await unlink(path);
  };
  try {
    await lock.writeFile(String(process.pid));
  } catch (error) {
    await unlock();
    throw error;
  }
  return unlock;
}

function databaseInUse(path) {
  return new Error(`La base local ya está abierta o en recuperación. Cerrá el otro servidor antes de intentar de nuevo. Archivo de bloqueo: ${path}`);
}

async function clearAbandonedLock(path) {
  const recoveryPath = path + '.recovery';
  const recovery = await open(recoveryPath, 'wx', 0o600).catch((error) => {
    if (error.code === 'EEXIST') throw databaseInUse(path);
    throw error;
  });
  try {
    const contents = await readFile(path, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (contents === null) return;
    const pid = Number(contents.trim());
    if (!Number.isSafeInteger(pid) || pid < 1 || pid > 0x7fffffff) throw databaseInUse(path);
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === 'ESRCH') {
        // A process can close cleanly while we are checking its PID. Preserve
        // any replacement acquired between the first read and that check.
        const current = await readFile(path, 'utf8').catch((failure) => {
          if (failure.code === 'ENOENT') return null;
          throw failure;
        });
        if (current === contents) await unlink(path);
        return;
      }
      if (error.code !== 'EPERM') throw error;
    }
    throw databaseInUse(path);
  } finally {
    await recovery.close();
    await unlink(recoveryPath);
  }
}

export async function openDatabase({ databaseUrl = '', dataDir = join(repositoryRoot, '.local', 'postgres') } = {}) {
  if (databaseUrl) return postgresql(databaseUrl);

  const unlock = await lockDataDirectory(dataDir);
  try {
    const engine = await PGlite.create(dataDir);
    return {
      kind: 'pglite',
      query: (sql, values) => engine.query(sql, values),
      transaction: (run) => engine.transaction(run),
      async close() {
        try {
          await engine.close();
        } finally {
          await unlock();
        }
      },
    };
  } catch (error) {
    await unlock();
    throw error;
  }
}

async function readScripts(group) {
  const directory = join(repositoryRoot, 'database', group);
  const names = (await readdir(directory)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
  return Promise.all(names.map(async (name) => {
    const sql = await readFile(join(directory, name), 'utf8');
    const digest = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
    return { key: group + '/' + name, sql, digest };
  }));
}

export async function initializeDatabase(db, { demoData = false, production = false } = {}) {
  const scripts = await readScripts('migrations');
  if (scripts.length === 0) throw new Error('Faltan los archivos de migración SQL.');
  if (demoData) scripts.push(...await readScripts('seeds'));
  await db.transaction(async (tx) => {
    if (db.kind === 'postgresql') await tx.query('SELECT pg_advisory_xact_lock(732109481)');
    await tx.query(`CREATE TABLE IF NOT EXISTS schema_scripts (
      script_key text PRIMARY KEY,
      digest text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await tx.query('SELECT script_key, digest FROM schema_scripts');
    const applied = new Map(rows.map(({ script_key, digest }) => [script_key, digest]));
    if (production && rows.some(({ script_key }) => script_key.startsWith('seeds/'))) {
      throw new Error('La base contiene datos de demostración. Usá una base separada para producción.');
    }
    for (const script of scripts) {
      if (applied.get(script.key) === script.digest) continue;
      if (applied.has(script.key)) {
        throw new Error(`El script aplicado ${script.key} cambió. Agregá una migración nueva.`);
      }
      await tx.exec(script.sql);
      await tx.query('INSERT INTO schema_scripts (script_key, digest) VALUES ($1, $2)', [script.key, script.digest]);
    }
  });
}
