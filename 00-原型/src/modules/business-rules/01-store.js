// v3保存且/或条件组；读取时兼容v1数值、v2区间，旧存储保留。
const BRC_STORAGE='dashboard-business-rules-v3',BRC_PREVIOUS_STORAGE='dashboard-business-rules-v2',BRC_LEGACY_STORAGE='dashboard-business-rules-v1';
// 本次仅一次重置旧新品成功方案；升级后新增、编辑的规则正常保留。
const BRC_SUCCESS_DEFAULT_REVISION=1;
const brcFixedWorseningRates=new Set(['quality.worsenReturn','quality.worsenReceived']);
function brcUpgradeStagnantWarningMetrics(conditions){
 const upgrade=condition=>{
  for(const child of condition?.conditions||[])upgrade(child);
  if(condition?.metric==='warehouse')condition.metric='sellableUnits';
  if(condition?.metric==='coverage15')condition.metric='sellableCoverage15';
 };
 // 旧配置显式保存的我司口径同步切换，保留阈值和条件组关系。
 for(const key of ['stock.warning.warehouse','stock.warning.netSales','stock.warning.coverageDays'])upgrade(conditions[key]);
}
function brcRead(){
 try{
  const data=JSON.parse(localStorage.getItem(BRC_STORAGE)||localStorage.getItem(BRC_PREVIOUS_STORAGE)||localStorage.getItem(BRC_LEGACY_STORAGE)||'null');
  if(![1,2,3].includes(data?.version)||!Number.isInteger(data.revision)||data.revision<0)return null;
  const values=Object.fromEntries(brcDefinitions.map(rule=>[rule.key,rule.source==='数智罗盘SABC规则配置'?rule.value:data.values?.[rule.key]??rule.value]));
  // 将旧默认10天订正为15天；保留其他自定义值，后续显式保存的配置不再迁移。
  if(data.deliveryRuleRevision!==1&&values['new.deliveryDays']===10)values['new.deliveryDays']=brcDefaults['new.deliveryDays'];
  // 店铺退货改为实际减目标＞3%，旧相对比例条件不能沿用。
  const upgradeShopReturns=data.shopReturnRuleRevision!==1;
  if(upgradeShopReturns)values['shops.returnExcess']=brcDefaults['shops.returnExcess'];
  // 旧的本地SABC覆盖值不再参与运行，等级和经营标签始终读取统一来源。
  // 本次订正仅升级退货灯色，保留其他业务配置；后续用户保存的条件正常保留。
  const upgradeReturns=data.returnRuleRevision!==1,returnKeys=new Set(brcBands.filter(b=>b.id.startsWith('return.')).flatMap(b=>b.keys));
  if(upgradeReturns){values['lights.return']=2;values['lights.received']=.5;}
  // 固定使用增长率阈值，历史按差值保存的两项条件不再读取。
  for(const key of brcFixedWorseningRates)values[key]=brcDefaults[key];
  const defaults=brcDefaultConditions(values),conditions=brcExpandLegacyFallbacks(Object.fromEntries(Object.entries(defaults).map(([key,c])=>[key,data.version>=2&&data.conditions?.[key]&&!brcFixedWorseningRates.has(key)&&!(upgradeReturns&&returnKeys.has(key))&&!key.startsWith('grades.')&&!(upgradeShopReturns&&key==='shops.returnExcess')?brcNormalizeCondition(data.conditions[key]):c])));
  brcUpgradeStagnantWarningMetrics(conditions);
  brcNormalizeGradeAxes(conditions,defaults);
  const projected=brcProjectValues(values,conditions);return brcValidate(projected,conditions)?null:{version:3,returnRuleRevision:1,deliveryRuleRevision:1,shopReturnRuleRevision:1,revision:data.revision,values:projected,conditions,successDefaultRevision:data.successDefaultRevision||0,successTimeline:brcSuccessReadTimeline(data.successDefaultRevision===BRC_SUCCESS_DEFAULT_REVISION?data.successTimeline:null,conditions,projected),updatedAt:String(data.updatedAt||'')};
 }catch(_){return null}
}
let brcSaved=brcRead()||{version:3,returnRuleRevision:1,deliveryRuleRevision:1,shopReturnRuleRevision:1,revision:0,values:{...brcDefaults},conditions:brcDefaultConditions(brcDefaults),updatedAt:''};
// 默认季度、年度各一套显式生效规则。
brcSaved.successTimeline??=brcSuccessReadTimeline(null,brcSaved.conditions,brcSaved.values);
if(brcSaved.successDefaultRevision!==BRC_SUCCESS_DEFAULT_REVISION){
 const next={...brcSaved,successDefaultRevision:BRC_SUCCESS_DEFAULT_REVISION};
 if(brcRead()){
  try{brcPersistRules({...next,revision:brcSaved.revision+1})}catch(_){brcSaved=next}
 }else brcSaved=next;
}
function brcNumber(key){return brcSaved.values[key]??brcDefaults[key]}
function brcCommit(group,draft,draftConditions=brcDefaultConditions(draft)){
 if(!brcGroups.some(([key])=>key===group))throw Error('业务对象不存在');
 if((brcRead()?.revision||0)!==brcSaved.revision)throw Error('配置已在其他页面更新，请取消更改后重试');
 const values={...brcSaved.values},conditions=brcCopyConditions(brcSaved.conditions);
 for(const item of brcConfigurableItems.filter(item=>item.group===group)){if(item.kind==='parameter')values[item.key]=draft[item.key];else conditions[item.key]=brcNormalizeCondition(draftConditions[item.key]);}
 const projected=brcProjectValues(values,conditions),invalid=brcValidate(projected,conditions);
 if(invalid)throw Object.assign(Error(invalid.message),{field:invalid.key});
 const next={version:3,returnRuleRevision:1,deliveryRuleRevision:1,shopReturnRuleRevision:1,revision:brcSaved.revision+1,values:projected,conditions,successTimeline:brcSuccessReadTimeline(brcSaved.successTimeline,brcSaved.conditions,brcSaved.values),updatedAt:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'})};
 return brcPersistRules(next);
}
function brcPersistRules(next){
 next={...next,successDefaultRevision:BRC_SUCCESS_DEFAULT_REVISION};
 // 只持久化本系统维护的规则；SABC配置不写入本地规则存储。
 const owned=entries=>Object.fromEntries(Object.entries(entries).filter(([key])=>!key.startsWith('grades.')));
 try{localStorage.setItem(BRC_STORAGE,JSON.stringify({...next,values:owned(next.values),conditions:owned(next.conditions)}))}catch(_){throw Error('保存失败，请检查浏览器存储空间')}
 brcSaved=next;return next;
}
