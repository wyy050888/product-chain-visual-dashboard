// 新增高危只消费上方风险榜的出现记录；不生成AI清单展示台账。
const gdRiskQuietDays=15;
function gdRiskHistoryKey(history){return rpWarningHistoryKey(history)}
function gdRiskAppearanceDates(history){return rpWarningDates(history.appearances)}
// 当天在上方入榜，且距上次入榜至少15个自然日才可进入新增；连续入榜逐日更新抑制窗口。
function gdRiskReminder(history,current,date,dates=gdRiskAppearanceDates(history),observedDates=rpWarningObservedDates){
 if(!current||!uiPeriodValidDate(date)||history.handledAt&&history.handledAt<=date)return null;
 const known=rpWarningDates(dates).filter(day=>day<=date);if(!known.includes(date))return null;
 const first=known[0],previous=known.filter(day=>day<date).at(-1)||'';
 if(!previous&&history.baseline)return null;
 // 未采集的日期不等于当天未入榜；缺少前14天完整快照时，不猜测是新增或复现。
 const covered=history.sample?rpWarningDates([...observedDates,...(history.sampleObservedDates||[])]):observedDates;
 if(!rpWarningHistoryCovered(date,covered))return null;
 if(previous&&(Date.parse(date+'T00:00:00Z')-Date.parse(previous+'T00:00:00Z'))/86400000<gdRiskQuietDays)return null;
 return {type:previous?'风险复核':'新出现风险',date,firstSeen:first,previousAppeared:previous};
}
function gdRiskIdentity(kind,row){return rpWarningIdentity(kind,row)}
function gdRiskSeverity(kind,row){
 if(kind===3||kind===4)return row.level==='P1'?2:1;
 if(kind===0||kind===2)return 2;
 return ['P0','P1','高危','red'].includes(row.level||row.tone)?2:1;
}
const gdRiskSourceCache=boundedCache(4);
function gdRiskSources(range){
 const end=range.end||range.cutoff,key=range.start+'|'+end+'|'+DATA_CUTOFF+'|'+upRuleRevision+'|'+brcSaved.revision+'|'+shcRevision;
 let rows=gdRiskSourceCache.get(key);if(rows)return rows;
 const previous=localPeriods.risk;localPeriods.risk=drawerPeriodFromRange({start:range.start,end});
 try{rows=withPeriod('risk',()=>rpWarningSnapshot(range).map(({kind,row})=>rpWithBoardPeriod(kind,()=>({
  key:gdRiskIdentity(kind,row),kind,title:rpTitles[kind],row,severity:gdRiskSeverity(kind,row),
  metrics:rpFields(kind,row,({0:['sanctions','offShelf','contact'],1:['score','fine','frozen','limited'],2:['margin','loss','gsv'],3:['totalCoverage15','total','warehouse','dailyNet15'],4:['coverage15','staleUnits','staleValue','age'],6:['return','received']})[kind]).map(f=>({name:f.name,value:f.name==='罚款＆冻结'?f.value+'元':f.value,target:f.target}))
 }),rpDefaultBoardPeriod(kind,end))));gdRiskSourceCache.set(key,rows);return rows}
 finally{if(previous)localPeriods.risk=previous;else delete localPeriods.risk}
}
function gdNewRiskKeyWork(context,range){
 const sourceRange=context.by('risk').range,snapshots=gdRiskSources(sourceRange),byKey=new Map(snapshots.map(r=>[r.key,r]));
 const rows=rpWarningHistory().flatMap(history=>{
  const sourceKey=gdRiskHistoryKey(history),current=byKey.get(sourceKey),scanDate=history.sample&&history.sampleListedAt?history.sampleListedAt:[range.end,sourceRange.end||sourceRange.cutoff].sort()[0],change=gdRiskReminder(history,current,scanDate);
  if(!change)return [];
  const r=current.row,shop=current.kind===1,object={key:(shop?'shop':'product')+'|'+(shop?r.shopId||r.id:r.spuId),type:shop?'shop':'product',name:r.name||r.shopName,spuId:r.spuId};
  const eventKey='risk-alert|'+sourceKey+'|'+change.date,platform=history.platform==='all'?'全公司':history.platform;
  const details=current.metrics.map(m=>m.name+'：'+m.value+(m.target?'（'+m.target+'）':'')).join('；\n');
  const changeText=change.previousAppeared?'在上方风险榜再次出现，距上次出现已满15天':'在上方风险榜出现，且已知历史中无此前出现记录';
  const problem=platform+' · '+current.title+'于'+gdSourceDate(change.date)+changeText+'。\n当前预警：'+details+'。';
  const defaultDepartment=shop?'产品中心':[0,6].includes(current.kind)?'品质中心':current.kind===2?'产品中心':'采购部';
  const action=shop?'核对店铺风险触发项及处理记录，明确处置安排和责任人。':current.kind===3?'核对该SKU可售库存、在途到货及补货排期，确认缺口和保供安排。':current.kind===4?'核对该SKU库存、动销和季节窗口，明确去化或退厂安排。':current.kind===2?'核对亏损构成及已有改善记录，提出可执行的利润改善方案。':'核对平台风险记录及相关商品，确认原因、处理范围和整改安排。';
  const rawOwner=r.owner||'',owner=aiAssignees.some(([name])=>name===rawOwner)?rawOwner:'',department=upTodoPersonDepartment(owner)||defaultDepartment;
  const evidence=(id,date,name,content)=>({...diagnosisNormalizeSource({sourceTypeKey:'risk-alert',source:'全局高危预警\n'+name}),id,date,capturedDate:DATA_CUTOFF,objectKey:object.key,objectName:object.name,sourceTypeKey:'risk-alert',sourceName:name,content});
  const sources=[evidence('risk-board|'+history.id,sourceRange.end||sourceRange.cutoff,current.title+' · '+object.name,platform+'\n'+details),
   evidence('risk-appearance|'+history.id+'|'+change.date,change.date,'上方风险榜出现记录'+(history.sample?'（演示样例）':''),(history.sample?'演示样例：出现日期为模拟历史，当前指标引用上方风险榜。\n':'')+'本次出现：'+gdSourceDate(change.date)+(change.previousAppeared?'\n上次出现：'+gdSourceDate(change.previousAppeared):'')+'\n去重：以上方风险榜最近出现日计时，第2～15天不重复，第16天起重判；持续入榜不重复。')];
  const entry={id:'key|'+eventKey,kind:'key-work',keyType:'high-risk',workKey:eventKey,eventKey,sample:history.sample===true,riskAlertId:history.id,riskIdentity:sourceKey,riskBoardKind:current.kind,changeType:change.type,firstSeenAt:change.firstSeen,previousAppearedAt:change.previousAppeared,
   object,objectName:object.name,spuId:r.spuId,source:'risk',sourceName:'风险预警',date:change.date,priority:current.severity>=2?'P1':'P2',category:r.category||pfCategory(r),department,owner,
   title:current.title+' · '+change.type,problem,action,sources,decisionParticipants:[{assignee:owner,department,action,completionCriteria:'已核对原始预警，并形成对应处置记录。'}],
   executionOrderId:history.executionOrderId,businessObjects:[{type:object.type,id:String(shop?r.shopId||r.id:r.spuId),name:object.name}]};
  if(change.date<range.start||change.date>range.end)return [];
  return [entry];
 });
 return rows;
}
window.globalDiagnosisRiskSnapshot=()=>{const range=gdRange(),sources=gdRiskSources(gdSourceRange('risk'));return {range,history:rpWarningHistory(),sources:sources.map(({key,kind,title,severity,row,metrics})=>({key,kind,title,severity,name:row.name,spuId:row.spuId,skuId:row.skuId,metrics})),rows:(gdRenderedData||gdDataset()).work.filter(r=>r.keyType==='high-risk')};};
