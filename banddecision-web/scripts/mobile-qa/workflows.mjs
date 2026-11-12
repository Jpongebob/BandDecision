// Redesigned screens (2026-11): tap a date once to see it and again to change it, sheets instead of inline editors.
export async function workflows({run,go,fill,touchText,wait,assert,layout,viewport,cmd,delay,code,artifacts,writeFile,resolve}){
 async function set(selector,value){
  await run(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('missing '+${JSON.stringify(selector)});const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
 }
 async function touch(selector){await run("document.querySelectorAll('nextjs-portal').forEach(e=>e.style.display='none')");const p=await run(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();if(!r.width)throw Error('hidden '+${JSON.stringify(selector)});return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(900);}
 async function open(selector){if(!await run('document.querySelector('+JSON.stringify(selector)+')?.open'))await touch(selector+' > summary');}
 const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});};
 async function logout(){await go('/settings/profile','내 정보');await touchText('로그아웃 · 프로필 바꾸기');await wait('location.pathname==="/login"');}
 async function gate(){await go('/login?code='+code,'우리 밴드로 접속');assert(await run('document.querySelector("input[name=code]").value==='+JSON.stringify(code)),'code invite prefilled');await fill('password','wrong9999');await touchText('밴드 들어가기');await wait('document.body.innerText.includes("밴드 코드 또는 공용 비밀번호를 확인")');await fill('password',' qa1234 ');await touchText('밴드 들어가기');await wait('location.pathname==="/login/member"&&!!document.querySelector("select[name=member]")');await delay(300);}
 async function enter(name,pin){await gate();const id=await run(`Array.from(document.querySelectorAll('select[name=member] option')).find(e=>e.textContent.includes(${JSON.stringify(name)}))?.value`);assert(!!id,'profile available: '+name);await fill('member',id);await fill('pin','000000');await touchText('내 프로필로 로그인');await wait('document.body.innerText.includes("개인 PIN을 확인")');await fill('pin',' '+pin.slice(0,3)+' '+pin.slice(3)+' ');await touchText('내 프로필로 로그인');await wait('location.pathname==="/dashboard"');assert(true,'invalid PIN retry preserves selection and signs in');}
 async function touchNav(href){await run('(()=>{document.querySelectorAll("[data-qa-link]").forEach(e=>e.removeAttribute("data-qa-link"));const e=[...document.querySelectorAll('+JSON.stringify('a[href="'+href+'"]')+')].find(e=>e.closest("nav,aside")&&e.getBoundingClientRect().width);if(!e)throw Error("missing nav link '+href+'");e.setAttribute("data-qa-link","");})()');await touch('[data-qa-link]');}
 const shot=async name=>writeFile(resolve(artifacts,name),Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
 const md=d=>Number(d.slice(5,7))+'월 '+Number(d.slice(8,10))+'일',ym=d=>Number(d.slice(0,4))+'년 '+Number(d.slice(5,7))+'월';
 const cal='section[aria-label="달력"]',panel='section[aria-label="선택한 날짜 현황"]',planCal='dialog[open] section[aria-label="달력에서 고르기"]';
 const cell=d=>cal+' [data-day="'+d+'"]';
 async function showMonth(scope,d){for(let n=0;n<4;n++){const shown=await run('document.querySelector('+JSON.stringify(scope+' [aria-live=polite]')+').textContent.trim()');if(shown===ym(d))return;const [y,m]=shown.match(/\d+/g).map(Number);const next=Number(d.slice(0,4))*12+Number(d.slice(5,7))>y*12+m;await touch(scope+' button[aria-label="'+(next?'다음 달':'이전 달')+'"]');}throw Error('month not reachable '+d);}
 const cellState=d=>run('document.querySelector('+JSON.stringify(cell(d))+')?.dataset.state');
 // First tap only focuses a date; the second one stages adding/removing it.
 async function toggleDay(d){await showMonth(cal,d);if(!(await run('document.querySelector('+JSON.stringify(cell(d))+').getAttribute("aria-label").includes("보는 중")')))await touch(cell(d));await touch(cell(d));}
 const panelText=()=>run('document.querySelector('+JSON.stringify(panel)+').innerText');
 async function saveCalendar(){await touchText('저장',panel+' button');await wait('(document.querySelector('+JSON.stringify(panel+' [role=status]')+')?.innerText??"").includes("저장했어요")||!!document.querySelector('+JSON.stringify(panel+' [role=alert]')+')');const error=await run('document.querySelector('+JSON.stringify(panel+' [role=alert]')+')?.textContent??""');if(error)throw Error('calendar save failed: '+error);await wait('!document.querySelector('+JSON.stringify(cal+' [data-day]:not([data-state=past]):disabled')+')');}
 const savedCount=()=>run('Number((document.querySelector("main button[aria-haspopup=dialog]")?.innerText.match(/가능한 날 (\\d+)개/)??[])[1])');
 async function closeSheet(){await touch('dialog[open] button[aria-label="닫기"]');await wait('!document.querySelector("dialog[open]")');}
 async function removeSaved(d){await touch('main button[aria-haspopup=dialog]');await wait('!!document.querySelector("dialog[open]")');const header='dialog[open] section[aria-label="'+Number(d.slice(5,7))+'월"] > button';if(await run('document.querySelector('+JSON.stringify(header)+')?.getAttribute("aria-expanded")==="false"'))await touch(header);await touch('dialog[open] [data-remove-date="'+d+'"]');await wait('!document.querySelector('+JSON.stringify('[data-remove-date="'+d+'"]')+')&&(document.querySelector("dialog[open] [role=status]")?.innerText??"").includes("뺐어요")');await closeSheet();}
 const trace=async tag=>{if(process.env.QA_TRACE)console.log('TRACE',tag,JSON.stringify(await run('(()=>{const p=document.querySelector('+JSON.stringify(panel)+');return [p?.innerText.slice(-70),[...document.querySelectorAll('+JSON.stringify(cal+' [data-state=adding],'+cal+' [data-state=removing]')+')].map(e=>e.dataset.day+e.dataset.state)]})()')));};
 // Read a day's state only after its month is on screen (other months' cells do not exist).
 async function ensureSaved(d,wanted){await showMonth(cal,d);await trace('ensure '+d+' '+wanted+' state='+(await cellState(d)));if(((await cellState(d))==='saved')!==wanted){await toggleDay(d);await trace('toggled');await saveCalendar();await trace('saved');}assert(((await cellState(d))==='saved')===wanted,(wanted?'saved ':'removed ')+d);}
 // Plans: every card keeps its edit/delete sheets in the DOM, so summaries ignore dialogs.
 const summaryHas=(card,value)=>'(()=>{const c=document.querySelector('+JSON.stringify(card)+')?.cloneNode(true);if(!c)return false;c.querySelectorAll("dialog,form").forEach(e=>e.remove());return c.textContent.includes('+JSON.stringify(value)+');})()';
 async function ackPartial(){if(await run('!!document.querySelector("dialog[open] input[type=checkbox]")&&!document.querySelector("dialog[open] input[type=checkbox]").checked'))await touch('dialog[open] input[type=checkbox]');}
 async function pickPlanDay(d){await showMonth(planCal,d);await touch(planCal+' [data-day="'+d+'"]');await ackPartial();}
 const planCount=()=>run('document.querySelectorAll("[data-plan-id]:not([data-plan-detail])").length');
 async function createDatePlan(d,location){const before=await planCount();await touchText('새 합주 정하기');await wait('!!document.querySelector("dialog[open]")');await pickPlanDay(d);if(location)await set('dialog[open] input[name=location]',location);assert(!(await run("document.querySelector('dialog[open]').innerText.includes('미리보기')")),'no preview step');await touchText('이 날로 확정하기','dialog[open] button');await wait('!document.querySelector("dialog[open]")&&document.querySelectorAll("[data-plan-id]:not([data-plan-detail])").length==='+(before+1));}
 // PC shows one plan at a time: pick its row in the list first (phone cards are hidden there).
 const desk=!!process.env.QA_DESKTOP;
 async function pick(sel){if(!desk)return;const id=/"([^"]+)"/.exec(sel)?.[1];if(id){await touch('[data-plan-row="'+id+'"]');await wait('!!document.querySelector('+JSON.stringify('[data-plan-detail][data-plan-id="'+id+'"]')+')');}}
 async function openEdit(card){await pick(card);await touchText('수정',card+' button');await wait('!!document.querySelector("dialog[open]")');}
 async function savePlanEdit(card,value){await ackPartial();await touchText('계획 수정 저장','dialog[open] button');await wait('!document.querySelector("dialog[open]")||!!document.querySelector("dialog[open] [role=alert]")');const error=await run('document.querySelector("dialog[open] [role=alert]")?.textContent??""');await wait(summaryHas(card,value),20000).catch(()=>{});assert(!error&&await run(summaryHas(card,value)),'plan edit saved and shows '+value+(error?' — error: '+error:''));}
 async function deletePlan(card){const before=await planCount();assert(!(await run('!!document.querySelector('+JSON.stringify(card+' button[aria-label^="더보기:"]')+')')),'plan card has no icon-only more button');await openEdit(card);assert(!(await run('[...document.querySelectorAll("dialog[open] button")].some(b=>b.innerText.includes("삭제"))')),'edit sheet has no delete button');await touch('dialog[open] button[aria-label="닫기"]');await wait('!document.querySelector("dialog[open]")');await pick(card);await touchText('삭제',card+' button');await wait('!!document.querySelector("dialog[open] h2")?.textContent.includes("합주 계획을 삭제할까요?")');assert(await run('(()=>{const d=document.querySelector("dialog[open]"),r=d.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&[...d.querySelectorAll("button")].map(b=>b.innerText.trim()).join()==="삭제 확인,취소";})()'),'delete popup is fully on screen with confirm and cancel');await shot('plan-delete-confirm-'+(process.env.QA_DESKTOP?1280:390)+'.png');await touchText('삭제 확인','dialog[open] button');await wait('document.querySelectorAll("[data-plan-id]:not([data-plan-detail])").length==='+(before-1));}

 // Home
 for(const width of [390,1280]){await viewport(width,844);await go('/dashboard','안녕하세요');await layout('home');await shot('home-'+width+'.png');}
 await viewport(1280,844);await go('/dashboard','안녕하세요');assert(await run('[...document.querySelectorAll("aside a[aria-current=page]")].map(a=>a.innerText.trim()).join()==="홈"'),'PC menu marks 홈');
 const logoutPoint=await run('(()=>{const r=document.querySelector("aside form button").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:logoutPoint.x,y:logoutPoint.y});await delay(150);
 if(process.env.QA_DESKTOP)assert(await run('matchMedia("(hover: hover)").matches'),'PC run has a hovering mouse');
 const pointer=await run('(()=>{const b=document.querySelector("aside form button"),s=getComputedStyle(b);return {button:s.cursor,link:getComputedStyle(document.querySelector("aside a[href]")).cursor,hoverable:matchMedia("(hover: hover)").matches,hovered:b.matches(":hover"),image:s.backgroundImage};})()');
 assert(pointer.button==='default'&&pointer.link==='pointer','only links show the hand; buttons keep the arrow '+JSON.stringify(pointer));
 assert(!pointer.hoverable||pointer.hovered&&pointer.image.includes('gradient'),'buttons darken a little under the mouse '+JSON.stringify(pointer));await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5});
 await go('/songs','합주곡');assert(await run('(()=>{const on=[...document.querySelectorAll("aside a[aria-current=page]")];return on.length===1&&on[0].innerText.trim().startsWith("합주곡");})()&&document.querySelector("aside").innerText.includes("설정")'),'PC menu follows the current tab and groups settings');await viewport(390,844);await go('/dashboard','안녕하세요');
 assert(await run('document.body.innerText.includes("다가오는 합주")&&document.body.innerText.includes("예정 합주 0/5")&&!document.body.innerText.includes("내가 할 일")'),'home shows greeting, chips and the upcoming card without a task list');

 // Difficulty toggle reaches list/detail/plan choices on both viewports.
 await go('/songs','투표로 함께');
 const unratedLink=await run(`Array.from(document.querySelectorAll('[data-song-id] a')).find(e=>e.textContent.startsWith('[테스트 D]'))?.getAttribute('href')`);
 assert(!!unratedLink,'unrated fully-voted fixture is available');
 const unratedId=unratedLink.split('/').pop();
 for(const width of [390,1280]){
  await viewport(width,844);await go('/songs','투표로 함께');
  assert(!(await run('document.body.innerText.includes("미등록")')),'OFF removes difficulty summaries at '+width);await layout('difficulty OFF song list');
  await go(unratedLink,'투표 현황');assert(!(await run('!!document.querySelector("select[name=difficulty]")')),'OFF removes difficulty editor at '+width);await layout('difficulty OFF detail');
  await shot('difficulty-off-'+width+'.png');
 }
 await viewport(390,844);
 await go('/plans','새 합주 정하기');assert(await run(`!!document.querySelector('[data-song-choice="${unratedId}"]')`),'OFF allows fully-voted candidate without difficulties in new plan choices');
 await go('/settings/band','멤버와 설정');assert(!(await run('!!document.querySelector("select[name=skill]")')),'skill inputs hidden by default');
 await touchText('실력 기능 켜기');await wait('!!document.querySelector("select[name=skill]")');assert(true,'leader enables skill fields');
 for(const width of [390,1280]){
  await viewport(width,844);await go('/songs','투표로 함께');assert(await run('!document.body.innerText.includes("미등록")&&/평균( 난이도)? \\d\\.\\d|미입력/.test(document.body.innerText)'),'ON shows one average difficulty per song in the list at '+width);
  await go(unratedLink,'파트별 난이도');assert(await run('!!document.querySelector("select[name=difficulty]")'),'ON restores difficulty editor at '+width);await layout('difficulty ON detail');
  await shot('difficulty-on-'+width+'.png');
 }
 await viewport(390,844);
 await go('/plans','새 합주 정하기');assert(!(await run(`!!document.querySelector('[data-song-choice="${unratedId}"]')`)),'ON excludes missing-difficulty candidate from new plan choices');
 await go('/settings/band','멤버와 설정');await touchText('실력 기능 끄기');await wait('!document.querySelector("select[name=skill]")');assert(true,'leader disables skill fields');

 // Schedule: two-month window, tap once to see / twice to change, one save for add + remove, undo, range, leave guard.
 await viewport(390,844);await go('/schedule','가능한 날');
 const firstMonth=ym(day(0));await touch(cal+' button[aria-label="다음 달"]');
 assert(await run('document.querySelector('+JSON.stringify(cal+' [aria-live=polite]')+').textContent.trim()!=='+JSON.stringify(firstMonth)+'&&document.querySelector('+JSON.stringify(cal+' button[aria-label="다음 달"]')+').disabled'),'calendar exposes this month and next month only');
 await touch(cal+' button[aria-label="이전 달"]');
 if(process.env.QA_DESKTOP){
  await run('document.querySelector('+JSON.stringify(cell(day(2)))+').focus()');
  await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await wait('document.activeElement?.dataset.day==='+JSON.stringify(day(3)));assert((await panelText()).includes('바뀐 날짜 없음'),'desktop keyboard moves to the next day without changing anything');
 }
 const initialSaved=await savedCount();assert(initialSaved>0,'fixture available dates counted ('+initialSaved+')');
 assert(!(await run("!!document.querySelector('main input[name=reason]')||document.body.innerText.includes('불참 사유')||document.body.innerText.includes('회차')")),'availability has no reason inputs or round terminology');
 assert((await panelText()).includes('바뀐 날짜 없음')&&await run('document.querySelector('+JSON.stringify(panel)+').querySelector("button:last-of-type").disabled'),'nothing staged and save disabled at start');
 for(const width of [320,390,430,768,1280]){await viewport(width,844);await layout('schedule calendar');if(width===390||width===1280)await shot('schedule-'+width+'.png');}await viewport(390,844);
 // The range check needs two days in one month; near a month end use day 19–20 instead of 20–21.
 const rangeDays=day(20).slice(0,7)===day(21).slice(0,7)?[day(20),day(21)]:[day(19),day(20)];
 const freed=[...new Set([10,11,13,14,20,21].map(day).concat(rangeDays))],original=new Map();let removed=0;
 for(const d of freed){await showMonth(cal,d);const saved=(await cellState(d))==='saved';original.set(d,saved);if(saved){await removeSaved(d);removed++;}}
 assert((await savedCount())===initialSaved-removed,'removing from the saved-dates sheet keeps the other dates ('+removed+' removed)');
 for(const d of freed){await showMonth(cal,d);assert((await cellState(d))!=='saved','sheet removed '+d);}
 const savedDay=await run('document.querySelector('+JSON.stringify(cal+' [data-state=saved]:not([aria-label*="보는 중"])')+')?.dataset.day');
 await touch(cell(savedDay));assert((await panelText()).includes(md(savedDay))&&(await panelText()).includes('바뀐 날짜 없음'),'first tap on a saved day only shows its roster');
 await toggleDay(day(13));await toggleDay(day(14));
 assert((await cellState(day(13)))==='adding'&&(await cellState(day(14)))==='adding'&&(await panelText()).includes('2일 추가'),'second taps stage separate dates');
 assert((await panelText()).includes('나'),'roster includes my unsaved choice');
 await touchText('초기화',panel+' button');assert((await panelText()).includes('바뀐 날짜 없음'),'reset clears staged dates only');
 await toggleDay(day(10));await saveCalendar();assert((await cellState(day(10)))==='saved','saving adds the date');
 await touchText('되돌리기',panel+' button');await wait('document.querySelector('+JSON.stringify(cell(day(10)))+').dataset.state==="none"&&!document.querySelector('+JSON.stringify(cal+' [data-day]:not([data-state=past]):disabled')+')');assert(true,'undo after saving restores the previous dates');
 await toggleDay(day(10));await toggleDay(savedDay);assert((await panelText()).includes('1일 추가 · 1일 빼기'),'one save carries an addition and a removal');await saveCalendar();
 await showMonth(cal,day(10));const addedState=await cellState(day(10));await showMonth(cal,savedDay);assert(addedState==='saved'&&(await cellState(savedDay))==='none','addition and removal saved together');
 await toggleDay(savedDay);await saveCalendar();
 const[rangeA,rangeB]=rangeDays;await touchText('기간으로');await showMonth(cal,rangeA);await touch(cell(rangeA));await touch(cell(rangeB));assert((await cellState(rangeA))==='adding'&&(await cellState(rangeB))==='adding','range selects every day between two taps');await saveCalendar();await touchText('하루씩');
 // Leaving with staged changes asks first.
 await toggleDay(day(13));await touchNav('/songs');await wait('!!document.querySelector("dialog[open]")');assert(await run('location.pathname==="/schedule"&&document.querySelector("dialog[open]").innerText.includes("저장하지 않은 변경이 있어요")'),'leaving with unsaved dates asks first');
 await touchText('계속 고르기','dialog[open] button');assert(await run('!document.querySelector("dialog[open]")&&location.pathname==="/schedule"')&&(await cellState(day(13)))==='adding','keep choosing returns without losing changes');
 await touchNav('/songs');await wait('!!document.querySelector("dialog[open]")');await touchText('저장하고 이동','dialog[open] button');await wait('location.pathname==="/songs"');await go('/schedule','가능한 날');await showMonth(cal,day(13));assert((await cellState(day(13)))==='saved','save-and-leave stored the date');
 for(const d of freed)await ensureSaved(d,original.get(d));
 assert((await savedCount())===initialSaved,'all freed dates restored ('+initialSaved+')');
 await touch('main button[aria-haspopup=dialog]');await wait('!!document.querySelector("dialog[open]")');for(const width of [320,390,430,768,1280]){await viewport(width,844);await layout('saved dates sheet');if(width===390)await shot('saved-dates-390.png');}await viewport(390,844);await closeSheet();

 // Plans: new plan sheet, date-only plan, edits in place, five-plan capacity, delete.
 await go('/plans','새 합주 정하기');await touchText('새 합주 정하기');await wait('!!document.querySelector("dialog[open]")');
 for(const width of [320,390,430,768,1280]){await viewport(width,844);await layout('new plan sheet');assert((await run('document.querySelectorAll("dialog[open] [data-day]").length'))>=28,'full calendar month available at '+width);if(width===390||width===1280)await shot('new-plan-'+width+'.png');}await viewport(390,844);
 assert((await run('document.querySelectorAll("dialog[open] input[name=recommended_date]").length'))===4,'four date suggestions appear automatically');
 await touch('dialog[open] fieldset label');assert((await run('document.querySelector("dialog[open] input[name=date]").value'))!=='','selecting a suggestion fills the date immediately');
 await ackPartial();assert(!(await run('[...document.querySelectorAll("dialog[open] button")].find(b=>b.innerText.trim()==="이 날로 확정하기").disabled')),'selected suggestion can be confirmed without songs or preview');
 await closeSheet();
 await createDatePlan(day(11),'홍대 QA 합주실');
 await go('/dashboard','홍대 QA 합주실');assert(await run('document.body.innerText.indexOf("다가오는 합주")<document.body.innerText.indexOf("홍대 QA 합주실")'),'home shows the upcoming rehearsal with its location');
 await go('/plans','합주 계획');await touchText('새 합주 정하기');await wait('!!document.querySelector("dialog[open]")');await showMonth(planCal,day(11));
 assert(await run('document.querySelector("dialog[open] input[name=location]").value===""&&document.querySelector("dialog[open]").innerText.includes("날짜를 골라 주세요")&&!!document.querySelector('+JSON.stringify(planCal+' [data-day="'+day(11)+'"][data-taken]')+')'),'a new plan form opens empty after a save and shows the planned day as a green cell');await closeSheet();
 await go('/plans','합주 계획');const first=await run('document.querySelector("[data-plan-id]").dataset.planId'),card='[data-plan-id="'+first+'"]';
 assert(await run(summaryHas(card,'곡 미정')),'date-only plan created with no vote or song requirement');
 await openEdit(card);assert(await run('[...document.querySelectorAll("dialog[open] button")].find(b=>b.innerText.trim()==="계획 수정 저장").disabled&&document.querySelector("dialog[open]").innerText.includes("바뀐 내용이 없어요")&&!!document.querySelector("dialog[open] [data-saved-attendance]")&&!document.querySelector("dialog[open] input[type=checkbox]")'),'unchanged edit keeps save off, says why, and shows the saved attendance without the partial checkbox');await shot('plan-edit-unchanged-390.png');
 await touch('dialog[open] [data-song-choice]');assert(!(await run('[...document.querySelectorAll("dialog[open] button")].find(b=>b.innerText.trim()==="계획 수정 저장").disabled')),'a song change wakes the save button');await savePlanEdit(card,'[테스트 A]');assert((await planCount())===1,'adding a song edits the same plan without consuming a slot');
 await go('/dashboard','다가오는 합주');assert(await run('document.body.innerText.includes("[테스트 A]")'),'home shows the songs of the next rehearsal');await shot('home-songs-'+(process.env.QA_DESKTOP?1280:390)+'.png');await go('/plans','합주 계획');
 await openEdit(card);assert(!(await run('!!document.querySelector('+JSON.stringify(planCal+' [data-day="'+day(11)+'"][data-taken]')+')')),'the edited plan does not mark its own day as taken');await pickPlanDay(day(12));assert(await run('document.querySelector("dialog[open] [data-date-move]")?.innerText.includes("옮겨요")'),'moving the date says the rehearsal moves');await touch('dialog[open] [data-song-choice][aria-pressed=true]');await savePlanEdit(card,'곡 미정');assert(await run(summaryHas(card,md(day(12)))),'plan date changed and songs removed in place');
 for(let i=1;i<=4;i++){await createDatePlan(day(12+i));}
 assert(await run('!document.body.innerText.includes("새 합주 정하기")&&document.body.innerText.includes("계획이 5개")'),'five-plan capacity enforced in screen');
 await openEdit(card);await pickPlanDay(day(17));await savePlanEdit(card,md(day(17)));assert((await planCount())===5,'existing plans remain editable at capacity');await layout('five plans');await shot('plans-390.png');
 for(const width of [1024,1152,1280]){
  await viewport(width,844,true);await go('/plans','합주 계획');await layout('PC plan list and detail');
  assert(await run('(()=>{const e=document.querySelector("[data-plan-detail] h2");return !!e&&e.getBoundingClientRect().width>=160;})()'),'PC plan heading stays readable at '+width);
  await go('/songs','합주곡');await layout('PC song table');
  assert(await run('(()=>{const e=document.querySelector("[data-song-row] b");return !!e&&e.getBoundingClientRect().width>=80;})()'),'PC song titles remain visible at '+width);
 }
 await viewport(390,844);await go('/plans','합주 계획');
 // PC review shots: plan list + detail, schedule, song table + detail.
 if(desk){await run('scrollTo(0,0)');await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5});await delay(200);await layout('pc plans');await shot('pc-plans-1280.png');
  assert(await run('document.querySelectorAll("[data-plan-row]").length===5&&!!document.querySelector("[data-plan-detail] h2")'),'PC plans show a list of five and one detail');
  for(const [path,text,name] of [['/schedule','가능한 날','schedule'],['/songs','투표로 함께','songs']]){await go(path,text);await layout('pc '+name);await shot('pc-'+name+'-1280.png');}
  const songRow=await run('document.querySelector("[data-song-row]")?.getAttribute("href")');assert(!!songRow,'PC songs show a table with links to the detail');await go(songRow,'투표 현황');await layout('pc song detail');await shot('pc-song-1280.png');
  assert(await run('!!document.querySelector("aside[aria-label=\'고른 곡\'] h1")&&!!document.querySelector("[data-song-row][aria-current]")'),'PC song detail sits beside the table with the row marked');
  await go('/plans','합주 계획');}
 await go('/dashboard','그다음 합주');await layout('home with later plans');assert(await run('[...document.querySelectorAll("[data-later-plan]")].length===2&&[...document.querySelectorAll("[data-later-plan]")].every(e=>!!e.querySelector("svg")&&!e.innerText.includes("장소:"))'),'later rehearsals on home use the same order with a place icon');await shot('home-later-plans-'+(process.env.QA_DESKTOP?1280:390)+'.png');await go('/plans','합주 계획');
 await deletePlan(card);assert(true,'deleting from the edit sheet frees one plan slot');

 // Leader attendance (단톡방 등 앱 밖에서 들은 불참), locked plan days and plan times.
 const lockedId=await run('document.querySelector("[data-plan-id]").dataset.planId'),locked='[data-plan-id="'+lockedId+'"]';assert(await run(summaryHas(locked,md(day(13)))),'first remaining plan is on '+day(13));
 const chip=()=>run('(()=>{const c=document.querySelector('+JSON.stringify(locked)+').cloneNode(true);c.querySelectorAll("dialog").forEach(e=>e.remove());return c.innerText.match(/\\d+\\/\\d+명 참석/)?.[0];})()');
 const chipBefore=await chip();
 await pick(locked);await touchText(desk?'참석자 명단 바꾸기 ›':'참석자 명단',locked+' button');await wait('!!document.querySelector("dialog[open] [data-attendance-member]")');
 for(const width of [320,390,1280]){await viewport(width,844);await layout('attendance editor');if(width===390)await shot('attendance-390.png');}await viewport(390,844);
 const baseRow=await run('(()=>{const li=[...document.querySelectorAll("dialog[open] [data-attendance-member]")].find(li=>li.querySelector("b").innerText==="테스트 베이스");return li?li.dataset.attendanceMember:null;})()');assert(!!baseRow,'attendance lists the current members');
 const row='dialog[open] [data-attendance-member="'+baseRow+'"]',baseAttending=await run('document.querySelector('+JSON.stringify(row+' [role=radio]')+').getAttribute("aria-checked")==="true"');
 await touchText(baseAttending?'불참':'참석',row+' button');await wait('document.querySelector("dialog[open]").innerText.includes("1명 바뀜")');assert(await run('document.querySelector('+JSON.stringify(row)+').innerText.includes("바뀜")'),'changed member is marked before saving');
 await touchText('저장','dialog[open] button');await wait('(document.querySelector("dialog[open] [role=status]")?.innerText??"").includes("참석자를 저장했어요")');await wait('(()=>{const c=document.querySelector('+JSON.stringify(locked)+').cloneNode(true);c.querySelectorAll("dialog").forEach(e=>e.remove());return !c.innerText.includes('+JSON.stringify(chipBefore)+');})()');assert(true,'leader saves attendance and the card count changes ('+chipBefore+' → '+(await chip())+')');
 await touchText('되돌리기','dialog[open] button');await wait('(()=>{const c=document.querySelector('+JSON.stringify(locked)+').cloneNode(true);c.querySelectorAll("dialog").forEach(e=>e.remove());return c.innerText.includes('+JSON.stringify(chipBefore)+');})()');assert(true,'attendance undo restores '+chipBefore);
 if(baseAttending){await touchText('불참',row+' button');await touchText('저장','dialog[open] button');await wait('(document.querySelector("dialog[open] [role=status]")?.innerText??"").includes("참석자를 저장했어요")');}
 assert(await run('document.querySelector('+JSON.stringify(row+' [role=radio]:last-child')+').getAttribute("aria-checked")==="true"'),'테스트 베이스 marked absent for the member lock check');
 await closeSheet();
 await go('/schedule','가능한 날');await showMonth(cal,day(13));const leaderPlanState=await cellState(day(13));await toggleDay(day(13));
 assert((await cellState(day(13)))===leaderPlanState&&(await panelText()).includes('참석자 명단에서 바꿔요')&&(await panelText()).includes('바뀐 날짜 없음'),'leader cannot change a plan day in the calendar and is pointed to attendance');
 await go('/plans','합주 계획');await openEdit(locked);await set('dialog[open] select[name=starts_at]','19:00');await set('dialog[open] select[name=ends_at]','21:30');await savePlanEdit(locked,'오후 7:00 – 9:30');
 await openEdit(locked);await set('dialog[open] select[name=ends_at]','19:00');assert(await run('document.querySelector("dialog[open]").innerText.includes("시작과 끝 시간이 같아요")&&[...document.querySelectorAll("dialog[open] button")].find(b=>b.innerText.trim()==="계획 수정 저장").disabled'),'equal start and end time cannot be saved');await closeSheet();

 // Songs: add from the sheet, one-tap voting in the list, vote/withdraw/recast in detail.
 await go('/songs','투표로 함께');await touchText('곡 추가');await wait('!!document.querySelector("dialog[open]")');await set('dialog[open] input[name=title]','Mobile candidate '+'X'.repeat(103));await set('dialog[open] input[name=artist]','Browser QA');await touchText('후보곡 올리기','dialog[open] button');await wait('document.body.innerText.includes("후보곡을 추가했습니다.")');await closeSheet();
 for(const width of [320,390,430,844]){await viewport(width,width===844?390:844);await layout('long title songs');}await viewport(390,844);
 assert(!(await run('!!document.querySelector("main select[name=difficulty]")')),'list has no difficulty editors');
 assert((await run('document.querySelectorAll("form[data-vote-editor]").length'))===(await run('[...document.querySelectorAll("[data-song-id]")].filter(e=>e.innerText.includes("미투표")).length')),'one-tap voting only on songs I have not voted on');
 await shot('song-list-390.png');
 const songLink=await run('document.querySelector("[data-song-id] a").getAttribute("href")');
 assert(!(await run('document.body.innerText.includes("파트별 난이도")')),'disabled feature hides difficulty on song detail');
 await go('/settings/band','멤버와 설정');await touchText('실력 기능 켜기');await wait('!!document.querySelector("select[name=skill]")');await go(songLink,'파트별 난이도');
 await set('form:has(input[name=expected_version]) select','3');await touch('form:has(input[name=expected_version]) button');await wait('document.body.innerText.includes("난이도를 저장했어요")');assert(!(await run('/Difficulty saved|마지막 수정/.test(document.body.innerText)')),'difficulty save says it in Korean without an edit-history line');
 await touchText('반대','form[data-vote-editor] button');await wait('document.body.innerText.includes("반대로 저장됨")&&!!document.querySelector("form[data-vote-editor] textarea[name=reason]")');assert(await run('!document.querySelector("form[data-vote-editor] textarea[name=reason]").required'),'반대 saves at once without a reason');
 await set('form[data-vote-editor] textarea[name=reason]','Mobile no reason');await touchText('사유 저장','form[data-vote-editor] button');await wait('document.body.innerText.includes("반대와 사유를 저장했어요")&&document.body.innerText.includes("Mobile no reason")');assert(true,'difficulty and persistent vote save without a round; optional reason added afterwards');
 await touchText('내 투표 취소');await wait('document.body.innerText.includes("아직 안 함")');assert(true,'own vote withdrawn from song detail');
 await touchText('찬성','form[data-vote-editor] button');await wait('document.body.innerText.includes("찬성으로 저장됨")');assert(true,'vote can be recast after withdrawal');
 await go('/settings/band','멤버와 설정');await touchText('실력 기능 끄기');await wait('!document.querySelector("select[name=skill]")');

 // Ordinary member, newcomer and leader views.
 await logout();await enter('테스트 베이스','246810');await go('/plans','합주 계획');assert(!(await run("document.body.innerText.includes('계획 수정')||document.body.innerText.includes('새 합주 정하기')||document.body.innerText.includes('계획 삭제')")),'ordinary member cannot edit/delete/confirm plans');
 await go('/schedule','가능한 날');await ensureSaved(day(28),false);await ensureSaved(day(28),true);assert(true,'ordinary member changes own dates immediately');
 await showMonth(cal,day(13));assert((await cellState(day(13)))==='none','leader-marked absence shows in the member calendar');await toggleDay(day(13));
 assert((await cellState(day(13)))==='none'&&(await panelText()).includes('직접 바꿀 수 없어요')&&!(await run('!!document.querySelector('+JSON.stringify(cal+' [data-state=adding],'+cal+' [data-state=removing]')+')')),'member cannot change a confirmed day (nothing staged)');
 const memberPlanDays=await run('[...document.querySelectorAll('+JSON.stringify(cal+' [data-plan]')+')].map(e=>e.dataset.day)');
 await touch('main button[aria-haspopup=dialog]');await wait('!!document.querySelector("dialog[open]")');assert(await run('!'+JSON.stringify(memberPlanDays)+'.some(d=>document.querySelector(`[data-remove-date="${d}"]`))'),'saved list offers no removal on plan days');await closeSheet();
 await go('/songs','투표로 함께');await touchText('곡 추가');await wait('!!document.querySelector("dialog[open]")');await set('dialog[open] input[name=title]','QA uploader song');await set('dialog[open] input[name=artist]','QA');await touchText('후보곡 올리기','dialog[open] button');await wait('document.body.innerText.includes("후보곡을 추가했습니다.")');await closeSheet();
 const upLink=await run(`[...document.querySelectorAll('[data-song-id] a')].find(e=>e.textContent.startsWith('QA uploader song'))?.getAttribute('href')`);assert(!!upLink,'member uploads a candidate');
 await go(upLink,'올렸어요');assert(await run('document.body.innerText.includes("내가")&&document.body.innerText.includes("곡 정보 수정")&&!document.body.innerText.includes("이 곡 확정하기")'),'uploader sees edit but not confirm');
 await touchText('곡 정보 수정');await wait('!!document.querySelector("dialog[open]")');await set('dialog[open] input[name=title]','QA uploader song fixed');await touchText('저장','dialog[open] button');await wait('!document.querySelector("dialog[open]")&&document.body.innerText.includes("수정됨")&&document.body.innerText.includes("QA uploader song fixed")');assert(true,'uploader edits the song and sees 수정됨');
 for(const width of [320,390,1280]){await viewport(width,844);await layout('uploader song detail');if(width===390)await shot('song-uploader-390.png');}await viewport(390,844);
 await touchText('곡 삭제');await touchText('삭제 확인','dialog[open] button');await wait('location.pathname==="/songs"&&!document.body.innerText.includes("QA uploader song")');assert(true,'uploader deletes a song nobody else voted on');
 await go(songLink,'투표 현황');assert(!(await run('document.body.innerText.includes("곡 정보 수정")||!!document.querySelector("dialog:has(input[name=confirm_delete_song])")')),'members cannot edit or delete songs others uploaded');
 await logout();await gate();await touchText('처음 참여하나요? 새 프로필 만들기','summary');await set('form:has(input[name=nickname]) input[name=nickname]','Immediate newcomer');await set('form:has(input[name=nickname]) input[name=part]','보컬');await set('form:has(input[name=nickname]) input[name=pin]','987654');await touch('form:has(input[name=nickname]) button');await wait('location.pathname==="/dashboard"');
 await go('/schedule','가능한 날');await ensureSaved(day(18),true);await go(songLink,'투표 현황');assert(await run('!!document.querySelector("form[data-vote-editor]")'),'new member votes and saves dates immediately without starting a round');assert(!(await run('document.body.innerText.includes("파트별 난이도")')),'ordinary member also sees difficulty hidden when OFF');assert(!(await run('!!document.querySelector("input[name=confirmed]")')),'ordinary member cannot confirm or remove repertoire songs');await touchText('찬성','form[data-vote-editor] button');await wait('document.body.innerText.includes("찬성으로 저장했어요.")');assert(true,'new member persistent vote accepted');
 await logout();await enter('Mobile QA Leader','112233');await go('/dashboard','멤버 6명');assert(await run('document.body.innerText.includes("다가오는 합주")&&document.body.innerText.includes("밴드장")'),'home summarizes the band for the leader');assert(true,'roster automatically changes to six current members');await go('/plans','새 합주 정하기');await createDatePlan(day(18));assert(await run("document.body.innerText.includes('6/6명')"),'date-only plan uses new current roster despite pending song votes');await go('/settings/band','멤버와 설정');assert(!(await run("document.body.innerText.includes('회차')")),'member management has no manual round controls');
 await go('/schedule/recommendations','날짜 추천');await touchText('홈','nav a');await wait('location.pathname==="/dashboard"');assert(true,'recommendations return directly home');
 await go('/settings/band','멤버와 설정');
 const target=await run(`(()=>{const heading=[...document.querySelectorAll('section h2')].find(e=>e.textContent==='테스트 베이스');return heading?.closest('section').querySelector('input[name=member_id]')?.value;})()`);assert(!!target,'handoff target present');
 const transfer='form:has(input[name=confirm_transfer]):has(input[name=member_id][value="'+target+'"])';
 await open('details:has(input[name=confirm_transfer]):has(input[name=member_id][value="'+target+'"])');assert(!(await run('document.body.innerText.includes("관리자 PIN")')),'handoff collects no administrator PIN');await touch(transfer+' input[name=confirm_transfer]');await touch(transfer+' > button');await wait('document.body.innerText.includes("밴드장 권한을 넘겼습니다")');assert(!(await run('!!document.querySelector("input[name=confirm_transfer]")')),'former leader loses management controls immediately');
 await go('/plans','합주 계획');assert(await run('!document.body.innerText.includes("새 합주 정하기")&&!document.body.innerText.includes("계획 수정")&&![...document.querySelectorAll("[data-plan-id] button")].some(b=>["수정","삭제","곡 추가"].includes(b.innerText.trim()))&&[...document.querySelectorAll("[data-plan-id] button")].some(b=>b.innerText.trim()==="참석자 명단")'),'former leader loses plan editing immediately and sees the member view');await run('scrollTo(0,0)');await shot('member-plans-'+(process.env.QA_DESKTOP?1280:390)+'.png');
 await logout();await enter('테스트 베이스','246810');await go('/settings/band','멤버와 설정');assert(await run('!!document.querySelector("input[name=confirm_transfer]")'),'new leader manages without administrator unlock');await go('/plans','합주 계획');assert((await planCount())===5,'handoff preserves all five confirmed plans');
 const retainedId=await run('document.querySelector("[data-plan-id]").dataset.planId');const survivor='[data-plan-id="'+retainedId+'"]';await openEdit(survivor);await pickPlanDay(day(19));await savePlanEdit(survivor,md(day(19)));assert(true,'new leader edits a retained plan');

 // Repertoire survives plan deletion and leader changes, independently of recommendation state.
 await go('/songs','투표로 함께');const chosenLink=await run(`Array.from(document.querySelectorAll('[data-song-id] a')).find(e=>e.textContent.startsWith('Mobile candidate'))?.getAttribute('href')`);assert(!!chosenLink,'unvoted candidate available for explicit leader decision');
 await go(chosenLink,'이 곡 확정하기');await touchText('이 곡 확정하기');await wait('document.body.innerText.includes("확정곡에 추가했습니다")');
 await go('/songs?view=confirmed','확정곡');assert(await run('[...document.querySelectorAll("[data-song-id]")].some(e=>e.innerText.includes("Mobile candidate"))'),'decided song is separated into repertoire');
 for(const width of [320,390,1280]){await viewport(width,844);await layout('confirmed repertoire');}await viewport(390,844);
 const chosenId=chosenLink.split('/').pop();await go('/plans','합주 계획');
 await openEdit(survivor);assert(await run('!!document.querySelector('+JSON.stringify('dialog[open] [data-song-choice="'+chosenId+'"]')+')'),'leader-confirmed song selectable despite pending votes');
 await touch('dialog[open] [data-song-choice="'+chosenId+'"]');assert(await run('(()=>{const d=document.querySelector("dialog[open]").getBoundingClientRect();return [...document.querySelectorAll("dialog[open] [data-song-choice]")].every(b=>b.getBoundingClientRect().right<=d.right+1);})()'),'long song chips stay inside the plan sheet');await savePlanEdit(survivor,'Mobile candidate');
 await go(chosenLink,'확정 해제');await touchText('확정 해제');await wait('document.body.innerText.includes("확정 목록에서 삭제했습니다")');
 await go('/plans','합주 계획');assert(await run(summaryHas(survivor,'Mobile candidate')),'removing repertoire song preserves existing plan snapshot');
 await go(chosenLink,'이 곡 확정하기');await touchText('이 곡 확정하기');await wait('document.body.innerText.includes("확정곡에 추가했습니다")');
 await go('/plans','합주 계획');await deletePlan(survivor);
 await touchText('새 합주 정하기');await wait('!!document.querySelector("dialog[open]")');assert(await run('!!document.querySelector('+JSON.stringify('dialog[open] [data-song-choice="'+chosenId+'"]')+')'),'deleting rehearsal leaves confirmed song available for a replacement plan');await closeSheet();
 await go('/settings/band','멤버와 설정');const removal=await run(`Array.from(document.querySelectorAll('section h2')).find(e=>e.textContent==='Immediate newcomer')?.closest('section').querySelector('dialog input[name=member_id]')?.value`);assert(!!removal,'member removal target exists');
 const removalDialog='dialog:has(input[name=member_id][value="'+removal+'"])';
 await run('document.querySelector('+JSON.stringify(removalDialog)+').parentElement.querySelector("button").click()');await wait('document.querySelector('+JSON.stringify(removalDialog)+').open');assert(await run('document.querySelector('+JSON.stringify(removalDialog)+').innerText.includes("Immediate newcomer님을 내보내겠습니까?")'),'removal requires named confirmation popup');
 for(const width of [320,390,1280]){await viewport(width,844);await layout('member removal confirmation');await writeFile(resolve(artifacts,'remove-member-'+width+'.png'),Buffer.from((await cmd('Page.captureScreenshot',{format:'png'})).data,'base64'));}await viewport(390,844);
 await touchText('취소');assert(!(await run('document.querySelector('+JSON.stringify(removalDialog)+').open')),'cancel closes removal popup');assert(await run('document.body.innerText.includes("Immediate newcomer")'),'cancel leaves member active');
 await run('document.querySelector('+JSON.stringify(removalDialog)+').parentElement.querySelector("button").click()');await wait('document.querySelector('+JSON.stringify(removalDialog)+').open');await touchText('내보내기 확인');await wait('!document.querySelector('+JSON.stringify(removalDialog)+')');assert(true,'member is removed only after second confirmation');
 await go('/dashboard','멤버 5명');assert(true,'home reflects removed member immediately');

 // Switchable single-band profile/PIN start, without a separate entry click.
 await go('/settings/band','사이트 시작 화면');await touchText('프로필 시작 화면 켜기');await wait('document.body.innerText.includes("현재: 프로필 선택·PIN 입력")');assert(true,'leader enables profile start from settings');
 async function directLogout(){await go('/settings/profile','내 정보');await touchText('로그아웃 · 프로필 바꾸기');await wait('location.pathname==="/login/member"&&!!document.querySelector("select[name=member]")');}
 async function directLogin(){const id=await run(`Array.from(document.querySelectorAll('select[name=member] option')).find(e=>e.textContent.includes('테스트 베이스'))?.value`);await fill('member',id);await fill('pin','246810');await touchText('내 프로필로 로그인');await wait('location.pathname==="/dashboard"');}
 await directLogout();await go('/','내 프로필');assert(await run('location.pathname==="/login/member"&&!document.querySelector("input[name=password],input[name=code]")'),'site root directly renders profile and PIN with no entry click');
 for(const width of [320,390,1280]){await viewport(width,844);await layout('direct profile PIN start');await writeFile(resolve(artifacts,'direct-entry-'+width+'.png'),Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));}await viewport(390,844);
 const directTarget=await run(`Array.from(document.querySelectorAll('select[name=member] option')).find(e=>e.textContent.includes('테스트 베이스'))?.value`);await fill('member',directTarget);await fill('pin','000000');await touchText('내 프로필로 로그인');await wait('document.body.innerText.includes("개인 PIN을 확인")');assert(await run('location.pathname==="/login/member"'),'direct start rejects incorrect personal PIN');await directLogin();assert(true,'direct start logs into canonical leader with personal PIN only');
 await directLogout();await touchText('처음 참여하나요? 새 프로필 만들기','summary');await set('form:has(input[name=nickname]) input[name=nickname]','Direct newcomer');await set('form:has(input[name=nickname]) input[name=part]','보컬');await set('form:has(input[name=nickname]) input[name=pin]','654321');await touch('form:has(input[name=nickname]) button');await wait('location.pathname==="/dashboard"');assert(true,'direct start creates normal member through profile/PIN form');
 await go('/settings/band','멤버와 설정');assert(!(await run('document.body.innerText.includes("프로필 시작 화면 끄기")')),'ordinary member cannot change start mode');
 await directLogout();await directLogin();await go('/settings/band','사이트 시작 화면');await touchText('프로필 시작 화면 끄기');await wait('document.body.innerText.includes("현재: 밴드 코드·공용 비밀번호 입력")');assert(true,'leader restores code/password start');
 await logout();await go('/login/member?direct=1','우리 밴드로 접속');assert(await run('!!document.querySelector("input[name=password],input[name=code]")'),'disabled direct start returns to preserved standard login');
}


