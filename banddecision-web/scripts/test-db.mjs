import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pgtap } from '@electric-sql/pglite-pgtap';
import { readdir, readFile } from 'node:fs/promises';

const database = new PGlite({ extensions: { pgcrypto, pgtap } });
let totalAssertions = 0;
let failed = false;
try {
  // Minimal Supabase platform contract; GoTrue, PostgREST and Realtime are not emulated.
  await database.exec(await readFile(new URL('./test-db-bootstrap.sql', import.meta.url), 'utf8'));
  const migrationDir = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(migrationDir)).filter(name => name.endsWith('.sql')).sort()) {
    try {
      await database.exec(await readFile(new URL(name, migrationDir), 'utf8'));
      console.log('MIGRATION PASS', name);
    } catch (error) {
      console.error('MIGRATION FAIL', name, error.code ?? '', error.message);
      throw new Error('Migration execution failed', { cause: error });
    }
  }
  const testDir = new URL('../supabase/tests/database/', import.meta.url);
  for (const name of (await readdir(testDir)).filter(name => name.endsWith('.test.sql')).sort()) {
    let plan;
    let assertions = 0;
    let suiteFailed = false;
    try {
      const results = await database.exec(await readFile(new URL(name, testDir), 'utf8'));
      for (const result of results) for (const row of result.rows ?? []) for (const value of Object.values(row)) {
        if (typeof value !== 'string') continue;
        for (const line of value.split('\n')) {
          if (/^1\.\.\d+$/.test(line)) plan = Number(line.slice(3));
          if (/^(?:not )?ok \d+/.test(line)) {
            assertions++;
            if (line.startsWith('not ok')) { suiteFailed = true; console.error(name + ': ' + value); }
          }
          if (/^# Looks like/.test(line)) { suiteFailed = true; console.error(name + ': ' + line); }
        }
      }
      if (plan === undefined || assertions !== plan) {
        suiteFailed = true;
        console.error(name + ': assertion count mismatch: ' + assertions + '/' + plan);
      }
    } catch (error) {
      suiteFailed = true;
      console.error('DATABASE TEST ERROR', name, error.code ?? '', error.message);
    } finally {
      await database.exec('rollback; reset role;');
    }
    totalAssertions += assertions;
    failed ||= suiteFailed;
    console.log((suiteFailed ? 'DB FAIL' : 'DB PASS'), name, assertions + '/' + plan);
  }
  console.log('Database assertions executed:', totalAssertions);
} catch (error) {
  failed = true;
  console.error(error.message);
} finally {
  await database.close();
}
if (failed) process.exitCode = 1;
