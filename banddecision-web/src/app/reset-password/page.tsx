import { AuthForm } from '@/components/auth-form'; import { resetPasswordAction, updatePasswordAction } from '@/app/actions';
export const instant = false;
export default async function ResetPage({searchParams}:{searchParams:Promise<{update?:string}>}){const{update}=await searchParams;return <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-4 py-10"><AuthForm action={update==='1'?updatePasswordAction:resetPasswordAction} mode={update==='1'?'update':'reset'}/></main>}