export async function songDeletionWorkflow({run,go,touchText,wait,assert,layout,viewport,cmd,artifacts,writeFile,resolve}){
 async function touch(selector){await run(`document.querySelector(${JSON.stringify(selector)}).click()`);await new Promise(r=>setTimeout(r,600));}
 await go('/songs','투표로 함께');const href=await run('document.querySelector("[data-song-id] a").getAttribute("href")'),id=href.split('/').pop();
 await go(href,'이 곡 확정하기');await touchText('이 곡 확정하기');await wait('document.body.innerText.includes("확정곡에 추가했습니다")');
 assert(await run('!document.querySelector("form[data-vote-editor]")&&!document.body.innerText.includes("투표 현황")'),'confirmed detail has no voting requirement');
 await go('/songs?view=unvoted','미투표');assert(!(await run('!!document.querySelector('+JSON.stringify('[data-song-id="'+id+'"]')+')')),'confirmed song absent from pending-vote list');
 await go('/plans','새 합주 정하기');await touchText('새 합주 정하기');await wait('!!document.querySelector("dialog[open]")');
 await touch('dialog[open] fieldset label input');await touch('dialog[open] [data-song-choice="'+id+'"]');
 await run('(()=>{const e=document.querySelector("dialog[open] input[name=location]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,"QA 장소");e.dispatchEvent(new Event("input",{bubbles:true}));const c=document.querySelector("dialog[open] input[type=checkbox]");if(c&&!c.checked)c.click();})()');
 await touchText('이 날로 확정하기','dialog[open] button');await wait('document.querySelectorAll("[data-plan-id]:not([data-plan-detail])").length===1');assert(true,'confirmed song saved in plan without new votes');
 await go('/dashboard','QA 장소');assert(await run('document.body.innerText.indexOf("다가오는 합주")<document.body.innerText.indexOf("QA 장소")'),'home prioritizes upcoming rehearsal and venue');
 for(const width of [390,1280]){await viewport(width,844);await layout('upcoming rehearsal with venue');await writeFile(resolve(artifacts,'upcoming-venue-'+width+'.png'),Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));}await viewport(390,844);
 const setLocation=v=>run('(()=>{const e=document.querySelector("dialog[open] input[name=location]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,'+JSON.stringify(v)+');e.dispatchEvent(new Event("input",{bubbles:true}));})()');
 await go('/plans','합주 계획');
 await touchText('수정','[data-plan-id] button');await wait('!!document.querySelector("dialog[open]")');await setLocation('QA 장소 수정');await touchText('계획 수정 저장','dialog[open] button');await wait('!document.querySelector("dialog[open]")&&document.querySelector("[data-plan-id]").innerText.includes("QA 장소 수정")');assert(true,'rehearsal venue editable in place');
 await touchText('수정','[data-plan-id] button');await wait('!!document.querySelector("dialog[open]")');await setLocation('');await touchText('계획 수정 저장','dialog[open] button');await wait('!document.querySelector("dialog[open]")&&document.querySelector("[data-plan-id]").innerText.includes("장소 미정")');assert(true,'rehearsal venue can be cleared');
 await go(href,'곡 삭제');await touchText('곡 삭제');await wait('!!document.querySelector("dialog[open]")');
 for(const width of [320,390,1280]){await viewport(width,844);await layout('song deletion dialog');await writeFile(resolve(artifacts,'delete-song-'+width+'.png'),Buffer.from((await cmd('Page.captureScreenshot',{format:'png'})).data,'base64'));}await viewport(390,844);
 assert(await run('document.querySelector("dialog[open]").innerText.includes("[테스트 A]")'),'deletion confirmation identifies target song');
 await touchText('취소','dialog[open] button');assert(await run('!document.querySelector("dialog[open]")&&!!document.querySelector("[data-song-id]")'),'cancel keeps song');
 await touchText('곡 삭제');await touchText('삭제 확인','dialog[open] button');await wait('location.pathname==="/songs"&&!document.body.innerText.includes("[테스트 A]")');assert(true,'confirmed deletion returns to list and removes song');
 await go('/plans','합주 계획');assert(await run('document.querySelector("[data-plan-id]").innerText.includes("[테스트 A]")'),'saved plan retains deleted song snapshot');
}
