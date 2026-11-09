import {dayLabel,timeRangeLabel} from '@/lib/day-format';

export type SharePlan={id:string;date:string;start:string;end:string;location?:string|null;memo?:string|null;songs:string[];attending:number;total:number};
export function planShareText(p:SharePlan){
 return ['합주 안내',dayLabel(p.date)+' '+timeRangeLabel(p.start,p.end),p.location?'장소: '+p.location:'',p.attending+'/'+p.total+'명 참석',p.songs.length?'곡: '+p.songs.join(', '):'',p.memo?'메모: '+p.memo:''].filter(Boolean).join('\n');
}
function calendarTimes(p:SharePlan){
 const endDay=p.end<=p.start?new Date(Date.parse(p.date+'T00:00:00Z')+86400000).toISOString().slice(0,10):p.date;
 const stamp=(day:string,time:string)=>new Date(day+'T'+(time.length===5?time+':00':time.slice(0,8))+'+09:00').toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
 return {start:stamp(p.date,p.start),end:stamp(endDay,p.end)};
}
// RFC 5545: fold at 75 UTF-8 octets without splitting a Unicode character.
function fold(line:string){
 const encoder=new TextEncoder(),lines:string[]=[];let current='',bytes=0;
 for(const char of line){const size=encoder.encode(char).length;if(bytes+size>75){lines.push(current);current=' '+char;bytes=1+size;}else{current+=char;bytes+=size;}}
 return [...lines,current].join('\r\n');
}
export function planIcs(p:SharePlan){
 const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/[,;]/g,m=>'\\'+m);
 const{start,end}=calendarTimes(p),now=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BandDecision//KO','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+p.id+'@banddecision','DTSTAMP:'+now,'DTSTART:'+start,'DTEND:'+end,'SUMMARY:'+esc('합주'+(p.songs.length?' · '+p.songs.slice(0,3).join(', '):'')),p.location?'LOCATION:'+esc(p.location):'','DESCRIPTION:'+esc(planShareText(p)),'END:VEVENT','END:VCALENDAR'].filter(Boolean).map(fold).join('\r\n')+'\r\n';
}
export function googleCalendarUrl(p:SharePlan){
 const{start,end}=calendarTimes(p);
 const params=new URLSearchParams({action:'TEMPLATE',text:'합주',dates:start+'/'+end,ctz:'Asia/Seoul',details:planShareText(p),location:p.location??''});
 return 'https://calendar.google.com/calendar/r/eventedit?'+params.toString();
}
