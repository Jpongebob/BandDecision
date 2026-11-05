import { cache } from 'react';
import type { createClient } from '@/lib/supabase/server';

type Database = NonNullable<Awaited<ReturnType<typeof createClient>>>;
export type ActiveMember = { id: string; band_id: string; role: string; part_label: string };
type BandContext =
  | { status: 'ready'; member: ActiveMember; band: { id: string; name: string } }
  | { status: 'none' }
  | { status: 'error'; code: string };

function safeCode(code?: string) {
  return code && /^[A-Za-z0-9_]{1,64}$/.test(code) ? code : 'BAND_LOAD_FAILED';
}
export const getActiveMember = cache(async function getActiveMember(db: Database, actorId: string) {
  return db.from('band_members').select('id,band_id,role,part_label')
    .eq('user_id', actorId).eq('status', 'active').maybeSingle();
});
export const getBandContext = cache(async function getBandContext(db: Database, actorId: string): Promise<BandContext> {
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
