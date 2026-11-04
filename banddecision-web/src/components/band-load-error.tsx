'use client';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function BandLoadError({ code }: { code: string }) {
  const router = useRouter();
  return <Card role="alert"><CardTitle>가입한 밴드 정보를 불러오지 못했습니다</CardTitle>
    <p className="mt-2 text-sm text-slate-600">밴드 조회 중 오류가 발생했습니다. 새로고침하거나 잠시 후 다시 시도해 주세요.</p>
    <p className="mt-2 text-xs text-slate-500">오류 코드: {code}</p>
    <Button onClick={() => router.refresh()} className="mt-4">다시 불러오기</Button>
  </Card>;
}
