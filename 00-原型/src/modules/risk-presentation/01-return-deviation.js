const rpDeviationCardKeys=['return','received','unreceived','gsv'];
const rpDeviationRates=[
 {key:'return',label:'总退',actual:summary=>summary.returnRate},
 {key:'received',label:'已收退',actual:summary=>summary.receivedRate}
];
const rpDeviationListKeys=['returnGap','receivedGap','unreceived','gsv','soldUnits','margin'];
// 使用计算退货率的原始销量判断样本量，避免扣掉退货后反而排除高退货产品。
const rpDeviationMinSales=100;

function rpDeviationMetrics(product,platform,summary){
 const {returnTarget,receivedTarget}=qrbReturnTargets(product,platform);
 const targets={return:returnTarget,received:receivedTarget};
 return rpDeviationRates.map(({key,label,actual:read})=>{
  const actual=read(summary),target=targets[key];
  const gap=Number.isFinite(actual)&&Number.isFinite(target)?actual-target:null;
  return {key,label,actual,gap,light:brcBandTone('return.'+key,gap)};
 });
}

function rpDeviationRows(platforms){
 const period=periodFor('risk'),{start,end}=upWindow(period),channels=upChannels(platforms),rows=[];
 for(const product of upSpus.values()){
  for(const channel of channels){
   const current=upSummary(product,start,end,channel);
   if(current.sales<=rpDeviationMinSales)continue;
   const metrics=rpDeviationMetrics(product,channel,current);
   const hits=metrics.filter(metric=>metric.light==='red');
   if(!hits.length)continue;
   const maxDeviation=Math.max(...metrics.map(({gap})=>gap).filter(Number.isFinite));
   rows.push({...upProduct(product),channel,platform:channel,metrics,
    risks:hits.map(metric=>metric.label),maxDeviation,gsvCents:current.gsvCents});
  }
 }
 const salesRange=rpReturnRankRange(period),salesBySpu=new Map();
 const sales30=row=>{
  if(!salesBySpu.has(row.spuId))salesBySpu.set(row.spuId,upSummary(upIdentity(row),salesRange.start,salesRange.end,'all').gsvCents);
  return salesBySpu.get(row.spuId);
 };
 return rows.sort((a,b)=>{
  const difference=b.maxDeviation-a.maxDeviation;
  return Math.abs(difference)>1e-9?difference:sales30(b)-sales30(a);
 });
}

function rpDeviationGapText(gap){
 if(!Number.isFinite(gap))return '—';
 const shown=Math.round(Math.abs(gap)*10)/10;
 return (shown===0?'':gap>0?'+':'−')+fmt(shown,1)+'%';
}

function rpDeviationFields(record,current,previous){
 const field=(key,name,value,sortValue,tone='')=>({...rpField(key,name,value,tone),sortValue});
 const fields=record.metrics.flatMap(({key,label,actual,gap,light})=>{
  const tone='rp-quality-'+light,display=rpDeviationGapText(gap),actualText=upPercent(actual),noNumericSignal=light==='red';
  return [
   {...field(key,label,actualText,actual),target:'偏差 '+display,targetTone:tone,cardComparisonFirst:true,noNumericSignal},
   {...field(key+'Gap',label+'偏差',display,gap,tone),target:'实际 '+actualText,targetTone:'rp-quality-gray',noNumericSignal}
  ];
 });
 const unreceived=upUnreceivedRate(current);
 fields.push(
  {...field('unreceived','未收退',upPercent(unreceived),unreceived,Number.isFinite(unreceived)?'':'rp-quality-gray'),cardActualOnly:true},
  {...field('gsv','GSV',rpQualityMoney(current.gsvCents/100),current.gsvCents),
   target:rpQualityChange(current.gsvCents,previous.gsvCents),
   targetTone:rpQualityChangeTone(current.gsvCents,previous.gsvCents)},
  field('soldUnits','销量',formatSalesQuantity(current.sales),current.sales),
  {...field('margin','利润率',upPercent(current.profitRate),current.profitRate),
   ...rpProfitRateComparison(current.profitRate,previous.profitRate)}
 );
 return fields;
}
