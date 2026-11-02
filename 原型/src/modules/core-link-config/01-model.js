const KLC_STORAGE='dashboard-core-links-v1';
function klcSeed(){
 const monitorMonth=klcDefaultMonth();
 return {version:1,revision:0,records:klcCatalog.filter((r,i)=>i%20<12).map(r=>({shopId:r.shopId,linkId:r.linkId,versions:[{from:'2025-01-01',to:null,name:r.name,spuId:r.spuId,monitorMonth,actor:'管理员',updatedAt:''}]}))};
}
function klcRepairSampleMonths(store){
 const samples=new Map(klcCatalog.filter((r,i)=>i%20<12).map(row=>[row.shopId+'|'+row.linkId,row]));
 const month=klcDefaultMonth();
 for(const record of store.records){
  const sample=samples.get(record.shopId+'|'+record.linkId),version=record.versions[0];
  // 仅补齐未改动的内置样例，不推测用户导入、编辑或历史版本的月份。
  if(sample&&record.versions.length===1&&version&&!version.to&&!version.monitorMonth&&version.from==='2025-01-01'&&version.name===sample.name&&version.spuId===sample.spuId&&version.actor==='管理员'&&version.updatedAt==='')version.monitorMonth=month;
 }
 return store;
}
function klcLoad(){try{const v=JSON.parse(localStorage.getItem(KLC_STORAGE));if(v?.version===1&&Number.isInteger(v.revision)&&Array.isArray(v.records)&&v.records.every(r=>typeof r.shopId==='string'&&typeof r.linkId==='string'&&Array.isArray(r.versions)))return klcRepairSampleMonths(v)}catch(_){}return klcSeed()}
let klcStore=klcLoad();
const klcIdentity=r=>r.shopId+'|'+r.linkId;
const klcKey=r=>klcIdentity(r)+'|'+klcNormalizeMonth(r.monitorMonth);
// 原型业务日期沿用统一数据截止日；真实操作时间仅用于维护记录。
function klcEffectiveDay(){return dashboardSyncDate()}
function klcDefaultMonth(){return klcEffectiveDay().slice(0,7)}
// 内部仍用ISO月份匹配日期；对外统一斜杠格式，兼容历史连字符输入。
function klcNormalizeMonth(value){return typeof value==='string'&&/^[1-9]\d{3}[-/](0[1-9]|1[0-2])$/.test(value)?value.replace('/','-'):''}
function klcValidMonth(value){return !!klcNormalizeMonth(value)}
function klcMonthLabel(value){return klcNormalizeMonth(value).replace('-','/')||'未设置'}
function klcRows(end=null){return klcStore.records.flatMap(r=>r.versions.filter(v=>end?v.from<=end&&(!v.to||end<v.to):!v.to).map(v=>({...v,shopId:r.shopId,linkId:r.linkId})))}
function klcLookup(shopId,linkId){return klcCatalog.find(r=>r.shopId===shopId&&r.linkId===linkId)}
function klcValidate(row){
 const shop=klcShops().find(s=>String(s.shopId)===row.shopId);
 if(!shop)throw Error('请选择所属店铺');
 if(!/^\d{1,64}$/.test(row.linkId))throw Error('链接ID须为1—64位数字');
 if(row.name.length>100)throw Error('商品名称不能超过100字');
 if(!klcValidMonth(row.monitorMonth))throw Error('请选择月份，格式为YYYY/MM');
}
function klcCommit(changes,revision=klcStore.revision){
 const saved=localStorage.getItem(KLC_STORAGE);if(saved){let v;try{v=JSON.parse(saved)}catch(_){}if(v?.revision!==klcStore.revision)throw Error('配置已更新，请刷新后重试')}
 if(revision!==klcStore.revision)throw Error('配置已更新，请重新导入');
 const next=JSON.parse(JSON.stringify(klcStore)),day=klcEffectiveDay(),stamp=new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'});
 for(const change of changes){const row=change.row;let record=next.records.find(r=>klcIdentity(r)===klcIdentity(row));const current=record?.versions.find(v=>!v.to&&klcNormalizeMonth(v.monitorMonth)===klcNormalizeMonth(row.monitorMonth));
  if(change.type==='remove'){if(!current)throw Error('链接已移除');current.to=day;continue}
  klcValidate(row);if(!current&&change.type==='edit')throw Error('链接已移除，请刷新后重试');if(current&&change.type==='add')throw Error('该店铺下链接ID已存在');
  if(current)current.to=day;
  if(!record){record={shopId:row.shopId,linkId:row.linkId,versions:[]};next.records.push(record)}
  record.versions.push({from:day,to:null,name:row.name,monitorMonth:klcNormalizeMonth(row.monitorMonth),spuId:row.spuId||current?.spuId||'',actor:'管理员',updatedAt:stamp});
 }
 next.revision++;try{localStorage.setItem(KLC_STORAGE,JSON.stringify(next))}catch(_){throw Error('保存失败，请检查浏览器存储后重试')}
 klcStore=next;return next;
}
function klcAssessedLinks(shop,end){
 if(shop.channel!=='拼多多')return [];
 end=end||(typeof riskRange==='function'?riskRange().end:bounds().cutoff);
 return klcRows(end).filter(r=>r.shopId===String(shop.shopId)&&(!r.monitorMonth||r.monitorMonth===end.slice(0,7))).map(row=>{
  const source=klcLookup(row.shopId,row.linkId),spu=sampleSpus.find(p=>p.spuId===row.spuId);
  const metrics=(source?.metrics||['近30天品质退款率','近30天品质求助平台率','近30天品质文本情感分'].map(name=>({name,thirdValue:null,mainValue:null,thirdRank:'--',mainRank:'--'}))).map(m=>({...m,thirdRed:brcMatch('shops.pddValue',m.thirdValue),mainRed:brcMatch('shops.pddValue',m.mainValue)}));
  const values=metrics.flatMap(m=>[m.thirdValue,m.mainValue]),known=values.filter(Number.isFinite).length,redCount=values.filter(v=>Number.isFinite(v)&&brcMatch('shops.pddValue',v)).length;
  return {...source,...row,id:row.linkId,name:row.name||'--',product:spu?.name||source?.product||row.name,model:spu?.model||source?.model||'—',metrics,redCount,assessment:known===6?(brcMatch('shops.pddCount',redCount)?'red':redCount?'yellow':'normal'):'unknown'};
 });
}
window.coreLinkConfigSnapshot=(end=null)=>JSON.parse(JSON.stringify({revision:klcStore.revision,rows:klcRows(end),records:klcStore.records,links:klcShops().flatMap(s=>klcAssessedLinks(s,end||DATA_CUTOFF))}));
