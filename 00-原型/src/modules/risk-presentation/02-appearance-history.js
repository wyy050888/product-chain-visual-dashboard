// 上方六个风险榜的入榜出现台账；与AI清单展示、筛选和Top6排名无关。
// 三条旧日期沿用既有样例；新增演示夹具独立标记，其余只采集当日入榜快照，不反推历史。
const rpWarningHistorySeeds=[
 {id:'quality-freeze-20261006-kxcq57',kind:0,objectId:'SPU-SOURCE-001',platform:'抖音',appearances:['2026-10-06']},
 {id:'shortage-20261001-q516-white',kind:3,objectId:'CW-LJ-XHSYY-Q516-SKU01',platform:'all',appearances:['2026-10-01']},
 {id:'quality-freeze-existing-a831',kind:0,objectId:'SPU-SOURCE-016',platform:'抖音',appearances:['2026-09-01']}
];
const rpWarningAppearanceStorageKey='dashboard.risk-board-appearances.v1',rpWarningKinds=[0,6,1,4,3,2];
const rpWarningRepeatGapDays=3;
const rpWarningSnapshotCache=boundedCache(4);
let rpWarningAppearances={},rpWarningObservedDates=[],rpWarningSamplesVersion='';
try{const saved=JSON.parse(localStorage.getItem(rpWarningAppearanceStorageKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved)){rpWarningAppearances=saved.records||{};rpWarningObservedDates=rpWarningDates(saved.observedDates);rpWarningSamplesVersion=typeof saved.sampleVersion==='string'?saved.sampleVersion:''}}catch(_){}
function rpWarningHistoryKey(record){return record.kind+'|'+record.objectId+'|'+record.platform}
function rpWarningIdentity(kind,row){return rpWarningHistoryKey({kind,objectId:kind===1?row.shopId||row.id:row.skuId||row.spuId||row.productId||row.id,platform:row.platform||row.channel||'all'})}
function rpWarningDates(dates){return [...new Set(Array.isArray(dates)?dates:[])].filter(uiPeriodValidDate).sort()}
// 首次提醒需要此前的快照支持，历史不足时先建立观察基线。
function rpWarningHistoryCovered(date,dates=rpWarningObservedDates){
 if(!uiPeriodValidDate(date))return false;const observed=new Set(dates);
 for(let day=1;day<rpWarningRepeatGapDays;day++){const prior=new Date(Date.parse(date+'T00:00:00Z')-day*86400000).toISOString().slice(0,10);if(!observed.has(prior))return false}
 return true;
}
function rpWarningHistory(){
 const records=new Map(rpWarningHistorySeeds.map(row=>[rpWarningHistoryKey(row),{...row,baseline:false}]));
 for(const [key,row] of Object.entries(rpWarningAppearances)){
  if(!row||!rpWarningKinds.includes(row.kind)||!row.objectId||!['all',...qrPlatforms].includes(row.platform)||rpWarningHistoryKey(row)!==key)continue;
  const seed=records.get(key),appearances=rpWarningDates([...(seed?.appearances||[]),...(Array.isArray(row.appearances)?row.appearances:[])]);
  if(appearances.length)records.set(key,{...row,id:seed?.id||key,appearances,baseline:seed?false:row.baseline!==false});
 }
 return [...records.values()].map(row=>({...row,appearances:rpWarningDates(row.appearances)}));
}
// 读取各榜全部入榜对象。品质违规按实际触发平台拆身份；不把全平台汇总重复算一个风险。
function rpWarningSnapshot(range){
 const end=range.end||range.cutoff,key=[range.start,end,DATA_CUTOFF,upRuleRevision,brcSaved.revision,shcRevision].join('|');
 const cached=rpWarningSnapshotCache.get(key);if(cached)return cached;
 const previous=localPeriods.risk;localPeriods.risk=drawerPeriodFromRange({start:range.start,end});
 try{
  const rows=withPeriod('risk',()=>rpWarningKinds.flatMap(kind=>rpWithBoardPeriod(kind,()=>{
   const boardRange=upWindow();
   const records=kind===3?rpShortageRows():kind===4?rpStagnantRows():rpRowsForPlatform(kind,'all');
   return records.flatMap(row=>{
    const parts=kind===0?(row.violatedPlatforms||[]).map(platform=>qfViolationObservation(upProduct(upIdentity(row)),platform,boardRange.start,boardRange.end)):[row];
    return parts.map(record=>({key:rpWarningIdentity(kind,record),kind,title:rpTitles[kind],row:record}));
   });
  },rpDefaultBoardPeriod(kind,end))));
  rpWarningSnapshotCache.set(key,rows);return rows;
 }finally{if(previous)localPeriods.risk=previous;else delete localPeriods.risk}
}
function rpRecordWarningAppearances(rows,date){
 if(date!==DATA_CUTOFF||!uiPeriodValidDate(date))return false;
 const history=new Map(rpWarningHistory().map(row=>[rpWarningHistoryKey(row),row]));let changed=!rpWarningObservedDates.includes(date);
 rpWarningObservedDates=rpWarningDates([...rpWarningObservedDates,date]);
 for(const source of rows){
  const prior=history.get(source.key);if(prior?.appearances.includes(date))continue;
  const [kind,objectId,platform]=source.key.split('|');
  // 历史不足的首次采集只建立基线，不能把缺失历史的旧风险说成新增。
  rpWarningAppearances[source.key]={...prior,kind:+kind,objectId,platform,baseline:prior?prior.baseline:!rpWarningHistoryCovered(date),appearances:rpWarningDates([...(prior?.appearances||[]),date])};changed=true;
 }
 if(changed)rpSaveWarningAppearances();
 return changed;
}
function rpSaveWarningAppearances(){
 try{localStorage.setItem(rpWarningAppearanceStorageKey,JSON.stringify({records:rpWarningAppearances,observedDates:rpWarningObservedDates,sampleVersion:rpWarningSamplesVersion}))}catch(_){/* 不可持久化时仍保留当次会话出现记录。 */}
}
function rpObserveWarningBoards(){
 const today=dashboardSyncDate(),range={start:shiftDate(today,-29),end:today};
 if(range.end===DATA_CUTOFF){const rows=rpWarningSnapshot(range);rpSeedWarningAppearanceSamples(rows,range.end);rpRecordWarningAppearances(rows,range.end)}
}
window.riskBoardAppearanceSnapshot=()=>({history:rpWarningHistory(),observedDates:[...rpWarningObservedDates],storageKey:rpWarningAppearanceStorageKey,sampleVersion:rpWarningSamplesVersion});
