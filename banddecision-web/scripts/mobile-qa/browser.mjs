import {songDeletionWorkflow,workflows} from './workflows.mjs';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const artifacts=resolve(process.env.QA_DESKTOP?'.qa-artifacts/desktop':'.qa-artifacts/mobile');await mkdir(artifacts,{recursive:true});
const chromePath=process.env.QA_CHROME??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'google-chrome');
const chrome=spawn(chromePath,['--headless=new','--disable-extensions','--disable-gpu','--no-first-run','--remote-debugging-port=9223','--user-data-dir='+resolve('.qa-artifacts/mobile/chrome-'+Date.now()),'about:blank'],{windowsHide:true,stdio:'ignore'});
let mousePoint;
let socket,id=0;const pending=new Map(),errors=[];let checks=0;let viewportWidth=390;
const report=[];
function assert(ok,message){if(!ok)throw Error(message);checks++;report.push(message);console.log('PASS',message);}
async function connect(){for(let n=0;n<100;n++){try{const targets=await(await fetch('http://127.0.0.1:9223/json')).json();const target=targets.find(t=>t.type==='page');if(target){socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));break;}}catch{}await delay(100);}if(!socket)throw Error('Chrome CDP unavailable');socket.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p.reject(Error(JSON.stringify(msg.error)));else p.resolve(msg.result);}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description??msg.params.exceptionDetails.text);});await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Emulation.setFocusEmulationEnabled',{enabled:true});await cmd('Emulation.setTouchEmulationEnabled',{enabled:!process.env.QA_DESKTOP,maxTouchPoints:5});}
function cmd(method,params={}){
 // Chrome may open its own tab (e.g. chrome://settings/help); keep the QA page in front so input events are delivered.
 if(method==='Input.dispatchTouchEvent'&&params.type==='touchStart'){const n=++id;pending.set(n,{resolve(){},reject(){}});socket.send(JSON.stringify({id:n,method:'Page.bringToFront',params:{}}));}
 if(process.env.QA_DESKTOP&&method==='Input.dispatchTouchEvent'){
  if(params.type==='touchStart'){mousePoint=params.touchPoints[0];method='Input.dispatchMouseEvent';params={type:'mousePressed',x:mousePoint.x,y:mousePoint.y,button:'left',clickCount:1};}
  else{method='Input.dispatchMouseEvent';params={type:'mouseReleased',x:mousePoint.x,y:mousePoint.y,button:'left',clickCount:1};}
 }
 return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});}
