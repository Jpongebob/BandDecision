// Yes/no share of all members (the rest is the grey track: not answered yet).
export function VoteBar({yes,no,total}:{yes:number;no:number;total:number}){
 const pct=(n:number)=>total?(n/total*100).toFixed(1)+'%':'0%';
 return <span aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-surface-2"><span className="bg-[#2e9e63]" style={{width:pct(yes)}}/><span className="bg-faint" style={{width:pct(no)}}/></span>;
}
