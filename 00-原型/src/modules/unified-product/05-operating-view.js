// 详情业绩表与贡献图共用六平台事实，保留旧函数名兼容排序入口。
const upOperatingChannels=filterCatalog.platforms;
function upOperatingChannelRows(platformRows,channelRows=[]){
 return salesChannelRows(platformRows,channelRows);
}
// 经营指标与趋势使用同一筛选期间。
function upOperatingView(m,state,showGrade) {
  const channelRows=upOperatingChannelRows(m.platformRows,m.channelRows||[]);
  const metrics=upGrid(upOperatingMetrics(m,state).filter(f=>f.key!=='sales'&&f.key!=='feeRate').map(f=>`<div class="up-metric" data-up-metric="${f.key}">
    <small data-up-basic="true">${esc(f.name)}</small><div class="up-operating-value"><strong class="${f.tone||''}">${numberSignalMain(f)}</strong><span class="up-operating-comparison ${f.targetTone}">${rpTargetText(f)}</span></div></div>`));
  return `<div class="up-operating-overview"><div class="up-operating-kpis">${metrics}</div>${upSalesTrend(m.current.points,{title:false})}</div>
    <section class="up-channel-section" aria-label="产品分平台业绩"><header class="up-channel-heading"><h3>产品分平台业绩</h3>${upChannelContributionNote(channelRows,m.company)}</header><div class="up-channel-comparison">
    <div class="up-platform-performance" aria-label="各平台业绩表格"><div class="up-table">${upChannelTable(channelRows,state)}</div></div>
    ${upChannelContributionView(channelRows,state,m.company)}</div></section>${showGrade&&state.platform==='all'?upGradeTrendView(m.product,state):''}`;
}

// 比较使用紧邻等长区间；复用六榜环比和退货偏差规则，避免单独维护阈值。
function upOperatingMetrics(m,state){
  const s=m.current,p=m.previous;
  const fields=[
    ['gsv','GSV',s.gsvCents,p.gsvCents,upMoney],
    ['sales','销量',s.sales,p.sales,formatSalesQuantity],
    ['netSales','去退后销量',s.sales-s.returned,p.sales-p.returned,formatSalesQuantity],
    ['expense','消耗',s.expenseCents,p.expenseCents,cents=>upMoney(cents).replace(/元$/,'')],
    ['feeRate','费率',s.feeRate,p.feeRate,upPercent],
    ['margin','利润率',s.profitRate,p.profitRate,upPercent]
  ].map(([key,name,now,before,format])=>{
    const comparison=key==='margin'?rpProfitRateComparison(now,before):key==='feeRate'?rpLossMarginComparison(now,before,{reverse:true}):
      {target:rpQualityChange(now,before),targetTone:rpQualityChangeTone(now,before)};
    return {key,name,value:format(now),tone:'',...comparison};
  });
  const {returnTarget:totalTarget,receivedTarget}=upReturnTargets(m,state);
  for(const [key,name,actual,target] of [['returned','总退',s.returnRate,totalTarget],['received','已收退',s.receivedRate,receivedTarget]]){
    const comparison=rpQualityReturnRule(actual,target,key);
    const noNumericSignal=(state.rankingKind===6||state.rankingKind===8)&&comparison.targetTone==='rp-quality-red';
    fields.push({key,name,value:upPercent(actual),...comparison,noNumericSignal});
  }
  return fields;
}

// 指标偏差与趋势辅助线共用目标，保持平台、期间口径一致。
function upReturnTargets(m,state){
 const product=upIdentity(m.product),channels=upChannels(state.platform);
 if(channels.length===1)return qrbReturnTargets(product,channels[0]);
 let sales=0,weighted=0,complete=true;
 for(const channel of channels){const n=upSummary(product,state.start,state.end,channel).sales;if(n<=0)continue;const target=qrbReturnTargets(product,channel).receivedTarget;sales+=n;if(Number.isFinite(target))weighted+=n*target;else complete=false}
 return {returnTarget:rpLossReturnTarget(product,state.platform,state.start,state.end),receivedTarget:complete&&sales?weighted/sales:null};
}
