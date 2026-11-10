'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
export default function ProtectedError({reset}:{error:Error & {digest?:string};reset:()=>void}) {
 const router=useRouter();
 return <section role="alert" className="rounded-2xl border border-rose-200 bg-white p-6">
  <h1 className="text-xl font-bold">화면 데이터를 불러오지 못했습니다</h1>
  <p className="mt-3 text-sm leading-6 text-slate-600">일부 정보를 확인하지 못해 추천과 확정 화면을 표시하지 않았습니다. 연결을 확인하고 다시 불러와 주세요.</p>
  <div className="mt-5 flex gap-4"><button type="button" className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700" onClick={()=>{reset();router.refresh();}}>다시 불러오기</button><Link href="/dashboard" className="px-3 py-3 text-sm font-semibold text-blue-700">홈으로</Link></div>
 </section>;
}
