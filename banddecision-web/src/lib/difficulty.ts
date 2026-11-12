// One number per song: the average of the band parts that have a difficulty (1–5).
export function averageDifficulty(difficulties:Record<string,number>,partKeys:string[]):number|null{
 const values=[...new Set(partKeys)].map(k=>difficulties[k]).filter((v):v is number=>typeof v==='number');
 return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
}
export function difficultyAverageLabel(difficulties:Record<string,number>,partKeys:string[]){
 const avg=averageDifficulty(difficulties,partKeys);
 return avg===null?'난이도 미입력':'평균 난이도 '+avg.toFixed(1);
}
