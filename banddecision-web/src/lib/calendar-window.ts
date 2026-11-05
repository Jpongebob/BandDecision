// Calendar months, anchored to the injected Seoul date; no browser timezone drift.
export function twoMonthWindow(today:string){
 const date=new Date(today+'T00:00:00Z');
 const end=date.getUTCFullYear()===9999&&date.getUTCMonth()===11?'9999-12-31':new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+2,0)).toISOString().slice(0,10);
 return {firstMonth:today.slice(0,7),lastMonth:end.slice(0,7),endDate:end};
}
