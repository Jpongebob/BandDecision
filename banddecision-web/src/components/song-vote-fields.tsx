'use client';
import {useState} from 'react';
export function SongVoteFields({choice='yes',reason=''}:{choice?:'yes'|'no';reason?:string|null}){
 const[selected,setSelected]=useState(choice);
 return <div className="grid gap-3"><label className="text-sm">찬반<select name="choice" value={selected} onChange={e=>setSelected(e.target.value as 'yes'|'no')} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="yes">찬성</option><option value="no">반대</option></select></label>
 {selected==='no'&&<label className="text-sm">반대 사유 (필수)<textarea name="reason" defaultValue={reason??''} required maxLength={300} className="mt-1 min-h-16 w-full rounded-xl border px-3 py-2"/></label>}</div>;
}
