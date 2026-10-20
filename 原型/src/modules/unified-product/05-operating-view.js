// 渠道表与贡献图共用GSV默认顺序和期间汇总，缺失置后。
const upOperatingChannels=['百度&CID','天猫','京东','抖音','一类达播','商务达播','快手','拼多多','视频号'];
function upOperatingChannelRows(rows){
 const byChannel=new Map(rows.map(row=>[row.platform,row]));
 return upOperatingChannels.map(platform=>byChannel.get(platform)||{platform}).sort((a,b)=>{
  const hasA=Number.isFinite(a.gsvCents),hasB=Number.isFinite(b.gsvCents);
  return Number(hasB)-Number(hasA)||(hasA&&hasB?b.gsvCents-a.gsvCents:0);
 });
}
// 经营指标按筛选期间，日筛选的右侧达成使用结束日所在月份。
function upOperatingView(m,state) {
  const s=m.current,{actual:a,targets:t,prefix,progress}=m.attainment;
  const channelRows=upOperatingChannelRows(m.platformRows);
  const metrics=upGrid(upOperatingMetrics(m,state).map(f=>`<div class="up-metric" data-up-metric="${f.key}">
    <small data-up-basic="true">${f.name}</small><div class="up-operating-value"><strong class="${f.tone||''}">${esc(f.value)}</strong><span class="up-operating-comparison ${f.targetTone}">${rpTargetText(f)}</span></div></div>`));
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
    <div class="up-attainment-progress" role="progressbar" aria-label="规模达成率" aria-valuemin="0" aria-valuemax="100" ${Number.isFinite(scale)?`aria-valuenow="${width}"`:''} aria-valuetext="${Number.isFinite(scale)?upPercent(scale):'未配置目标'}"><i style="width:${width}%"></i></div>
  </section>`;
  return `<div class="up-operating-overview"><div class="up-operating-kpis">${metrics}</div>${targets}</div>${upSalesTrend(s.points)}
    <section class="up-channel-section" aria-label="各渠道业绩数据"><header class="up-channel-heading"><h3>各渠道业绩数据</h3>${upChannelContributionNote(channelRows)}</header><div class="up-channel-comparison">
    <div class="up-platform-performance" aria-label="各渠道业绩表格"><div class="up-table">${upChannelTable(channelRows,state)}</div></div>
    ${upChannelContributionView(channelRows,state)}</div></section>${state.platform==='all'?upGradeTrendView(m.product,state):''}`;
}

// 比较使用紧邻等长区间；复用六榜环比和退货偏差规则，避免单独维护阈值。
function upOperatingMetrics(m,state){
  const s=m.current,p=m.previous;
  const fields=[
    ['gsv','GSV',s.gsvCents,p.gsvCents,upMoney],
    ['sales','销量',s.sales,p.sales,fmt],
    ['netSales','去退后销量',s.sales-s.returned,p.sales-p.returned,fmt],
    ['expense','消耗',s.expenseCents,p.expenseCents,upMoney],
    ['feeRate','费率',s.feeRate,p.feeRate,upPercent],
    ['margin','利润率',s.profitRate,p.profitRate,upPercent]
  ].map(([key,name,now,before,format])=>({key,name,value:format(now),
    tone:key==='margin'&&now<0?'red':'',...rpLossMarginComparison(now,before)}));
  const {returnTarget:totalTarget,receivedTarget}=upReturnTargets(m,state);
  for(const [key,name,actual,target] of [['returned','总退',s.returnRate,totalTarget],['received','已收退',s.receivedRate,receivedTarget]])
    fields.push({key,name,value:upPercent(actual),...rpQualityReturnRule(actual,target)});
  return fields;
}

// 指标偏差与趋势辅助线共用目标，保持平台、期间口径一致。
function upReturnTargets(m,state){
 return {returnTarget:rpLossReturnTarget(upIdentity(m.product),state.platform,state.start,state.end),receivedTarget:8};
}
