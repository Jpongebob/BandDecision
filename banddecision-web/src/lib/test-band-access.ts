// Fixtures are opt-in and may only use a disposable database on this machine.
// Enabling the flag alone must never expose fixture creation against hosted Supabase.
export function testBandsEnabled(){
 if(process.env.ENABLE_TEST_BANDS!=='true')return false;
 try{
  const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  return ['http:','https:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 }catch{return false;}
}
