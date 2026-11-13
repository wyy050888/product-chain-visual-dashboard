// SPU 是唯一关联键。截图只提供身份；以下台账保留明确的样例来源。
const upSpus = new Map(sampleSpus.map(p => [p.spuId, p]));
const upBaseProducts = new Map(sampleProductRows(false).map(p => [p.spuId, p]));
const upLossSeeds = new Map(withPeriod('risk', () => brLossRows()).map(p => [p.spuId, p]));
const upRawQuality = qrbMonthData;

const upIdentityCache=new Map();
const upMoneyFields = ['gmvCents', 'refundCents', 'gsvCents', 'profitCents', 'costCents', 'expenseCents', 'targetCents', 'targetProfitCents'];
const upCountFields = ['sales', 'returned', 'received', 'orders', 'contacts', 'qualityContacts', 'experienceContacts', 'reviews', 'bad'];
const upSummaryFields=[...upCountFields,...upMoneyFields];
function upFactsVersion(p){const sample=upIdentity(p)?.sampleTargets;return {target:sample?.monthlyGsvWan??dpStore.newTargets[p.chain],margin:sample?.profitRate??dpStore.marginTarget}}
function upFactsKey(p,platform,start,end,version=upFactsVersion(p)){return p.spuId+'|'+platform+'|'+start+'|'+end+'|'+version.target+'|'+version.margin;}
function upIdentity(record) {
  if (!record) return null;
  if (typeof record === 'string') return upSpus.get(record) || null;
  // 禁止以型号关联：源截图存在同型号、不同SPU的记录。
  return upSpus.get(record.spuId) || null;
}
function upProduct(p) {
  if(upIdentityCache.has(p.spuId))return upIdentityCache.get(p.spuId);
  const base = upBaseProducts.get(p.spuId);
  const actualLaunch = newLaunchSamples.get(p.spuId)?.actualLaunch || shiftDate(DATA_CUTOFF, 1 - base.days);
  const product={...base, ...sampleSpuFields(p), id: 10000 + p.sourceRow, actualLaunch,
    state:newLaunchSamples.get(p.spuId)?.salesState||base.state,
    platformStarts:newLaunchSamples.get(p.spuId)?.platformStarts,
    guidePriceCents:p.guidePriceCents??productGuidePriceSamples[p.spuId]??null,
    attribute: srAttribute(p.name), owner: aiOwners[p.chain], channel:qrPlatforms[(p.sourceRow-1)%6]};
  upIdentityCache.set(p.spuId,product);return product;
}
function upWindow(period = periodFor()) {
  const b = bounds(period);
  return {start: b.start, end: b.cutoff};
}
function upWithRange(range, run) {
  const old = localPeriods.risk;
  localPeriods.risk = {mode:'day', year:+range.end.slice(0,4), start:range.start, end:range.end};
  try { return withPeriod('risk', run); }
  finally { if (old) localPeriods.risk = old; else delete localPeriods.risk; }
}
// 低动销样例沿用原始件数比例；按固定日期分摊取整误差，避免逐日取整全部归零。
function upScaleSampleCount(count,total,units,phase){
  return total>0?Math.min(units,Math.floor(count/total*units+phase)):0;
}
function upBuildDaily(p, platform, start, end, version=upFactsVersion(p)) {
  const product=upProduct(p);
  const loss = upLossSeeds.get(p.spuId);
  const margin = loss ? -Math.max(6, loss.lossRate) : product.profit;
  const priceCents = upSamplePriceCents(p);
  const channelIndex = qrPlatforms.indexOf(platform);
  const targetWeights=[32,13,8,20,15,12];
  const rows = upRawQuality(product, platform, start, end).points.map(d => {
    const platformStart=product.platformStarts?.[platform];
    const onSale = d.date >= product.actualLaunch&&(!product.platformStarts||!!platformStart&&d.date>=platformStart);
    const sample=onSale?(upNewSuccessSampleDay(p,d,priceCents,channelIndex)||upGradeSampleDay(p,d,priceCents,channelIndex)):null;
    if(sample)d=sample.point;
    // 保留少量可核对的低动销样例场景；所有模块使用同一批逐日件数。
    const lowMovement = !sample&&p.sourceRow%6===0;
    // 固定日期生成变化，不使用随机数；任意区间拆分后仍能汇总一致。
    const monthIndex=Number(d.date.slice(0,4))*12+Number(d.date.slice(5,7));
    const slowUnits=Math.round((2+p.sourceRow/3)*[.75,1,1.25,.9][(monthIndex+p.sourceRow/6)%4]);
    const sales = !onSale ? 0 : lowMovement ? (Number(d.date.slice(8))%6===channelIndex ? slowUnits : 0) : d.sales;
    const dayIndex=Math.floor(Date.parse(d.date)/86400000);
    const returnPhase=((dayIndex+p.sourceRow+channelIndex)%7)/7;
    const receivedPhase=((dayIndex*2+p.sourceRow+channelIndex)%7)/7;
    const returned = !sales ? 0 : lowMovement ? upScaleSampleCount(d.returned,d.sales,sales,returnPhase) : Math.min(sales, d.returned);
    const received = lowMovement ? upScaleSampleCount(d.received,d.returned,returned,receivedPhase) : Math.min(returned, d.received);
    const orders = !sales ? 0 : Math.min(sales, lowMovement ? sales : d.orders);
    const contacts = Math.min(sales, lowMovement ? 0 : d.contacts);
    const qualityContacts=Math.min(contacts,d.qualityContacts??contacts),experienceContacts=contacts-qualityContacts;
    const reviews = Math.min(sales, lowMovement ? 0 : d.reviews);
    const bad = Math.min(reviews, lowMovement ? 0 : d.bad);
    const gmvCents = sales*priceCents, refundCents = returned*priceCents;
    // 仅少量SPU保留固定利润率说明持平，其余按日期呈现温和涨跌。
    const dailyMargin=sample?sample.profitRate:margin+(p.sourceRow%29===0?0:(1.6+p.sourceRow%3*.6)*Math.sin(dayIndex/37+p.sourceRow*.8));
    const gsvCents = gmvCents-refundCents, profitCents = Math.round(gsvCents*dailyMargin/100);
    // 推广消耗为固定样例，按SPU、平台、日期生成；不重复扣减既有利润。
    const expenseRate=8+(p.sourceRow%7)*1.1+channelIndex*.7+Math.sin(dayIndex/11+p.sourceRow)*1.2;
    const expenseCents=Math.round(gsvCents*expenseRate/100);
    // 明确配置的月目标按当月自然日分摊，跨平台/期间累计使用同一台账。
    const targetDays=p.sampleTargets?new Date(Date.UTC(+d.date.slice(0,4),+d.date.slice(5,7),0)).getUTCDate():30;
    const activeWeight=product.platformStarts?qrPlatforms.reduce((sum,name,i)=>sum+(product.platformStarts[name]&&product.platformStarts[name]<=d.date?targetWeights[i]:0),0):100;
    const targetCents = onSale&&activeWeight ? Math.round(version.target*1000000/targetDays*targetWeights[channelIndex]/activeWeight) : 0;
    return {date:d.date, sales, returned, received, orders, contacts, qualityContacts, experienceContacts, reviews, bad,
      gmvCents, refundCents, gsvCents, profitCents, expenseCents, costCents:gsvCents-profitCents,
      targetCents, targetProfitCents:Math.round(targetCents*version.margin/100)};
  });
  return rows;
}
const upQualityViews=new WeakMap();
function upQualityData(p, platform, start, end) {
  const data = upSummary(upIdentity(p),start,end,platform);
  // 汇总卡片不展开每日明细；保留原字段及可枚举points，仅图表读取时生成。
  const cached=upQualityViews.get(data);if(cached)return cached;
  const result={};
  for(const field of Object.keys(data))if(field!=='points')result[field]=data[field];
  for(const field of ['returnRate','receivedRate','badRate'])result[field]??=0;
  let points;
  Object.defineProperty(result,'points',{enumerable:true,get:()=>points??=data.points.map(d=>({...d,returnRate:qrRate(d.returned,d.sales),contactRate:qrRate(d.contacts,d.sales)}))});
  upQualityViews.set(data,result);
  return result;
}
