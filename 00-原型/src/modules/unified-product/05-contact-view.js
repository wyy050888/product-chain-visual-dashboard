// 条形图按进线条数计算构成；各类进线率仍以同期销量为分母。
function upContactParts(m){
 const total=m.current.contacts;
 return [['quality','品质问题进线','qualityContacts','qualityContactRate'],['experience','体验问题进线','experienceContacts','experienceContactRate']].map(([key,name,countKey,rateKey])=>{
  const count=m.current[countKey],rate=m.current[rateKey],previous=m.previous[rateKey],change=rpRiskRateComparison(rate,previous);
  return {key,name,count,share:Number.isFinite(count)&&Number.isFinite(total)?total>0?count/total*100:count===0?0:null:null,
   rate,comparison:change.target,tone:change.targetTone};
 });
}
function upContactEvaluationView(m){
 const contact={key:'contact',name:'进线率',value:upPercent(m.current.contactRate),
  ...rpRiskRateComparison(m.current.contactRate,m.previous.contactRate)};
 const bad={key:'bad',name:'差评率',value:upPercent(m.current.badRate),...rpRiskRateComparison(m.current.badRate,m.previous.badRate)};
 const parts=upContactParts(m),data=({key,name,count,share})=>`data-up-contact-detail="${esc(JSON.stringify({key,name,count,share}))}"`;
 // 两个分段共用一份构成提示，仅展示条数和占比。
 const bar=`<span class="up-contact-bar" role="group" aria-label="进线问题构成">${parts.map(part=>`<button type="button" class="${part.key}" style="width:${part.share??0}%" ${data(part)} aria-label="${esc(part.name)}：${Number.isFinite(part.count)?fmt(part.count)+'条':'—'}，占比${upPercent(part.share)}"></button>`).join('')}</span>`;
 const total=upQualityMetric({...contact,headingMarkup:bar});
 return total+upQualityMetric(bad);
}
