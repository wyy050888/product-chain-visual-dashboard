

// Fixed director metrics share one calculation between cards, lists and details.
const rfTitles={1:'店铺风险榜',2:'亏损产品榜',3:'库存风险榜',4:'呆滞产品榜',6:'退货恶化榜'};
const rfNames={1:['店铺GSV','店铺分','商品分','物流分','服务分','平台罚款'],2:['亏损金额','利润率','GSV','销量','退货率','已收退货率'],3:['滞销库存货值','滞销库存数','周转率','可售天数','期间销量','GSV'],4:['库存周转天数','滞销库存货值','期间销量','滞销金额','库存总量','动销率'],6:['总退货率','总退环比增长','已收退货率','已收退环比增长','利润率','GSV']};
const rfState={kind:1,page:1,dimension:'spu',listPlatforms:{1:'all',6:'all'}};
const rfDemo={componentScore:4.6,coverageMin:15,coverageMax:90,slowTurnDays:60,slowSales30:20,slowStockDays:90,slowSellThrough:5};
function rfSlowFacts(r){
 const period=bounds(),periodDays=Math.max(1,aiFlowDayDiff(period.start,period.cutoff)+1),sales=riskObservation(4,r).shipped||0,turnDays=r.turn>0?periodDays/r.turn:r.num>0?null:0,stockLimit=Math.ceil(sales/periodDays*rfDemo.slowStockDays),sellThrough=r.num+sales>0?sales/(r.num+sales)*100:0;
 return {periodDays,sales,turnDays,stockLimit,sellThrough};
}
function rfMetric(name,value,hit,rule){return {name,value,hit:hit===null?null:!!hit,rule}}
function rfReturnFacts(r){
 const priceCents=Math.round(r.price*100),gmvCents=r.shipped*priceCents,refundCents=r.returned*priceCents,gsvCents=gmvCents-refundCents,previousGsvCents=(r.previousShipped-r.previousReturned)*priceCents,profile=(r.productId+qrPlatforms.indexOf(r.channel))%6,costCents=Math.round(gmvCents*[.84,.90,.78,.88,.96,.80][profile]),profitCents=gsvCents-costCents;
 return {gmvCents,refundCents,gsvCents,previousGsvCents,costCents,profitCents,profitRate:gsvCents>0?profitCents/gsvCents*100:null,targetCents:Math.round(previousGsvCents*1.05),receivedLimit:null};
}
function rfGrowth(value,current,previous){return previous===0?(current>0?'新增':'0.0%'):rrSigned(value,1,'%')}
function rfGrowthHit(value,current,previous){return previous===0?current>0:value>=10}
function rfFacts(k,r){
 const cutoff=bounds().cutoff;
 if(k===6){
  const f=rfReturnFacts(r);
  return [rfMetric('总退货率',fmt(r.returnRate,1)+'%',r.returnRate>r.returnTarget,'所选周期退货件数÷发货件数；高于目标 '+fmt(r.returnTarget,1)+'% 标红'),rfMetric('总退环比增长',rfGrowth(r.growth,r.returnRate,r.previousRate),rfGrowthHit(r.growth,r.returnRate,r.previousRate),'总退货率较上期等长周期增长≥10%标红；上期为0且本期新增时标红'),rfMetric('已收退货率',fmt(r.receivedRate,1)+'%',null,'所选周期消费者签收后退货件数÷同期发货件数'),rfMetric('已收退环比增长',rfGrowth(r.receivedGrowthRate,r.received,r.prevReceived),rfGrowthHit(r.receivedGrowthRate,r.received,r.prevReceived),'已收退件数较上期等长周期增长≥10%标红；上期为0且本期新增时标红'),rfMetric('利润率',f.profitRate===null?'无净销售':fmt(f.profitRate,1)+'%',f.profitRate===null||f.profitRate<10,'演示净利润÷GSV；低于10%或无净销售标红'),rfMetric('GSV',pfMoneyYuan((f.gsvCents/1000000)*10000),f.gsvCents<f.targetCents,'所选周期退款后净销售额；演示目标为上期等长周期GSV×105%：'+pfMoneyYuan((f.targetCents/1000000)*10000))];
 }
 if(k===4){
  const f=rfSlowFacts(r);
  return [rfMetric('库存周转天数',f.turnDays===null?'无周转':fmt(f.turnDays,1)+'天',f.turnDays===null||f.turnDays>rfDemo.slowTurnDays,'所选周期已统计天数÷同期库存周转率；演示：超过60天或有库存无周转为红色'),rfMetric('滞销库存货值',pfMoneyYuan((r.amount)*10000),r.amount>0,'沿用呆滞库存货值台账；金额＞0为红色'),rfMetric('期间销量',fmt(f.sales)+'件',f.sales<Math.ceil(rfDemo.slowSales30*f.periodDays/30),'与详情所选周期销量趋势合计一致；演示：30天基准20件，按所选天数折算目标'),rfMetric('滞销金额',pfMoneyYuan((r.amount)*10000),r.amount>0,'当前演示与滞销库存货值采用同一口径，不重复相加；金额＞0为红色'),rfMetric('库存总量',fmt(r.num)+'件',r.num>f.stockLimit,'仓内期末库存；超过所选周期日均销量×90天（'+fmt(f.stockLimit)+'件）为红色'),rfMetric('动销率',fmt(f.sellThrough,1)+'%',f.sellThrough<rfDemo.slowSellThrough,'单品演示口径：所选周期销量÷（所选周期销量＋期末库存）；低于5%为红色')];
 }
 if(k===1){
  const period=riskShopPeriod(r),target=period.target,gsv=period.gsv,scoreRisk=sbScoreRisk(r),scoreHit=!!scoreRisk;
  return [rfMetric('店铺GSV',pfMoneyYuan((gsv)*10000),gsv<target,'所选周期GSV低于截至当前日期的目标 '+fmt(target,2)+' 万元'),rfMetric('店铺分',fmt(r.score,2),scoreHit,'沿用平台及店铺类型评分规则，命中原红灯或黄灯区间均按异常显示红色'),...['productScore','logisticsScore','serviceScore'].map((key,i)=>rfMetric(rfNames[1][i+2],fmt(r[key],2),r[key]<rfDemo.componentScore,'演示阈值：低于 '+rfDemo.componentScore+' 分为红色')),rfMetric('平台罚款',pfMoneyYuan(period.fine),period.fine>0,'所选周期罚款金额＞0为红色；金额沿用平台品质罚款演示台账')];
 }
 if(k===2){
  const period=riskLossPeriod(r),sales=period.sales,returned=period.returned,rate=period.rate,gsv=+period.gsv.toFixed(2),profit=-period.loss,margin=gsv?profit/gsv*100:0,target=+(gsv/[.78,1.1,.89,1.15][r.id%4]).toFixed(2),salesTarget=Math.ceil(sales/[.82,1.12,1.06,.75][r.id%4]),returnTarget=[4,6,5,4][r.id%4],received=period.received,receivedRate=period.receivedRate,receivedTarget=null;
  return [rfMetric('亏损金额',brLossAmount(Math.max(0,-profit))+'万',profit<0,'同期亏损金额以负数展示'),rfMetric('利润率',fmt(margin,1)+'%',margin<10,'利润÷GSV；低于10%为红色'),rfMetric('GSV',pfMoneyYuan((gsv)*10000),gsv<target,'所选周期净销售额；演示目标 '+fmt(target,2)+' 万元'),rfMetric('销量',fmt(sales),sales<salesTarget,'所选周期发货销量；演示目标 '+fmt(salesTarget)+' 件'),rfMetric('退货率',fmt(rate,1)+'%',rate>returnTarget,'所选周期退货件数÷发货销量；演示目标 '+returnTarget+'%'),rfMetric('已收退货率',fmt(receivedRate,1)+'%',null,'所选周期消费者签收后退货件数÷发货销量；已收退 '+fmt(received)+'，销量 '+fmt(sales))];
 }
 const series=irSalesSeries(r).points,periodDays=riskRange().days,last15=series,sales=last15.reduce((s,p)=>s+p.volume,0),staleUnits=Math.round(r.num*r.staleCents/Math.max(1,r.amountCents)),coverage=sales?r.warehouse/(sales/periodDays):null,unitPrice=r.financePriceCents/100*1.35,gsv=+(sales*unitPrice*(1-r.returnRate/100)/10000).toFixed(2),salesTarget=Math.max(periodDays,Math.ceil(r.warehouse/60*periodDays)),gsvTarget=+(salesTarget*unitPrice*(1-r.returnRate/100)/10000).toFixed(2),turnHit=ipSignal('turn',r.turn)==='red',unit=ipPeriod().unit;
 return [rfMetric('滞销库存货值',pfMoneyYuan((r.stale)*10000),r.stale>0,'沿用呆滞库存货值台账，金额＞0为红色'),rfMetric('滞销库存数',fmt(staleUnits)+'件',staleUnits>0,'按呆滞货值占仓内货值比例折算库存数量；数量＞0为红色'),rfMetric('周转率',r.turn===null?'—':fmt(r.turn,2)+'次/'+unit,turnHit,'所选周期出库成本÷平均库存成本，折算月均低于2次为红色'),rfMetric('可售天数',coverage===null?'无动销':fmt(coverage,1)+'天',coverage===null||coverage<rfDemo.coverageMin||coverage>rfDemo.coverageMax,'仓内可售库存÷所选周期日均销量；演示正常区间15—90天，无动销也标红'),rfMetric('期间销量',fmt(sales)+'件',sales<salesTarget,'所选周期销量趋势合计；演示目标 '+fmt(salesTarget)+' 件'),rfMetric('GSV',pfMoneyYuan((gsv)*10000),gsv<gsvTarget,'所选周期净销售额；演示目标 '+fmt(gsvTarget,2)+' 万元')];
}
function rfCell(m){return `<span class="rf-value ${m.hit===null?'':m.hit?'red':'green'}" aria-label="${esc(m.name+' '+m.value+' '+(m.hit===null?'':m.hit?'异常':'正常'))}"><i></i>${esc(m.value)}</span>`}
function rfRows(k){return k===1?brFilteredShops():riskRows(k)}
function rfProduct(k,r,full=false){return `<span class="rf-product">${riskThumbnail(r.name,k===1)}<span><b>${esc(r.name)}</b><small>${esc(k===1?r.channel+(full?' · '+r.shopType:'')+(r.shopId?' · ID：'+r.shopId:''):(r.model||r.spu)+(full?' · '+chains[r.chain]+' · '+r.brand:'')+(k===6?' · '+r.channel:''))}</small></span></span>`}
function rfCard(k){const rows=rfRows(k),filter=k===1?`<select id="br-card-platform" aria-label="店铺风险平台">${brOptions(brState.platform)}</select>`:k===6?`<select data-rr-platform aria-label="退货恶化平台">${rrOptions()}</select>`:(k===3||k===4)?`<label class="sr-filter-label">产品属性 <select data-risk-season="${k}" aria-label="${k===3?'库存':'滞销'}产品属性">${srSeasonOptions(k)}</select></label>`:'<span>按亏损绝对值排序</span>';
 return `<div class="rhead"><h3><i class="riskbadge"></i>${rfTitles[k]}</h3><button class="link" data-risk="${k}">全部 ${rows.length} ›</button></div><div class="qr-card-filter">${filter}<span>逐项红绿灯</span></div>${rows.slice(0,6).map((r,i)=>`<button class="rf-rank-row" data-riskitem="${k},${r.id}"><span class="rf-rank-head"><span class="rank ${i<3?'top':''}">${String(i+1).padStart(2,'0')}</span>${rfProduct(k,r)}</span><span class="rf-indicators">${rfFacts(k,r).map(m=>`<span><small>${m.name}</small>${rfCell(m)}</span>`).join('')}</span></button>`).join('')||'<div class="empty">当前范围暂无风险记录</div>'}<div class="qr-card-date">${riskRangeText()}</div>`}
