// 原型特批按SPU＋考核期独立保存；生效日属于考核期，操作时间另记，不改经营台账。
const nspApprovalStorageKey='dashboard.new-product-success-approvals.v1';
function nspApprovalPeriodRange(key){
 const match=/^(\d{4})(?:-Q([1-4]))?$/.exec(String(key));if(!match)return null;
 const year=Number(match[1]),quarter=Number(match[2])||null;if(year<2000||year>2100)return null;
 return {start:year+'-'+String(quarter?(quarter-1)*3+1:1).padStart(2,'0')+'-01',end:new Date(Date.UTC(year,quarter?quarter*3:12,0)).toISOString().slice(0,10),annual:!quarter};
}
function nspApprovalValidDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value}
function nspApprovalRead(){
 const empty={version:1,records:[],history:[]};
 try{
  const saved=JSON.parse(localStorage.getItem(nspApprovalStorageKey)||'null');if(saved?.version!==1||!Array.isArray(saved.records))return empty;
  const records=new Map();
  for(const record of saved.records){
   const range=nspApprovalPeriodRange(record?.periodKey);
   if(!range||typeof record.spuId!=='string'||!record.spuId||typeof record.reason!=='string'||!record.reason.trim()||record.reason.length>500
    ||!nspApprovalValidDate(record.effectiveDate)||record.effectiveDate<range.start||record.effectiveDate>range.end
    ||typeof record.approvedBy!=='string'||typeof record.approvedAt!=='string'||!Number.isFinite(Date.parse(record.approvedAt)))continue;
   const value={spuId:record.spuId,periodKey:record.periodKey,effectiveDate:record.effectiveDate,reason:record.reason,approvedBy:record.approvedBy,approvedAt:record.approvedAt};
   records.set(JSON.stringify([value.spuId,value.periodKey]),value);
  }
  return {version:1,records:[...records.values()],history:Array.isArray(saved.history)?saved.history:[]};
 }catch(_){return empty}
}
let nspApprovalState=nspApprovalRead(),nspApprovalRevision=0;
function nspApprovalIds(product){
 return typeof product==='string'?[product]:[product.seriesId||product.spuId,...(product.members||[]).map(member=>member.spuId)];
}
function nspApprovalFor(product,periodKey,cutoff=DATA_CUTOFF){
 const ids=nspApprovalIds(product);
 const record=nspApprovalState.records.filter(item=>ids.includes(item.spuId)&&item.periodKey===periodKey&&item.effectiveDate<=cutoff)
  .sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate))[0];
 return record?{...record}:null;
}
function nspFirstQuarterApproval(product,cutoff){
 const ids=nspApprovalIds(product);
 const record=nspApprovalState.records.filter(item=>ids.includes(item.spuId)&&item.periodKey.includes('-Q')&&item.effectiveDate<=cutoff&&item.effectiveDate>=product.actualLaunch)
  .sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate))[0];
 return record?{quarter:record.periodKey,date:record.effectiveDate,approval:{...record}}:null;
}
function nspSaveApproval(product,assessment,reason,revoke=false){
 if(JSON.stringify(nspApprovalRead())!==JSON.stringify(nspApprovalState))throw Error('特批记录已更新，请刷新页面后重试');
 const range=nspApprovalPeriodRange(assessment.key);
 if(!range||range.annual!==assessment.annual||assessment.start!==range.start||!nspApprovalValidDate(assessment.end)||assessment.end<range.start||assessment.end>range.end||assessment.end>DATA_CUTOFF)throw Error('考核期间无效');
 const current=nspApprovalFor(product,assessment.key,assessment.end),fact=nspSuccessFact(product,assessment);
 if(!fact.included)throw Error('该产品未纳入本期考核');
 if(revoke&&!current)throw Error('该产品本期没有特批记录');
 if(!revoke&&(current||fact.success))throw Error(current?'该产品本期已特批成功':'该产品已达到成功标准');
 const content=String(reason||'').trim();if(!revoke&&(!content||content.length>500))throw Error('请填写特批原因，最多500字');
 const stamp=new Date().toISOString(),actor='管理员账户';
 const record=revoke?current:{spuId:product.seriesId||product.spuId,periodKey:assessment.key,effectiveDate:assessment.end,reason:content,approvedBy:actor,approvedAt:stamp};
 const records=nspApprovalState.records.filter(item=>item.spuId!==record.spuId||item.periodKey!==assessment.key);
 if(!revoke)records.push(record);
 const next={version:1,records,history:[...nspApprovalState.history,{action:revoke?'revoke':'approve',record:{...record},actor,at:stamp}]};
 // 写入失败保留原状态；撤销只移除本期特批，其他周期和自然成功均不改写。
 try{localStorage.setItem(nspApprovalStorageKey,JSON.stringify(next))}catch(_){throw Error('保存失败，请检查浏览器存储后重试')}
 nspApprovalState=next;nspApprovalRevision++;
 return record;
}
function nspApprovalAudit(){return JSON.parse(JSON.stringify(nspApprovalState))}
