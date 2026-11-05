import {expect,it} from 'vitest';
import {twoMonthWindow} from '../src/lib/calendar-window';
it('uses this and next calendar month, including year/leap boundaries',()=>{
 expect(twoMonthWindow('2026-11-06')).toEqual({firstMonth:'2026-11',lastMonth:'2026-12',endDate:'2026-12-31'});
 expect(twoMonthWindow('2026-12-31').endDate).toBe('2027-01-31');
 expect(twoMonthWindow('2028-01-31').endDate).toBe('2028-02-29');
});