const rfPreviousRender=renderRisks;
renderRisks=function(...args){const result=rfPreviousRender(...args);withPeriod('risk',()=>{for(const k of [1,2,3,4,6]){const card=$(`#riskrail [data-risk="${k}"]`)?.closest('.riskcard');if(card){card.classList.add('rf-card');card.innerHTML=rfCard(k)}}});return result};
const rfPreviousTitle=directorRiskTitle;
directorRiskTitle=function(title){return rfPreviousTitle(title).replaceAll('劣质店铺榜','店铺风险榜')};
function rfRuleRows(k){if(k===6)return [
 ['总退货率','退货件数÷同期发货件数','高于总退货率目标红色，未超过绿色'],
 ['总退环比增长','（本期总退货率−上期等长周期总退货率）÷上期等长周期总退货率','增长≥10%红色，其余绿色'],
 ['已收退货率','所选周期消费者签收后退货件数÷同期发货件数×100%','仅展示实际值'],
 ['已收退环比增长','（本期已收退件数−上期等长周期件数）÷上期等长周期件数','增长≥10%红色，其余绿色；按件数环比，不是退货率之差'],
 ['利润率','演示净利润÷GSV×100%','＜10%红色；≥10%绿色；无净销售红色'],
 ['GSV','GMV−退款金额','低于上期等长周期GSV×105%的演示目标红色，否则绿色'],
 ['新增退货','上期无退货，本期发生退货','红色预警']
 ];if(k===4)return [
 ['库存周转天数','所选周期已统计天数÷库存周转率','＞60天红色；≤60天绿色；有库存无周转红色'],
 ['滞销库存货值','对应产品呆滞库存台账金额','＞0红色；0绿色'],
 ['期间销量','详情销量趋势各日期区间合计','按30天20件折算所选周期目标；低于目标红色'],
 ['滞销金额','演示中与滞销库存货值采用相同口径','＞0红色；0绿色；两项金额不叠加'],
 ['库存总量','仓内期末库存数量','超过所选周期日均销量×90天红色；否则绿色'],
 ['动销率','所选周期销量÷（所选周期销量＋期末库存）×100%','单品演示口径；＜5%红色，≥5%绿色']
 ];return k===1?[
 ['店铺GSV','所选周期净销售额，与截至当前日期的目标比较','低于期间目标红色；其余绿色'],['店铺分','沿用平台与店铺类型评分规则','原红/黄预警区间均用红色标记；未命中绿色'],['商品 / 物流 / 服务分','分别按5分制展示','演示：＜4.6分红色；≥4.6分绿色'],['平台罚款','所选周期平台品质罚款金额','＞0红色；0绿色']
 ]:k===2?[
 ['亏损金额','亏损金额以负数展示；按绝对值排序','亏损金额＜0红色'],['利润率','利润÷GSV×100%','＜10%红色；其余绿色'],['GSV / 销量','所选周期净销售额 / 发货件数','低于各产品演示目标红色'],['退货率','所选周期退货件数÷发货件数','超过产品目标红色；目标见指标提示'],['已收退货率','所选周期消费者签收后退货件数÷发货件数','仅展示实际值']
 ]:[['滞销库存货值 / 数量','呆滞货值台账；数量按货值占比折算','＞0红色；0绿色'],['周转率','周期出库成本÷平均库存成本','折算月均＜2次红色'],['可售天数','仓内可售库存÷所选周期日均销量','演示：＜15天或＞90天红色；无动销红色'],['销量 / GSV','所选周期销量 / 净销售额','低于各产品演示目标红色；目标见指标提示']]}
