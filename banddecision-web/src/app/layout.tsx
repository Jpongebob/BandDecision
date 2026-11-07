import type { Metadata } from 'next';
// Self-hosted Pretendard dynamic subset: the browser downloads only the Hangul ranges a page uses.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

export const metadata:Metadata={title:'BandDecision — 합주 계획을 함께 결정해요',description:'밴드 멤버와 합주 날짜와 곡을 함께 정리하는 협업 서비스입니다.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body className="min-h-screen antialiased">{children}</body></html>;}
