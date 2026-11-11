import {expect,it} from 'vitest';
import {googleCalendarUrl,planIcs,type SharePlan} from '../src/lib/calendar-export';
const plan:SharePlan={id:'p',date:'2026-12-31',start:'22:00:00',end:'00:30:00',songs:['한글, 곡; 제목'],location:'서울 합주실',memo:'목표\r\n다음 줄',attending:3,total:5};
it('uses UTC dates for the same Seoul time, including midnight and year boundaries',()=>{
 const ics=planIcs(plan);expect(ics).toContain('DTSTART:20261231T130000Z');expect(ics).toContain('DTEND:20261231T153000Z');expect(ics).not.toContain('TZID=');
 const day=planIcs({...plan,start:'00:15',end:'02:00'});expect(day).toContain('DTSTART:20261230T151500Z');expect(day).toContain('DTEND:20261230T170000Z');
});
it('folds long Korean and emoji lines at 75 UTF-8 bytes without losing text',()=>{
 const memo='한글🎸'.repeat(500),ics=planIcs({...plan,memo});
 for(const line of ics.split('\r\n'))expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
 const unfolded=ics.replace(/\r\n[ \t]/g,'');expect(unfolded).toContain(memo);expect(unfolded).not.toContain('\uFFFD');expect(ics.endsWith('\r\n')).toBe(true);
});
it('escapes user text and normalizes all newline styles rather than injecting ICS fields',()=>{
 const ics=planIcs({...plan,memo:'a\r\nBEGIN:VEVENT\rb\nc;d,\\'}).replace(/\r\n[ \t]/g,'');
 expect(ics.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1);const I='\u2003\u2002';expect(ics).toContain('a\\n'+I+'BEGIN:VEVENT\\n'+I+'b\\n'+I+'c\\;d\\,\\\\');
});
it('uses a real Google event editor URL with equivalent times and encoded fields',()=>{
 const url=new URL(googleCalendarUrl(plan));expect(url.origin).toBe('https://calendar.google.com');expect(url.searchParams.get('action')).toBe('TEMPLATE');expect(url.searchParams.get('dates')).toBe('20261231T130000Z/20261231T153000Z');expect(url.searchParams.get('location')).toBe(plan.location);expect(url.searchParams.get('details')).toContain(plan.songs[0]);
});
