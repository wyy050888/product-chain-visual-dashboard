// 工单按互斥问题类型生成样例，数量可跨日期、平台累加；总数不变。
function qrbContactSplit(total,seed){
 const qualityContacts=Math.round(total*(.55+(Math.abs(seed)%5)*.05));
 return {qualityContacts,experienceContacts:total-qualityContacts};
}
function qrbRateDelta(current,previous){return Number.isFinite(current)&&Number.isFinite(previous)?current-previous:null}
function qrbContactDecision(current,previous,metrics={}){
 const growth=qrbRateDelta(current,previous);
 return {growth,hit:brcMatch('quality.contactDelta',growth,{...metrics,contactDelta:growth})};
}
function qrbContactDeltaText(delta){
 if(!Number.isFinite(delta))return '环比 —';
 const rounded=Math.sign(delta)*Math.round(Math.abs(delta)*10)/10;
 return rounded===0?'环比 持平':'环比 '+(rounded>0?'+':'')+fmt(rounded,1)+'%';
}