const rfPreviousRules=rdRules;
rdRules=function(k){if(!wfDirector()||![1,2,3,4,6].includes(k))return rfPreviousRules(k);return `<div class="rd-rule-content">${table(['固定指标','计算口径','红绿灯'],rfRuleRows(k))}<p>${k===2?'当前为演示数据，卡片和榜单按全公司SPU汇总，详情可切换渠道。公司已收退件数沿用同期退货件数按78%／85%／92%模拟并取整，渠道明细合计与公司一致，已收退货率＝已收退件数÷销量。GSV、销量目标沿用模拟数据。':k===6?'本期为所选周期，对比紧邻的上期等长周期，按产品与平台分别计算。总退沿用现有演示目标；已收退展示实际值。GSV、成本、利润为补充模拟数据：按同价整件退款，成本含采购、营销及售后等费用。不能通过延迟收退入库降低风险。':k===4?'演示阈值：周转60天、销量20件、库存覆盖90天、动销率5%。库存总量指仓内期末库存，不包含工厂及在制物料。动销率采用单品售出数量占比，不是链群动销SKU占比。':'当前为演示数据。GSV、销量目标为补充模拟数据；GSV以销售额扣除模拟退款计算，库存商品演示成交价＝财务价×1.35。'}每项独立判灯，绿色仅表示该项未触发；不代表店铺或产品的全部风险解除。</p><details><summary>原有综合风险与入榜规则</summary>${rfPreviousRules(k)}</details></div>`};