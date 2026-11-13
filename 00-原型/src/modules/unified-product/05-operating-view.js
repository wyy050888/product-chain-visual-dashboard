// 详情业绩表与贡献图共用六平台事实，保留旧函数名兼容排序入口。
const upOperatingChannels=filterCatalog.platforms;
function upOperatingChannelRows(platformRows,channelRows=[]){
 return salesChannelRows(platformRows,channelRows);
}
// 经营指标按筛选期间，日筛选的右侧达成使用结束日所在月份。
function upOperatingView(m,state) {
  const s=m.current,{actual:a,targets:t,prefix,progress}=m.attainment;
  const channelRows=upOperatingChannelRows(m.platformRows,m.channelRows||[]);
  const metrics=upGrid(upOperatingMetrics(m,state).map(f=>`<div class="up-metric" data-up-metric="${f.key}">
    <small data-up-basic="true">${esc(f.name)}</small><div class="up-operating-value"><strong class="${f.tone||''}">${numberSignalMain(f)}</strong><span class="up-operating-comparison ${f.targetTone}">${rpTargetText(f)}</span></div></div>`));
  const hasTarget=!!upIdentity(m.product)?.sampleTargets||m.product.cohort==='new'||sampleSpus.find(p=>p.spuId===m.product.spuId)?.cohort==='new';
  const target=hasTarget?t.targetCents:null;
  const targetMargin=hasTarget&&target>0?t.targetProfitCents/target*100:null;
  // 与销售达成卡片一致：规模达成为实际利润 / 目标利润，缺目标不推算。
  const scale=hasTarget&&t.targetProfitCents>0?msAchievementRatio(a.profitCents,t.targetProfitCents):null;
  const gsvRate=msAchievementRatio(a.gsvCents,target);
  const gsvDeviation=gsvRate===null?null:gsvRate-progress,scaleDeviation=scale===null?null:scale-progress;
  const marginGap=Number.isFinite(targetMargin)&&Number.isFinite(a.profitRate)?a.profitRate-targetMargin:null;
  const gapText=Number.isFinite(marginGap)?(marginGap>=0?'+':'')+upPercent(marginGap):'—';
  const gapTone=Number.isFinite(marginGap)?(marginGap>=0?'green':marginGap< -10?'red':'orange'):'';
  const width=Number.isFinite(scale)?Math.min(100,Math.max(0,scale)):0;
  const targets=`<section class="up-attainment" aria-label="达成情况">
    <div class="up-attainment-primary">
      <div><small>${prefix}GSV</small><strong>${upMoney(a.gsvCents)}</strong><div class="up-attainment-delta"><span>差额</span> <span class="${msTone(gsvDeviation)}">${target===null?'—':upMoney(target-a.gsvCents,true)}</span></div></div>
      <div><small>${prefix}利润率</small><strong>${upPercent(a.profitRate)}</strong><div class="up-attainment-delta"><span>差额</span> <span class="${gapTone}">${gapText}</span></div></div>
    </div>
    <div class="up-attainment-goal"><span>${prefix}GSV目标</span><span class="up-attainment-values"><span>${target===null?'—':upMoney(target)}</span>${msInlineDeviation(gsvDeviation)}</span></div>
    <div class="up-attainment-rate"><span>${prefix}规模达成率</span><span class="up-attainment-values"><span>${upPercent(scale)}</span>${msInlineDeviation(scaleDeviation)}</span></div>
    <div class="up-attainment-progress" role="progressbar" aria-label="规模达成率" aria-valuemin="0" aria-valuemax="100" ${Number.isFinite(scale)?`aria-valuenow="${width}"`:''} aria-valuetext="${Number.isFinite(scale)?upPercent(scale):'未配置目标'}"><i style="width:${width}%;background:var(--${msTone(scaleDeviation)})"></i></div>
  </section>`;
  return `<div class="up-operating-overview"><div class="up-operating-kpis">${metrics}</div>${targets}</div>${upSalesTrend(s.points)}
    <section class="up-channel-section" aria-label="产品分平台业绩"><header class="up-channel-heading"><h3>产品分平台业绩</h3>${upChannelContributionNote(channelRows,m.company)}</header><div class="up-channel-comparison">
    <div class="up-platform-performance" aria-label="各平台业绩表格"><div class="up-table">${upChannelTable(channelRows,state)}</div></div>
    ${upChannelContributionView(channelRows,state,m.company)}</div></section>${state.platform==='all'?upGradeTrendView(m.product,state):''}`;
}

// 比较使用紧邻等长区间；复用六榜环比和退货偏差规则，避免单独维护阈值。
function upOperatingMetrics(m,state){
  const s=m.current,p=m.previous;
  const fields=[
    ['gsv','GSV',s.gsvCents,p.gsvCents,upMoney],
    ['sales','销量',s.sales,p.sales,formatSalesQuantity],
    ['netSales','去退后销量',s.sales-s.returned,p.sales-p.returned,formatSalesQuantity],
    ['expense','消耗',s.expenseCents,p.expenseCents,upMoney],
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