async function run(expression){const r=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
async function wait(expression,timeout=45000){const start=Date.now();while(Date.now()-start<timeout){if(await run(expression))return;await delay(150);}throw Error('Timed out: '+expression+'\n'+await run('document.body.innerText.slice(-2400)'));}
async function go(path,text){await cmd('Page.navigate',{url:'http://127.0.0.1:3101'+path});await wait('document.readyState==="complete"');if(text)await wait('document.body.innerText.includes('+JSON.stringify(text)+')');await delay(400);}
async function fill(name,value){await run(`(()=>{const e=document.querySelector('[name="${name}"]');if(!e)throw Error('missing ${name}');const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);}
async function touchText(text,selector='button'){await run("document.querySelectorAll('nextjs-portal').forEach(e=>e.style.display='none')");const point=await run(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.innerText.trim()===${JSON.stringify(text)}&&e.getBoundingClientRect().width);if(!e)throw Error('missing button '+${JSON.stringify(text)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(900);}
async function viewport(width,height){if(process.env.QA_DESKTOP)width=Math.max(width,1280);viewportWidth=width;await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,isMobile:width<1024,mobile:width<1024});}
async function layout(label){const data=await run(`({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main input,main select,main textarea,main button,main details,main section')].filter(e=>{const r=e.getBoundingClientRect();return r.width&& (r.right>innerWidth+1||r.left< -1)}).map(e=>e.tagName+':'+e.textContent.slice(0,60))})`);assert(data.scroll<=viewportWidth+1&&data.width<=viewportWidth+1&&data.offenders.length===0,label+' fits '+data.width+'px '+JSON.stringify(data.offenders));}
try{
 await connect();await viewport(390,844);
 // Since 2026-11-11 the test band page exists only with ENABLE_TEST_BANDS=true and a loopback Supabase URL.
 const probe=await fetch('http://127.0.0.1:3101/bands/test',{redirect:'manual'}).catch(()=>null);
 if(!probe)throw Error('개발 서버(127.0.0.1:3101)에 연결하지 못했어요. README의 로컬 브라우저 QA 실행 순서를 확인하세요.');
 if(probe.status===404)throw Error('/bands/test가 막혀 있어요. 개발 서버를 ENABLE_TEST_BANDS=true와 로컬 Supabase 주소(예: http://127.0.0.1:54329)로 다시 실행하세요.');
 await go('/bands/test','내가 밴드장인 테스트 밴드');await fill('nickname','Mobile QA Leader');await fill('password','qa1234');await fill('pin','112233');await fill('member_pin','246810');await touchText('테스트 밴드 만들고 밴드장으로 접속');await wait('location.pathname==="/dashboard"&&document.body.innerText.includes("Mobile QA Leader님")',90000);assert(true,'touch creates five-member fixture via real Next server action');
 await go('/settings/band','멤버와 설정');const code=await run("document.querySelector('.font-mono')?.textContent");assert(/^[A-F0-9]{10}$/.test(code),'band code displayed');await touchText('간편 초대 링크 만들기');await wait('document.querySelector("[role=status]")?.textContent.includes("code=")');assert(await run('document.querySelector("[role=status]").textContent.includes('+JSON.stringify(code)+')'),'reusable code invite generated');await layout('leader settings');
 await writeFile(resolve(artifacts,'session.json'),JSON.stringify({code}));
 if(process.env.QA_DELETE_SONG){await songDeletionWorkflow({run,go,touchText,wait,assert,layout,viewport,cmd,artifacts,writeFile,resolve});}else{
 const routes=[['/dashboard','안녕하세요'],['/schedule','내 일정'],['/schedule/recommendations','추천'],['/songs','투표로 함께'],['/songs/recommendations','추천'],['/plans','합주 계획'],['/settings/band','멤버와 설정'],['/settings','설정'],['/settings/profile','내 정보'],['/bands/test','5인 테스트 준비']];
 for(const width of (process.env.QA_FAST?[]:[320,390,430,768,844,1280])){await viewport(width,width===844?390:844);for(const [path,text]of routes){await go(path,text);await layout(path);}}
 if(process.env.QA_BENCHMARK){
  const measurements=[];
  for(let pass=0;pass<3;pass++)for(const [path,marker]of [['/schedule','가능한 날'],['/schedule/recommendations','날짜 추천'],['/dashboard','안녕하세요'],['/songs','확정곡'],['/plans','예정된 합주']]){
   await fetch('http://127.0.0.1:54329/__qa/reset');const query='?qa_bench='+pass+'-'+Date.now();const start=performance.now();
   await cmd('Page.navigate',{url:'http://127.0.0.1:3101'+path+query});
   await wait('location.search==='+JSON.stringify(query)+'&&document.readyState==="complete"&&document.body.innerText.includes('+JSON.stringify(marker)+')');
   const elapsedMs=Math.round(performance.now()-start),metrics=await(await fetch('http://127.0.0.1:54329/__qa/metrics')).json();measurements.push({path,pass,elapsedMs,...metrics});console.log('BENCH',JSON.stringify(measurements.at(-1)));
  }
  await writeFile(resolve(artifacts,process.env.QA_BENCHMARK+'.json'),JSON.stringify(measurements,null,2));
 }else await workflows({run,go,fill,touchText,wait,assert,layout,viewport,cmd,delay,code,artifacts,writeFile,resolve});
 }
 assert(errors.length===0,'no uncaught JavaScript exceptions: '+JSON.stringify(errors));
}catch(e){console.error('BROWSER FAIL',e.message);if(socket){try{await writeFile(resolve(artifacts,'failure.txt'),await run('document.body.innerText'));const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(artifacts,'failure.png'),Buffer.from(shot.data,'base64'));}catch{}}process.exitCode=1;}
finally{await writeFile(resolve(artifacts,'report.json'),JSON.stringify({checks,report,errors},null,2));socket?.close();chrome.kill();}
