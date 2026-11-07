// Korean date labels for Seoul-calendar ISO dates (YYYY-MM-DD); never depends on the browser timezone.
const weekdayFormat=new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Seoul'});
export function weekdayShort(day:string){return weekdayFormat.format(new Date(day+'T12:00:00+09:00'));}
export function dayLabel(day:string){return Number(day.slice(5,7))+'월 '+Number(day.slice(8,10))+'일 ('+weekdayShort(day)+')';}
export function shortDayLabel(day:string){return Number(day.slice(5,7))+'월 '+Number(day.slice(8,10))+'일';}
export function daysUntil(day:string,today:string){return Math.round((Date.parse(day+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);}
export function dDay(day:string,today:string){const n=daysUntil(day,today);return n===0?'D-DAY':n>0?'D-'+n:'D+'+Math.abs(n);}
// "20:00:00" → "오후 8:00"
export function clockLabel(time:string){const[h,m]=time.split(':').map(Number);const half=h<12?'오전':'오후',hour=h%12===0?12:h%12;return half+' '+hour+':'+String(m).padStart(2,'0');}
export function timeRangeLabel(start:string,end:string){return clockLabel(start)+' – '+clockLabel(end);}
