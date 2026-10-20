const KLC_STORAGE='dashboard-core-links-v1';
function klcSeed(){return {version:1,revision:0,records:klcCatalog.filter((r,i)=>i%20<12).map(r=>({shopId:r.shopId,linkId:r.linkId,versions:[{from:'2025-01-01',to:null,name:r.name,spuId:r.spuId,actor:'管理员',updatedAt:''}]}))}}
function klcLoad(){try{const v=JSON.parse(localStorage.getItem(KLC_STORAGE));if(v?.version===1&&Number.isInteger(v.revision)&&Array.isArray(v.records)&&v.records.every(r=>typeof r.shopId==='string'&&typeof r.linkId==='string'&&Array.isArray(r.versions)))return v}catch(_){}return klcSeed()}
let klcStore=klcLoad();
const klcKey=r=>r.shopId+'|'+r.linkId;
// 原型业务日期沿用统一数据截止日；真实操作时间仅用于维护记录。
function klcEffectiveDay(){return dashboardSyncDate()}
function klcRows(end=null){return klcStore.records.flatMap(r=>{const v=end?[...r.versions].reverse().find(v=>v.from<=end&&(!v.to||end<v.to)):r.versions.find(v=>!v.to);return v?[{...v,shopId:r.shopId,linkId:r.linkId}]:[]})}
function klcLookup(shopId,linkId){return klcCatalog.find(r=>r.shopId===shopId&&r.linkId===linkId)}
function klcValidate(row){
 const shop=klcShops().find(s=>String(s.shopId)===row.shopId);
 if(!shop)throw Error('请选择所属店铺');
 if(!/^\d{1,64}$/.test(row.linkId))throw Error('链接ID须为1—64位数字');
 if(row.name.length>100)throw Error('商品名称不能超过100字');
}
function klcCommit(changes,revision=klcStore.revision){
 const saved=localStorage.getItem(KLC_STORAGE);if(saved){let v;try{v=JSON.parse(saved)}catch(_){}if(v?.revision!==klcStore.revision)throw Error('配置已更新，请刷新后重试')}
 if(revision!==klcStore.revision)throw Error('配置已更新，请重新导入');
 const next=JSON.parse(JSON.stringify(klcStore)),day=klcEffectiveDay(),stamp=new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'});
 for(const change of changes){const row=change.row;let record=next.records.find(r=>klcKey(r)===klcKey(row));const current=record?.versions.find(v=>!v.to);
  if(change.type==='remove'){if(!current)throw Error('链接已移除');current.to=day;continue}
  klcValidate(row);if(!current&&change.type==='edit')throw Error('链接已移除，请刷新后重试');if(current&&change.type==='add')throw Error('该店铺下链接ID已存在');
  if(current)current.to=day;
  if(!record){record={shopId:row.shopId,linkId:row.linkId,versions:[]};next.records.push(record)}
  record.versions.push({from:day,to:null,name:row.name,spuId:current?.spuId||'',actor:'管理员',updatedAt:stamp});
 }
 next.revision++;try{localStorage.setItem(KLC_STORAGE,JSON.stringify(next))}catch(_){throw Error('保存失败，请检查浏览器存储后重试')}
 klcStore=next;return next;
}
function klcAssessedLinks(shop,end){
 if(shop.channel!=='拼多多')return [];
 end=end||(typeof riskRange==='function'?riskRange().end:bounds().cutoff);
 return klcRows(end).filter(r=>r.shopId===String(shop.shopId)).map(row=>{
  const source=klcLookup(row.shopId,row.linkId),spu=sampleSpus.find(p=>p.spuId===row.spuId);
  const metrics=source?.metrics||['近30天品质退款率','近30天品质求助平台率','近30天品质文本情感分'].map(name=>({name,thirdValue:null,mainValue:null,thirdRank:'--',mainRank:'--'}));
  const values=metrics.flatMap(m=>[m.thirdValue,m.mainValue]),known=values.filter(Number.isFinite).length,redCount=values.filter(v=>Number.isFinite(v)&&v>30).length;
  return {...source,...row,id:row.linkId,name:row.name||'--',product:spu?.name||source?.product||row.name,model:spu?.model||source?.model||'—',metrics,redCount,assessment:known===6?(redCount>=3?'red':redCount?'yellow':'normal'):redCount>=3?'red':'unknown'};
 });
}
window.coreLinkConfigSnapshot=(end=null)=>JSON.parse(JSON.stringify({revision:klcStore.revision,rows:klcRows(end),records:klcStore.records,links:klcShops().flatMap(s=>klcAssessedLinks(s,end||DATA_CUTOFF))}));
