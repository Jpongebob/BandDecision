import { describe,expect,it } from 'vitest';
import { parseUnavailableText } from '../src/services/date-parser';
const start='2026-11-04',rs='2026-11-04',re='2027-01-02';
describe('unavailability parser',()=>{
 it('expands a month boundary range including both ends',()=>expect(parseUnavailableText('11.29~12.2',start,rs,re,'일정').dates).toEqual(['2026-11-29','2026-11-30','2026-12-01','2026-12-02']));
 it('expands a year boundary range including the next-year dates',()=>expect(parseUnavailableText('12.29~1.2','2026-12-01','2026-12-01','2027-01-29','개인 일정').dates).toEqual(['2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02']));
 it('interprets a past yearless date as next year and warns outside this round',()=>expect(parseUnavailableText('11.3',start,rs,re,'일정').outsideRound).toEqual(['2027-11-03']));
 it('removes duplicate dates',()=>expect(parseUnavailableText('11.29, 11.29',start,rs,re,'일정').duplicatesRemoved).toBe(1));
 it('rejects impossible dates and reversed ranges',()=>{expect(()=>parseUnavailableText('11.31',start,rs,re,'일정')).toThrow();expect(()=>parseUnavailableText('2026-12-02~2026-11-29',start,rs,re,'일정')).toThrow();});
 it('parses two comma-separated future dates',()=>expect(parseUnavailableText('11.29, 12.2',start,rs,re,'일정').dates).toEqual(['2026-11-29','2026-12-02']));
 it('supports an explicit empty submission',()=>expect(parseUnavailableText('없음',start,rs,re,'').dates).toEqual([]));
});
