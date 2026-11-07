'use client';
import {useState} from 'react';
import {CalendarPlus,Share2} from 'lucide-react';
import {dayLabel,timeRangeLabel} from '@/lib/day-format';

export type SharePlan={id:string;date:string;start:string;end:string;location?:string|null;memo?:string|null;songs:string[];attending:number;total:number};
const button='inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-3 text-[15px] font-semibold text-ink disabled:opacity-50';
export function planShareText(p:SharePlan){
 return ['합주 안내',dayLabel(p.date)+' '+timeRangeLabel(p.start,p.end),p.location?'장소: '+p.location:'',p.attending+'/'+p.total+'명 참석',p.songs.length?'곡: '+p.songs.join(', '):'',p.memo?'메모: '+p.memo:''].filter(Boolean).join('\n');
}
// iCalendar text in Asia/Seoul local time; lines folded only by content, which calendar apps accept for short events.
export function planIcs(p:SharePlan){
 const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,m=>'\\'+m);
 const stamp=(time:string)=>p.date.replaceAll('-','')+'T'+time.slice(0,5).replace(':','')+'00';
 const now=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BandDecision//KO','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+p.id+'@banddecision','DTSTAMP:'+now,'DTSTART;TZID=Asia/Seoul:'+stamp(p.start),'DTEND;TZID=Asia/Seoul:'+stamp(p.end),'SUMMARY:'+esc('합주'+(p.songs.length?' · '+p.songs.slice(0,3).join(', '):'')),p.location?'LOCATION:'+esc(p.location):'','DESCRIPTION:'+esc(planShareText(p)),'END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n')+'\r\n';
}
// 공유하기 uses the phone share sheet (단톡방 등) and falls back to copying the text.
export function PlanShareButtons({plan}:{plan:SharePlan}){
 const[note,setNote]=useState('');
 async function share(){
  const text=planShareText(plan),url=location.origin+'/plans';
  try{if(navigator.share){await navigator.share({title:'합주 안내',text,url});return;}await navigator.clipboard.writeText(text+'\n'+url);setNote('안내 문구를 복사했어요');}
  catch(error){if((error as Error)?.name!=='AbortError')setNote('공유하지 못했어요. 다시 시도해 주세요.');}
 }
 function download(){
  const blob=new Blob([planIcs(plan)],{type:'text/calendar;charset=utf-8'}),href=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=href;a.download='합주-'+plan.date+'.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);
 }
 return <div className="flex flex-col gap-1.5"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={share} className={button}><Share2 size={16} aria-hidden="true" className="text-brand-ink"/>공유하기</button><button type="button" onClick={download} className={button}><CalendarPlus size={16} aria-hidden="true" className="text-brand-ink"/>캘린더에 추가</button></div>{note&&<p role="status" className="text-sm font-semibold text-plan-ink">{note}</p>}</div>;
}
