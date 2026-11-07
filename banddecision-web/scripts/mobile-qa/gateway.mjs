// Local-only Supabase HTTP contract for browser QA. Not GoTrue/PostgREST/Realtime.
// Runs real migrations, RLS and RPCs in disposable PGlite. Never targets a remote DB.
import {createServer} from 'node:http';
import {randomUUID,generateKeyPairSync,sign,verify} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {pgtap} from '@electric-sql/pglite-pgtap';
const db=new PGlite({extensions:{pgcrypto,pgtap}});
await db.exec(await readFile(new URL('../test-db-bootstrap.sql',import.meta.url),'utf8'));
const dir=new URL('../../supabase/migrations/',import.meta.url);
for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,dir),'utf8'));
let qaRequests={};let qaBytes=0;
const users=new Map(); const tokens=new Map(); let queue=Promise.resolve();
const ident=s=>{if(!/^[a-z_][a-z_0-9]*$/.test(s))throw Error('bad identifier');return '"'+s+'"';};
// Hosted projects sign with asymmetric ES256 keys published at /auth/v1/.well-known/jwks.json,
// so SDK getClaims() verifies locally. Mirror that instead of an HS256 secret (which forces a /user round trip).
const signingKeys=generateKeyPairSync('ec',{namedCurve:'P-256'}),kid=randomUUID();
const jwks={keys:[{...signingKeys.publicKey.export({format:'jwk'}),alg:'ES256',use:'sig',key_ops:['verify'],ext:true,kid}]};
function token(user){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const payload=enc({sub:user.id,aud:'authenticated',role:'authenticated',is_anonymous:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});const raw=enc({alg:'ES256',typ:'JWT',kid})+'.'+payload;const jwt=raw+'.'+sign('sha256',Buffer.from(raw),{key:signingKeys.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');tokens.set(jwt,user);return jwt;}
// PostgREST accepts any unexpired JWT with a valid signature; it does not know about Auth logouts.
// Session revocation must therefore come from SQL (private.actor_id()), which this mirrors.
function jwtUser(jwt){try{const [h,p,s]=jwt.split('.');if(!s||!verify('sha256',Buffer.from(h+'.'+p),{key:signingKeys.publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(s,'base64url')))return undefined;const claims=JSON.parse(Buffer.from(p,'base64url').toString());return claims.exp*1000>Date.now()?users.get(claims.sub):undefined;}catch{return undefined;}}
function split(s){let depth=0,start=0,out=[];for(let i=0;i<s.length;i++){if(s[i]==='(')depth++;if(s[i]===')')depth--;if(s[i]===','&&!depth){out.push(s.slice(start,i));start=i+1;}}out.push(s.slice(start));return out;}
async function selectRows(table,url){
 const args=[],where=[];for(const [k,v]of url.searchParams){if(['select','order','limit','offset'].includes(k))continue;const col=ident(k),dot=v.indexOf('.'),op=v.slice(0,dot),value=v.slice(dot+1);if(op==='in'){const list=value.slice(1,-1).split(',');where.push(col+' in ('+list.map(x=>{args.push(x);return '$'+args.length;}).join(',')+')');}else{const operators={eq:'=',gte:'>=',lte:'<=',gt:'>',lt:'<'};if(!operators[op])throw Error('unsupported filter '+op);args.push(value);where.push(col+operators[op]+'$'+args.length);}}
 let sql='select * from public.'+ident(table)+(where.length?' where '+where.join(' and '):'');
 const order=url.searchParams.get('order');if(order)sql+=' order by '+order.split(',').map(o=>{const [col,direction]=o.split('.');return ident(col)+(direction==='desc'?' desc':' asc');}).join(',');
 const result=await db.query(sql,args);let rows=result.rows;for(const row of rows)for(const k of ['start_date','end_date','unavailable_date','rehearsal_date'])if(row[k] instanceof Date)row[k]=row[k].toISOString().slice(0,10);const count=rows.length;const limit=url.searchParams.get('limit');if(limit)rows=rows.slice(0,Number(limit));
 const fields=split(url.searchParams.get('select')||'*');
 for(const row of rows)for(const field of fields.filter(f=>f.includes('('))){const rel=field.slice(0,field.indexOf('('));let query,param,many=false;
  if(rel==='profiles'){query='select * from public.profiles where id=$1';param=table==='song_difficulties'?row.updated_by:row.user_id;}
  else if(['confirmed_plan_members','confirmed_plan_songs'].includes(rel)){query='select * from public.'+ident(rel)+' where plan_id=$1'+(rel==='confirmed_plan_songs'?' order by display_order':'');param=row.id;many=true;}
  else throw Error('unsupported relation '+rel);
  const nested=(await db.query(query,[param])).rows;row[rel]=many?nested:nested[0]??null;
 }
 return {rows,count};
}
const server=createServer(async(req,res)=>{const waitMs=Number(process.env.QA_DELAY_MS??0);if(waitMs>0&&!req.url.startsWith('/__qa/'))await new Promise(resolve=>setTimeout(resolve,waitMs));queue=queue.then(async()=>{
 const url=new URL(req.url,'http://127.0.0.1:54329');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,HEAD,OPTIONS');
 const send=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');const json=JSON.stringify(data);if(!url.pathname.startsWith('/__qa/'))qaBytes+=Buffer.byteLength(json);res.end(req.method==='HEAD'?undefined:json);};
 if(req.method==='OPTIONS')return send(200,{});
 if(url.pathname==='/__qa/reset'){qaRequests={};qaBytes=0;return send(200,{});}
 if(url.pathname==='/__qa/metrics')return send(200,{requests:qaRequests,bytes:qaBytes,delayMs:Number(process.env.QA_DELAY_MS??0)});
 qaRequests[url.pathname]=(qaRequests[url.pathname]??0)+1;
 let body={};try{let raw='';for await(const c of req)raw+=c;if(raw)body=JSON.parse(raw);}catch{return send(400,{message:'invalid JSON'});}
 let transaction=false;
 try{
  const bearer=req.headers.authorization?.replace(/^Bearer /,'');let user=url.pathname.startsWith('/rest/v1/')?jwtUser(bearer??''):tokens.get(bearer);
  if(url.pathname==='/auth/v1/signup'){
   const id=randomUUID();user={id,aud:'authenticated',role:'authenticated',is_anonymous:true,email:'',phone:'',app_metadata:{provider:'anonymous',providers:['anonymous']},user_metadata:body.data??{},identities:[],created_at:new Date().toISOString()};
   await db.query('insert into auth.users(id,is_anonymous,raw_user_meta_data) values($1,true,$2)',[id,JSON.stringify(user.user_metadata)]);users.set(id,user);
   return send(200,{access_token:token(user),refresh_token:randomUUID(),token_type:'bearer',expires_in:3600,user});
  }
  if(url.pathname==='/auth/v1/.well-known/jwks.json')return send(200,jwks);
  if(url.pathname==='/auth/v1/user')return user?send(200,user):send(401,{msg:'invalid session',code:'bad_jwt'});
  if(url.pathname==='/auth/v1/logout'){tokens.delete(bearer);return send(200,{});}
  if(!url.pathname.startsWith('/rest/v1/'))return send(404,{message:'unsupported QA endpoint'});
  if(!user&&url.pathname!=='/rest/v1/rpc/default_band_entry_context')return send(401,{message:'unauthenticated'});
  await db.exec(user?'begin; set local role authenticated;':'begin; set local role anon;');transaction=true;
  await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[user?.id??'',JSON.stringify(user?{sub:user.id,is_anonymous:true,role:'authenticated'}:{role:'anon'})]);
  if(url.pathname.startsWith('/rest/v1/rpc/')){
   // Arrays of objects are jsonb arguments; arrays of plain values (date[]/bigint[]) pass through like PostgREST.
   const fn=url.pathname.split('/').at(-1),keys=Object.keys(body);const result=await db.query('select public.'+ident(fn)+'('+keys.map((k,i)=>ident(k)+'=> $'+(i+1)).join(',')+') as result',keys.map(k=>Array.isArray(body[k])&&body[k].some(v=>v!==null&&typeof v==='object')?JSON.stringify(body[k]):body[k]));
   await db.exec('commit');transaction=false;return send(200,result.rows[0]?.result??null);
  }
  const table=url.pathname.split('/').at(-1),result=await selectRows(table,url);
  await db.exec('commit');transaction=false;
  if(req.headers.prefer?.includes('count=exact'))res.setHeader('Content-Range','0-'+Math.max(0,result.count-1)+'/'+result.count);
  if(req.headers.accept?.includes('application/vnd.pgrst.object'))return result.rows.length===1?send(200,result.rows[0]):send(406,{code:'PGRST116',details:'The result contains '+result.rows.length+' rows',message:'not single'});
  return send(200,result.rows);
 }catch(e){if(transaction)await db.exec('rollback');console.error('QA gateway',url.pathname,e.code??'',e.message);send(400,{code:e.code??'QA_ERROR',message:e.message,details:null,hint:null});}
 }).catch(e=>{console.error(e);res.end();});});
server.listen(54329,'127.0.0.1',()=>console.log('QA gateway ready on 127.0.0.1:54329 (disposable SQL, simulated Auth/REST, no Realtime)'));
process.on('SIGINT',()=>server.close(()=>db.close().then(()=>process.exit())));
