'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';

export function PageNavigation() {
  const path = usePathname();
  const router = useRouter();
  if (path === '/dashboard') return null;
  const parent = path.startsWith('/songs/') ? '/songs'
    : path.startsWith('/schedule/') ? '/schedule'
    : path.startsWith('/settings/') ? '/settings' : '/dashboard';
  return <nav aria-label="화면 이동" className="mb-5 flex items-center gap-4 text-sm font-semibold text-blue-700">
    <button type="button" onClick={() => {
      router.push(parent);
    }} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 hover:bg-blue-50">
      <ArrowLeft size={16}/> 뒤로
    </button>
    <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 hover:bg-blue-50"><Home size={16}/> 홈으로</Link>
  </nav>;
}
