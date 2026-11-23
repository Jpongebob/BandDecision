'use client';
import {useState} from 'react';
// Leader: share (or copy) a short note asking members to fill in their days for the given months.
export function AskDatesButton({months,className=''}:{months:string;className?:string}){
 const[asked,setAsked]=useState('');
 async function ask(){
  const text=months+' 합주 가능한 날을 BandDecision 일정에 입력해 주세요!\n'+location.origin+'/schedule';
  try{if(navigator.share){await navigator.share({title:'날짜 입력 부탁',text});return;}await navigator.clipboard.writeText(text);setAsked('부탁 문구를 복사했어요. 단톡방에 붙여 넣으세요.');}catch(error){if((error as Error)?.name!=='AbortError')setAsked('공유하지 못했어요. 다시 시도해 주세요.');}
 }
 return <><button type="button" onClick={ask} className={'min-h-11 rounded-[10px] border border-line-strong bg-white px-3.5 text-[15px] font-bold text-ink '+className}>날짜 입력 부탁하기</button>{asked&&<p role="status" className="text-sm font-semibold text-plan-ink">{asked}</p>}</>;
}
