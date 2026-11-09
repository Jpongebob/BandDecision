'use client';
import {useState} from 'react';
import {CalendarPlus,Share2} from 'lucide-react';
import {Sheet} from '@/components/sheet';
import {googleCalendarUrl,planIcs,planShareText,type SharePlan} from '@/lib/calendar-export';
export {planIcs,planShareText} from '@/lib/calendar-export';
export type {SharePlan} from '@/lib/calendar-export';

const button='inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-3 text-[15px] font-semibold text-ink disabled:opacity-50';
export function PlanShareButtons({plan}:{plan:SharePlan}){
 const[note,setNote]=useState(''),[calendarNote,setCalendarNote]=useState('');
 async function share(){
  const text=planShareText(plan),url=location.origin+'/plans';
  try{if(navigator.share){await navigator.share({title:'합주 안내',text,url});return;}await navigator.clipboard.writeText(text+'\n'+url);setNote('안내 문구를 복사했어요');}
  catch(error){if((error as Error)?.name!=='AbortError')setNote('공유하지 못했어요. 다시 시도해 주세요.');}
 }
 async function shareFile(){
  setCalendarNote('');
  try{const file=new File([planIcs(plan)],'합주-'+plan.date+'.ics',{type:'text/calendar'});
   if(!navigator.share||!navigator.canShare?.({files:[file]})){setCalendarNote('이 브라우저에서는 일정 파일 공유를 지원하지 않아요. Safari에서 열거나 Google 캘린더를 선택해 주세요.');return;}
   await navigator.share({files:[file],title:'합주 일정'});setCalendarNote('Mail로 보냈다면 받은 첨부파일을 Apple 기본 Mail 앱에서 열어 추가하세요.');}
  catch(error){if((error as Error)?.name!=='AbortError')setCalendarNote('파일을 공유하지 못했어요. Safari에서 다시 열어 주세요.');}
 }
 return <div className="flex flex-col gap-1.5"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={share} className={button}><Share2 size={16} aria-hidden="true"/>공유하기</button>
 <Sheet title="캘린더에 추가" trigger={<><CalendarPlus size={16} aria-hidden="true"/>캘린더에 추가</>} triggerClassName={button}>
 <div className="flex flex-col gap-3"><p className="text-[15px] text-ink-2">사용하는 캘린더를 선택해 주세요. 추가 화면에서 저장해야 일정이 등록돼요.</p>
 <a href={googleCalendarUrl(plan)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={button}>Google 캘린더에 추가</a>
 <a href={'/api/plans/'+encodeURIComponent(plan.id)+'/calendar.ics'} className={button}>Apple·기타 캘린더로 열기</a>
 <p className="text-sm leading-6 text-muted">아이폰 Chrome에서 파일만 다운로드되면 이 웹사이트를 Safari로 열어 다시 시도해 주세요. Safari에서도 추가 화면이 안 나오면 일정 파일을 본인에게 메일로 보내고 Apple 기본 Mail 앱에서 첨부파일을 열어 추가할 수 있어요.</p>
 <button type="button" onClick={shareFile} className={button}>일정 파일 공유 · Mail로 보내기</button>
 {calendarNote&&<p role="status" className="text-sm text-ink-2">{calendarNote}</p>}</div></Sheet>
 </div>{note&&<p role="status" className="text-sm font-semibold text-plan-ink">{note}</p>}</div>;
}
