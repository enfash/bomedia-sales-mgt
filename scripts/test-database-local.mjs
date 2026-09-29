// Isolated PostgreSQL/WASM validation. No network, Supabase credentials or live records.
// npm install --prefix /tmp/bomedia-payment-tests @electric-sql/pglite@0.5.8
// node scripts/test-database-local.mjs /tmp/bomedia-payment-tests/node_modules/@electric-sql/pglite/dist/index.js
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
if (!process.argv[2]) throw new Error('Provide the installed PGlite module path (see this file).');
const { PGlite } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const name of (await readdir('supabase/migrations')).filter(n => n.endsWith('.sql')).sort()) {
    await db.exec(await readFile(`supabase/migrations/${name}`, 'utf8'));
    console.log(`Migration passed: ${name}`);
  }
  for (const name of (await readdir('supabase/tests')).filter(n => n.endsWith('.sql')).sort()) {
    await db.exec(await readFile(`supabase/tests/${name}`, 'utf8'));
    console.log(`SQL tests passed: ${name}`);
  }
} catch (error) {
  console.error(error.message, error.detail ?? '', error.where ?? '');
  process.exitCode = 1;
} finally { await db.close(); }
