export interface Confusion { tp:number; fp:number; tn:number; fn:number; }
export function metrics(c:Confusion) {
  const div=(a:number,b:number)=>b===0?0:a/b;
  return {
    ...c,
    precision:div(c.tp,c.tp+c.fp),
    recall:div(c.tp,c.tp+c.fn),
    falsePositiveRate:div(c.fp,c.fp+c.tn),
    falseNegativeRate:div(c.fn,c.fn+c.tp),
    accuracy:div(c.tp+c.tn,c.tp+c.fp+c.tn+c.fn)
  };
}
export function percentile(xs:number[], p:number) {
  if (!xs.length) return 0;
  const s=[...xs].sort((a,b)=>a-b);
  return s[Math.min(s.length-1, Math.max(0, Math.ceil(p*s.length)-1))]!;
}
