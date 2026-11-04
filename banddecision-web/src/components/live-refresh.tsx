'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
export function LiveRefresh(){const router=useRouter();useEffect(()=>{let client;try{client=createClient();}catch{return;}const channel=client.channel('banddecision-live').on('postgres_changes',{event:'*',schema:'public'},()=>router.refresh()).subscribe();return()=>{void client.removeChannel(channel);};},[router]);return null;}
