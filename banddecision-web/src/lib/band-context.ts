import { cache } from 'react';
import type { createClient } from '@/lib/supabase/server';

type Database = NonNullable<Awaited<ReturnType<typeof createClient>>>;
export type BandSnapshot = { actorId: string; member: ActiveMember | null; band: { id: string; name: string } | null };
export type ActiveMember = { id: string; band_id: string; role: string; part_label: string };
type BandContext =
  | { status: 'ready'; member: ActiveMember; band: { id: string; name: string } }
  | { status: 'none' }
  | { status: 'error'; code: string };

function safeCode(code?: string) {
  return code && /^[A-Za-z0-9_]{1,64}$/.test(code) ? code : 'BAND_LOAD_FAILED';
}
export const getActiveMember = cache(async function getActiveMember(db: Database, actorId: string, snapshot?: BandSnapshot) {
  if (snapshot) {
    if (snapshot.actorId !== actorId || Boolean(snapshot.member) !== Boolean(snapshot.band) || (snapshot.member && snapshot.member.band_id !== snapshot.band?.id))
      return { data: null, error: { code: 'BAND_CONTEXT_INVALID' } };
    return { data: snapshot.member, error: null };
  }
  return db.from('band_members').select('id,band_id,role,part_label')
    .eq('user_id', actorId).eq('status', 'active').maybeSingle();
});
export const getBandContext = cache(async function getBandContext(db: Database, actorId: string, snapshot?: BandSnapshot): Promise<BandContext> {
  if (snapshot) {
    if (snapshot.actorId !== actorId || Boolean(snapshot.member) !== Boolean(snapshot.band) || (snapshot.member && snapshot.member.band_id !== snapshot.band?.id))
      return { status: 'error', code: 'BAND_CONTEXT_INVALID' };
    return snapshot.member && snapshot.band
      ? { status: 'ready', member: snapshot.member, band: snapshot.band } : { status: 'none' };
  }
  // Keep membership separate from embedded relationship lookups: a join/cache failure is not "not a member".
  const { data: member, error: memberError } = await getActiveMember(db, actorId);
  if (memberError) return { status: 'error', code: safeCode(memberError.code) };
  if (!member) return { status: 'none' };
  const { data: band, error: bandError } = await db.from('bands')
    .select('id,name').eq('id', member.band_id).maybeSingle();
  if (bandError) return { status: 'error', code: safeCode(bandError.code) };
  if (!band) return { status: 'error', code: 'BAND_NOT_VISIBLE' };
  return { status: 'ready', member, band };
});
