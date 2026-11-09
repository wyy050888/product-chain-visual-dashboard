// 违规链接近30天GSV适配：正式记录读取链接原值；本地演示事件使用独立链接样例。
// 不以SPU整体GSV代替链接GSV；按平台+链接去重，保留0与缺失的区别。
function qrbViolationLinkId(product,platform,event){
 if(event.linkId!==undefined&&event.linkId!==null)return String(event.linkId);
 const seed=[...product.spuId+'|'+platform].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 return '73'+String(seed).padStart(10,'0');
}
function qrbDemoLinkGsv30(linkId,platform,end){
 const seed=[...platform+'|'+linkId].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0),priceCents=19900+seed%50000;
 let total=0;
 for(let i=0;i<30;i++){
  const day=Math.floor(Date.parse(shiftDate(end,-i))/86400000),sales=(seed+day*7)%19;
  total+=Math.max(0,sales-(seed+day)%4)*priceCents;
 }
 return total;
}
function qrbViolationLinkFacts(product,platform,events,end){
 const links=new Map();let missingIdentity=false;
 for(const event of events){
  if(event.source!=='demo'&&(event.linkId===undefined||event.linkId===null||event.linkId==='')){missingIdentity=true;continue}
  const linkId=qrbViolationLinkId(product,platform,event);
  const current=links.get(linkId),raw=event.linkGsv30Cents;
  const valid=Number.isFinite(raw)&&(!event.linkGsv30End||event.linkGsv30End===end);
  // 显式空值表示缺数据；仅没有后台字段的demo事件可生成固定演示值。
  const gsvCents=valid?raw:event.source==='demo'&&!Object.hasOwn(event,'linkGsv30Cents')?qrbDemoLinkGsv30(linkId,platform,end):null;
  if(!current||Number.isFinite(gsvCents))links.set(linkId,{linkId,platform,start:shiftDate(end,-29),end,gsvCents,source:valid?'ledger':event.source==='demo'?'demo':'missing'});
 }
 const rows=[...links.values()],complete=!missingIdentity&&rows.length>0&&rows.every(row=>Number.isFinite(row.gsvCents));
 return {links:rows,gsvCents:complete?rows.reduce((sum,row)=>sum+row.gsvCents,0):null};
}
