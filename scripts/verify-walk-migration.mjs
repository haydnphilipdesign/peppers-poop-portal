// Disposable PostgreSQL proof; no project/production connection is used.
// Set PGLITE_MODULE to an externally installed @electric-sql/pglite if needed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(path.join(process.env.PGLITE_MODULE, 'dist/index.js')).href : '@electric-sql/pglite');
const root = fileURLToPath(new URL('..', import.meta.url));

(async () => {
  const db = new PGlite();
  const exec = sql => db.exec(sql);
  const query = (sql, args = []) => db.query(sql, args);
  const rows = async (sql, args) => (await query(sql, args)).rows;
  const file = name => exec(fs.readFileSync(path.join(root, name), 'utf8'));
  const fails = async (fn, message) => { await assert.rejects(fn, message); await exec('ROLLBACK'); };
  await exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;');
  await file('supabase-schema.sql');
  const legacy = [
    ['2026-09-30T23:50:00-04:00','pee','Chris'],
    ['2026-10-01T00:10:00-04:00','poop','Debbie'],
    ['2026-10-01T08:00:00-04:00','pee','Chris'],
    ['2026-10-01T08:20:00-04:00','poop','Debbie'],
    ['2026-10-01T08:40:00-04:00','pee','Chris'],
    ['2026-10-02T09:00:00-04:00','poop','Haydn'],
    ['2026-10-03T09:00:00-04:00','poop','Chris'],
    ['2026-10-03T09:00:00-04:00','pee','Debbie'],
  ];
  for (const [time,type,user] of legacy) await query('INSERT INTO logs(created_at,type,user_name,notes) VALUES($1,$2,$3,$4)', [time,type,user,'original note']);
  const original = await rows('SELECT * FROM logs ORDER BY id');
  // Read an actual serialized export into a second disposable database.
  const exported = JSON.parse(JSON.stringify(original));
  const restore = new PGlite();
  await restore.exec('CREATE TABLE logs(id uuid PRIMARY KEY,created_at timestamptz NOT NULL,type text NOT NULL,user_name text NOT NULL,notes text)');
  for (const row of exported) await restore.query('INSERT INTO logs VALUES($1,$2,$3,$4,$5)', [row.id,row.created_at,row.type,row.user_name,row.notes]);
  assert.deepEqual((await restore.query('SELECT * FROM logs ORDER BY id')).rows, original);
  await restore.close();
  await file('migrations/001-explicit-walks.sql');
  await file('migrations/002-backfill-preview.sql');
  const preview = async () => (await rows("SELECT pepper_private.preview_legacy_walks('America/New_York') AS preview"))[0].preview;
  const convert = p => query('SELECT pepper_private.backfill_legacy_walks($1,$2)', [p.fingerprint,p.timezone]);
  const p = await preview();
  assert.equal(p.sourceCount, 8); assert.equal(p.groups.length, 4);
  assert.ok(p.groups.some(g => g.mixed_walkers && g.crosses_month));
  assert.ok(p.groups.some(g => g.mixed_walkers && g.same_timestamp));
  assert.ok(p.groups.some(g => g.long_chain && g.repeated_outcomes));
  assert.ok(p.comparisons.some(c => c.points_delta !== 0));
  await fails(() => file('migrations/003-verify-and-constrain.sql'), /Unlinked outcomes/);
  await query('UPDATE logs SET notes=$1 WHERE id=$2', ['drift',original[0].id]);
  await fails(() => convert(p), /Source changed/);
  await query('UPDATE logs SET notes=$1 WHERE id=$2', ['original note',original[0].id]);
  await convert(p);
  assert.deepEqual((await rows('SELECT * FROM logs ORDER BY id')).map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'walk_id'))), original);
  assert.equal((await rows('SELECT count(*)::int AS n FROM pepper_private.legacy_walk_map'))[0].n, 8);
  const verifyCounts = async () => {
    for (const c of p.comparisons) {
      const pattern = c.scope === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
      const n = (await rows("SELECT count(*)::int AS n FROM walks WHERE provenance <> 'explicit' AND user_name=$1 AND to_char(created_at AT TIME ZONE 'America/New_York',$2)=$3", [c.user_name,pattern,c.period]))[0].n;
      assert.equal(n,c.after_walks);
    }
  };
  await verifyCounts();
  await query('SELECT pepper_private.recover_legacy_backfill()');
  assert.deepEqual((await rows('SELECT * FROM logs ORDER BY id')).map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'walk_id'))), original);
  assert.equal((await rows('SELECT count(*)::int AS n FROM walks'))[0].n, 0);
  await convert(p); await file('migrations/003-verify-and-constrain.sql');
  const rpc = async (id,op,walk,revision,time,user,poop,pee) => (await rows(
    'SELECT public.mutate_walk_v2($1,$2,$3,$4,$5,$6,$7,$8) AS result', [id,op,walk,revision,time,user,poop,pee]))[0].result;
  const time = '2026-10-12T09:00:00-04:00';
  const request = randomUUID();
  const a = await rpc(request,'create',null,null,time,'Chris',true,true);
  const b = await rpc(randomUUID(),'create',null,null,time,'Debbie',false,false);
  const c = await rpc(randomUUID(),'create',null,null,'2026-10-12T09:01:00-04:00','Chris',false,true);
  assert.notEqual(a.walkId,b.walkId); assert.notEqual(a.walkId,c.walkId);
  assert.equal((await rows('SELECT * FROM logs WHERE walk_id=$1',[b.walkId])).length, 0);
  assert.equal((await rows('SELECT * FROM logs WHERE walk_id=$1',[a.walkId])).length, 2);
  assert.deepEqual(await rpc(request,'create',null,null,time,'Chris',true,true),a);
  await fails(() => rpc(request,'create',null,null,time,'Debbie',true,true), /reused/);
  const before = await rows('SELECT * FROM logs WHERE walk_id=$1 ORDER BY id',[a.walkId]);
  const edited = await rpc(randomUUID(),'update',a.walkId,1,time,'Haydn',true,true);
  assert.equal(edited.walkId,a.walkId); assert.equal(edited.revision,2);
  assert.deepEqual((await rows('SELECT id FROM logs WHERE walk_id=$1 ORDER BY id',[a.walkId])).map(l=>l.id),before.map(l=>l.id));
  await fails(() => rpc(randomUUID(),'update',a.walkId,1,time,'Chris',false,false), /changed or was removed/);
  const neither = await rpc(randomUUID(),'update',a.walkId,2,time,'Haydn',false,false);
  assert.equal((await rows('SELECT * FROM logs WHERE walk_id=$1',[a.walkId])).length, 0);
  const both = await rpc(randomUUID(),'update',a.walkId,neither.revision,time,'Haydn',true,true);
  assert.equal((await rows('SELECT * FROM logs WHERE walk_id=$1',[a.walkId])).length, 2);
  const deletion = randomUUID();
  const removed = await rpc(deletion,'delete',a.walkId,both.revision,null,null,null,null);
  assert.deepEqual(await rpc(deletion,'delete',a.walkId,both.revision,null,null,null,null),removed);
  assert.deepEqual(await rpc(request,'create',null,null,time,'Chris',true,true),a); // no resurrection
  assert.equal((await rows('SELECT * FROM walks WHERE id IN ($1,$2) AND deleted_at IS NULL',[b.walkId,c.walkId])).length,2);
  // An invalid user must roll back the whole operation without a receipt.
  const invalid = randomUUID();
  await fails(() => rpc(invalid,'create',null,null,time,'Nobody',true,true), /Invalid walk input/);
  assert.equal((await rows('SELECT * FROM pepper_private.walk_requests WHERE request_id=$1',[invalid])).length,0);
  // Old RPCs may target exactly one complete parent only.
  const old = (await rows("SELECT insert_walk($1,'Chris',true,true) AS ids",[time]))[0].ids;
  await fails(() => query("SELECT replace_walk($1,$2,'Chris',true,false)",[[old[0]],time]), /complete walk/);
  const other = (await rows('SELECT id FROM logs WHERE walk_id=$1',[c.walkId]))[0].id;
  await fails(() => query('SELECT delete_walk($1)',[[...old,other]]), /complete walk/);
  for (const role of ['anon','authenticated']) {
    await exec(`SET ROLE ${role}`);
    assert.equal((await rows('SELECT * FROM walks WHERE id=$1',[a.walkId])).length,0);
    assert.equal((await rows('SELECT * FROM logs WHERE walk_id=$1',[a.walkId])).length,0);
    assert.equal((await rows('SELECT * FROM walks WHERE id=$1',[b.walkId])).length,1);
    await assert.rejects(() => rpc(randomUUID(),'create',null,null,time,'Chris',false,false), /permission denied/);
    await assert.rejects(() => query("INSERT INTO walks(created_at,user_name) VALUES(now(),'Chris')"), /permission denied/);
    await assert.rejects(() => query('SELECT * FROM pepper_private.walk_requests'), /permission denied/);
    await exec('RESET ROLE');
  }
  await exec('SET ROLE service_role');
  await rpc(randomUUID(),'create',null,null,time,'Chris',false,false);
  await exec('RESET ROLE');
  // Recover only legacy conversion; new explicit records and Neither survive.
  await exec('ALTER TABLE logs ALTER COLUMN walk_id DROP NOT NULL');
  await query('SELECT pepper_private.recover_legacy_backfill()');
  assert.equal((await rows('SELECT * FROM walks WHERE id=$1',[b.walkId])).length,1);
  assert.equal((await rows('SELECT count(*)::int AS n FROM pepper_private.legacy_log_archive'))[0].n,8);
  await convert(p); await file('migrations/003-verify-and-constrain.sql');
  const historical = (await rows("SELECT * FROM walks WHERE provenance='legacy_estimate' LIMIT 1"))[0];
  await rpc(randomUUID(),'update',historical.id,1,time,'Chris',true,true);
  await exec('ALTER TABLE logs ALTER COLUMN walk_id DROP NOT NULL');
  await fails(() => query('SELECT pepper_private.recover_legacy_backfill()'), /changed after conversion/);
  await db.close();
  console.log('PASS: export/restore, preview flags/calendar deltas/ties, drift abort, preserved source/mapping, backfill/constraint, recovery, same-time/nearby identity, Neither/Both, atomic edits, revision conflicts, receipts/no resurrection, guarded legacy wrappers, anon/authenticated/service-role permissions.');
})().catch(error => { console.error(error.message); process.exit(1); });
