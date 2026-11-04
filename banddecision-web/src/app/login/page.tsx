import { AuthForm } from '@/components/auth-form'; import { signInAction } from '@/app/actions';
export const instant = false;
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){const{next}=await searchParams;return <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-4 py-10"><AuthForm action={signInAction} mode="login" next={next}/></main>}
