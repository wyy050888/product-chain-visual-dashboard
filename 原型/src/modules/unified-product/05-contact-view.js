// 条形图按进线条数计算构成；各类进线率仍以同期销量为分母。
function upContactParts(m){
 const total=m.current.contacts;
 return [['quality','品质问题进线','qualityContacts','qualityContactRate'],['experience','体验问题进线','experienceContacts','experienceContactRate']].map(([key,name,countKey,rateKey])=>{
  const count=m.current[countKey],rate=m.current[rateKey],previous=m.previous[rateKey];
  return {key,name,count,share:Number.isFinite(count)&&Number.isFinite(total)?total>0?count/total*100:count===0?0:null:null,
   rate,comparison:qrbContactDeltaText(qrbRateDelta(rate,previous)),tone:rpQualityChangeTone(rate,previous)};
 });
}
function upContactEvaluationView(m){
 const contact={key:'contact',name:'进线率',value:upPercent(m.current.contactRate),
  target:qrbContactDeltaText(qrbRateDelta(m.current.contactRate,m.previous.contactRate)),targetTone:rpQualityChangeTone(m.current.contactRate,m.previous.contactRate)};
 const bad={key:'bad',name:'差评率',value:upPercent(m.current.badRate),target:rpQualityChange(m.current.badRate,m.previous.badRate),targetTone:rpQualityChangeTone(m.current.badRate,m.previous.badRate)};
 const parts=upContactParts(m),data=part=>`data-up-contact-detail="${esc(JSON.stringify(part))}"`;
 const bar=`<div class="up-contact-bar" aria-hidden="true">${parts.map(part=>`<span class="${part.key}" style="width:${part.share??0}%" ${data(part)}></span>`).join('')}</div>`;
 const legend=`<div class="up-contact-legend" role="group" aria-label="进线问题构成">${parts.map(part=>`<button type="button" class="${part.key}" ${data(part)} aria-label="${esc(part.name)}：${Number.isFinite(part.count)?fmt(part.count)+'条':'—'}，占比${upPercent(part.share)}"><i aria-hidden="true"></i><span>${esc(part.name.replace('进线',''))}</span><b>${Number.isFinite(part.count)?fmt(part.count)+'条':'—'} · ${upPercent(part.share)}</b></button>`).join('')}</div>`;
 const total=upQualityMetric({...contact,detailMarkup:bar+legend});
 return total+upQualityMetric(bad);
}
