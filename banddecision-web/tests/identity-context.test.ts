import { describe, expect, it, vi } from 'vitest';
import { getActiveMember, getBandContext, type BandSnapshot } from '../src/lib/band-context';
type Db = Parameters<typeof getBandContext>[0];
const snapshot: BandSnapshot = {
 actorId: 'actor', member: { id:'member',band_id:'band',role:'leader',part_label:'기타' },
 band: {id:'band',name:'우리 밴드'},
};
describe('hydrated identity context', () => {
 it('avoids both serial database queries when the verified identity already has context', async () => {
   const from=vi.fn(); const db={from} as unknown as Db;
   expect(await getBandContext(db,'actor',snapshot)).toEqual({status:'ready',member:snapshot.member,band:snapshot.band});
   expect((await getActiveMember(db,'actor',snapshot)).data).toEqual(snapshot.member);
   expect(from).not.toHaveBeenCalled();
 });
 it('does not substitute another actor snapshot', async () => {
   const from=vi.fn(); const db={from} as unknown as Db;
   expect(await getBandContext(db,'other',snapshot)).toEqual({status:'error',code:'BAND_CONTEXT_INVALID'});
   expect((await getActiveMember(db,'other',snapshot)).error?.code).toBe('BAND_CONTEXT_INVALID');
   expect(from).not.toHaveBeenCalled();
 });
 it('rejects an inconsistent membership/band pair', async () => {
   expect(await getBandContext({} as Db,'actor',{...snapshot,band:{id:'other',name:'Other'}})).toMatchObject({status:'error'});
 });
 it('requires both membership and band to be null for the no-band snapshot', async () => {
   expect(await getBandContext({} as Db,'actor',{actorId:'actor',member:null,band:null})).toEqual({status:'none'});
   expect(await getBandContext({} as Db,'actor',{...snapshot,member:null})).toMatchObject({status:'error'});
 });
});
