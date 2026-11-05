import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
const schema=z.object({band_name:z.string(),profiles:z.array(z.object({id:z.uuid(),nickname:z.string(),part:z.string(),role:z.string(),pin_ready:z.boolean()}))});
// Public, intentionally minimal profile list only when the leader enables the start page.
export async function loadDefaultBandEntry(db:SupabaseClient){
 const{data,error}=await db.rpc('default_band_entry_context');
 if(error){if(error.code==='PGRST202'||error.code==='42883')return null;throw new Error('DATA_LOAD_FAILED');}
 if(data===null)return null;
 const parsed=schema.safeParse(data);if(!parsed.success)throw new Error('DATA_LOAD_FAILED');return parsed.data;
}
