// 미응답 is judged per calendar month: a member who saved at least one day in a month has answered that month.
// Past days count too, so someone who only filled in the first half of this month is not 미응답.
type Row={memberId:string;date:string};
export const monthOf=(date:string)=>date.slice(0,7);
export const monthLabel=(month:string)=>Number(month.slice(5,7))+'월';
export function answeredMonths(available:Row[]){
 const out=new Map<string,Set<string>>();
 for(const row of available){const months=out.get(row.memberId)??new Set<string>();months.add(monthOf(row.date));out.set(row.memberId,months);}
 return out;
}
export function silentIn<T extends {id:string}>(members:T[],available:Row[]|Map<string,Set<string>>,month:string){
 const answered=available instanceof Map?available:answeredMonths(available);
 return members.filter(m=>!answered.get(m.id)?.has(month));
}
