import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {pgtap} from '@electric-sql/pglite-pgtap';
import {readdir,readFile} from 'node:fs/promises';
const db=new PGlite({extensions:{pgcrypto,pgtap}});let failed=false;
async function suites(dir,label){let total=0;const names=(await readdir(dir)).filter(n=>n.endsWith('.test.sql')).sort();if(!names.length)throw Error('Missing '+label+' tests');
 for(const name of names){let count=0,plan,bad=false;try{const results=await db.exec((await readFile(new URL(name,dir),'utf8')).replace(/^\uFEFF/,''));for(const result of results)for(const row of result.rows??[])for(const v of Object.values(row)){if(typeof v!=='string')continue;for(const line of v.split('\n')){if(/^1\.\.\d+$/.test(line))plan=Number(line.slice(3));if(/^(?:not )?ok \d+/.test(line)){count++;if(line.startsWith('not ok')){bad=true;console.error(name,v);}}if(/^# Looks like/.test(line)){bad=true;console.error(line);}}}if(plan===undefined||plan!==count)bad=true;}catch(e){bad=true;console.error('DB ERROR',label,name,e.code??'',e.message);}finally{await db.exec('rollback;reset role;');}failed||=bad;total+=count;console.log(bad?'DB FAIL':'DB PASS',label,name,count+'/'+plan);}
 console.log(label+' assertions:',total);
}
try{
 await db.exec(await readFile(new URL('./test-db-bootstrap.sql',import.meta.url),'utf8'));
 const dir=new URL('../supabase/migrations/',import.meta.url);let historical=false;
 for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort()){
  if(name>='202611050011'&&!historical){await suites(new URL('../supabase/tests/database/',import.meta.url),'HISTORICAL through 010');historical=true;await db.exec((await readFile(new URL('../supabase/tests/upgrade/before_011.sql',import.meta.url),'utf8')).replace(/^\uFEFF/,''));}
  if(name==='202611050014_dates_without_reasons.sql')await db.exec("update public.confirmed_plan_members set reason_snapshot='pre-removal absence reason' where plan_id=current_setting('qa.upgrade.plan')::uuid;");
  await db.exec((await readFile(new URL(name,dir),'utf8')).replace(/^\uFEFF/,''));console.log('MIGRATION PASS',name);
 }
 if(!historical)throw Error('Continuous planning migration missing');
 await suites(new URL('../supabase/tests/current/',import.meta.url),'CURRENT continuous planning');
}catch(e){failed=true;console.error('DB FAIL',e.code??'',e.message);}finally{await db.close();}if(failed)process.exitCode=1;
