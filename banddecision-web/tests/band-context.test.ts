import { describe, expect, it, vi } from 'vitest';
import { getBandContext } from '../src/lib/band-context';

const member = { id: 'member', band_id: 'band', role: 'leader', part_label: '베이스' };
function client(memberResult: { data: unknown; error: { code?: string } | null }, bandResult = { data: { id: 'band', name: '우리 밴드' } as unknown, error: null as { code?: string } | null }) {
  const filters: [string, string, unknown][] = [];
  const from = vi.fn((table: string) => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => { filters.push([table, column, value]); return builder; }),
      maybeSingle: vi.fn(async () => table === 'band_members' ? memberResult : bandResult),
    };
    return builder;
  });
  return { from, filters };
}
type Database = Parameters<typeof getBandContext>[0];
describe('band membership loading', () => {
  it('loads a known membership and its band independently', async () => {
    const db = client({ data: member, error: null });
    expect(await getBandContext(db as unknown as Database, 'canonical-actor')).toEqual({ status: 'ready', member, band: { id: 'band', name: '우리 밴드' } });
    expect(db.filters).toContainEqual(['band_members', 'user_id', 'canonical-actor']);
    expect(db.filters).toContainEqual(['bands', 'id', 'band']);
  });
  it('only reports no band when the membership query succeeds with no row', async () => {
    const db = client({ data: null, error: null });
    expect(await getBandContext(db as unknown as Database, 'actor')).toEqual({ status: 'none' });
    expect(db.from).not.toHaveBeenCalledWith('bands');
  });
  it('never turns a membership query failure into a band creation prompt', async () => {
    const db = client({ data: null, error: { code: 'PGRST200' } });
    expect(await getBandContext(db as unknown as Database, 'actor')).toEqual({ status: 'error', code: 'PGRST200' });
  });
  it('keeps an existing membership distinct from a failed band-name query', async () => {
    const db = client({ data: member, error: null }, { data: null, error: { code: '42501' } });
    expect(await getBandContext(db as unknown as Database, 'actor')).toEqual({ status: 'error', code: '42501' });
  });
  it('reports an invisible related band as an error rather than no membership', async () => {
    const db = client({ data: member, error: null }, { data: null, error: null });
    expect(await getBandContext(db as unknown as Database, 'actor')).toEqual({ status: 'error', code: 'BAND_NOT_VISIBLE' });
  });
  it('does not expose unstructured database error contents', async () => {
    const db = client({ data: null, error: { code: '<private details>' } });
    expect(await getBandContext(db as unknown as Database, 'actor')).toEqual({ status: 'error', code: 'BAND_LOAD_FAILED' });
  });
});
