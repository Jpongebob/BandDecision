import { AuthForm } from '@/components/auth-form'; import { signUpAction } from '@/app/actions';
export default async function SignupPage({searchParams}:{searchParams:Promise<{next?:string}>}){const{next}=await searchParams;return <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-4 py-10"><AuthForm action={signUpAction} mode="signup" next={next}/></main>}
