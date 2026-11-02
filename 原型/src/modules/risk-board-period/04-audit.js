window.riskBoardPeriodAudit=()=>rpWithCardRows(()=>rpWarningKinds.map(kind=>rpWithBoardPeriod(kind,()=>{
 const period={...rpBoardPeriod(kind)},range=upWindow(),comparison=riskRange(range.start,range.end),rows=rpCardRows(kind);
 const selected=[0,6].includes(kind)?rpPlatformCardProducts(rows):rows.slice(0,6);
 const rankingRange=kind===6?rpReturnRankRange(period):null;
 return {kind,period,range,comparison,count:rows.length,...(kind===6?{rankingRange,ranking:rows.map(row=>({id:row.id,spuId:row.spuId,platform:row.channel,
  returnRate:row.returnRate,previousRate:row.previousRate,receivedRate:row.receivedRate,previousReceivedRate:row.previousReceivedRate,
  currentGsvCents:upSummary(upIdentity(row),rankingRange.start,rankingRange.end,'all').gsvCents}))}:{}),records:selected.map(row=>({id:row.id,spuId:row.spuId,platform:row.platform||row.channel||'all',
  ...(kind===1?{shopId:row.shopId,score:row.score,productScore:row.productScore,logisticsScore:row.logisticsScore,serviceScore:row.serviceScore,scoreDate:row.scoreDate,scoreAsOf:row.scoreAsOf}:{}),
  fields:rpFieldMap(kind,row).map(field=>({key:field.key,value:field.value,raw:field.sortValue,target:field.target}))}))};
})));
