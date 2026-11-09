// 亏损榜的权威粒度为全公司 SPU；平台明细仅用于详情分析。
// 保留现有公司样例规模，渠道拆分为守恒的演示分配，不把原金额重复算六遍。
const lossPreviousPeriod=riskLossPeriod;
const lossChannelWeights=[32,13,8,20,15,12];
const lossLedgerCache=new Map();let lossLedgerWindow='';
function lossAllocate(total,weights){
 const sign=total<0?-1:1,count=Math.abs(Math.round(total)),sum=weights.reduce((s,n)=>s+n,0);
 if(!sum)return weights.map(()=>0);
 const raw=weights.map(n=>count*n/sum),parts=raw.map(Math.floor),remaining=count-parts.reduce((s,n)=>s+n,0);
 const order=raw.map((n,i)=>({i,fraction:n-parts[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
 for(let i=0;i<remaining;i++)parts[order[i].i]++;
 return parts.map(n=>n*sign);
}
function lossCompanyLedger(r){
 const w=riskRange(),windowKey=w.start+'|'+w.end+'|'+snapshotFactor();
 if(windowKey!==lossLedgerWindow){lossLedgerWindow=windowKey;lossLedgerCache.clear()}
 const key=[r.spuId||r.id,r.sourceLoss??r.loss,r.sourceMonthlySales??r.monthlySales].join('|');
 if(lossLedgerCache.has(key))return lossLedgerCache.get(key);
 const source=lossPreviousPeriod(r),weights=lossChannelWeights.map((_,i)=>lossChannelWeights[(i+r.id)%lossChannelWeights.length]);
 // 沿用原公司已收退件数，按逐日退货量分配，避免拆渠道时改变总量。
 const dailyReceived=lossAllocate(source.received,source.points.map(p=>p.returns));
 const channels=qrPlatforms.map(platform=>({platform,points:[]}));
 for(const [pointIndex,point] of source.points.entries()){
  const gmvCents=Math.round(point.gmv*1000000),refundCents=point.sales?Math.round(gmvCents*point.returns/point.sales):0;
  const received=dailyReceived[pointIndex],profitCents=-Math.round(point.loss*1000000);
  const sales=lossAllocate(point.sales,weights),returns=lossAllocate(point.returns,sales),receipts=lossAllocate(received,returns);
  const gross=lossAllocate(gmvCents,weights),refunds=lossAllocate(refundCents,returns),profits=lossAllocate(profitCents,weights);
  channels.forEach((channel,i)=>{
   const gsvCents=gross[i]-refunds[i];
   channel.points.push({date:point.date,sales:sales[i],returns:returns[i],received:receipts[i],gmvCents:gross[i],refundCents:refunds[i],gsvCents,profitCents:profits[i],costCents:gsvCents-profits[i],gmv:gross[i]/1000000,loss:-profits[i]/1000000,rate:qrRate(returns[i],sales[i])});
  });
 }
 const company=source.points.map((point,index)=>{
  const row={date:point.date};
  for(const field of ['sales','returns','received','gmvCents','refundCents','gsvCents','profitCents','costCents'])row[field]=channels.reduce((sum,channel)=>sum+channel.points[index][field],0);
  return {...row,gmv:row.gmvCents/1000000,loss:-row.profitCents/1000000,rate:qrRate(row.returns,row.sales)};
 });
 const ledger={...w,company,channels};lossLedgerCache.set(key,ledger);return ledger;
}
riskLossPeriod=function(r){
 const ledger=lossCompanyLedger(r),platform=r.lossPlatform||'all',points=platform==='all'?ledger.company:ledger.channels.find(c=>c.platform===platform)?.points;
 if(!points)throw new Error('未知亏损分析平台：'+platform);
 const sum=field=>points.reduce((total,p)=>total+p[field],0),sales=sum('sales'),returned=sum('returns'),received=sum('received'),gsvCents=sum('gsvCents'),profitCents=sum('profitCents');
 return {...riskRange(),platform,points,sales,returned,received,rate:qrRate(returned,sales),receivedRate:qrRate(received,sales),gmv:sum('gmvCents')/1000000,gsv:gsvCents/1000000,loss:-profitCents/1000000,profitCents,gsvCents,gmvCents:sum('gmvCents'),refundCents:sum('refundCents'),costCents:sum('costCents')};
};
const lossPreviousRows=brLossRows;
brLossRows=function(){return lossPreviousRows().map(r=>({...r,channel:'全公司',performanceScope:'company',lossPlatform:'all'}))};
