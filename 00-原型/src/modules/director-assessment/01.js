

// Director assessment uses the selected channel and the same period GMV as its list.
function naFacts(p,period=periodFor('new')){
 const b=bounds(period),days=Math.max(1,Math.min(p.days,aiFlowDayDiff(b.start,b.cutoff)+1)),monthly=p.sales/days*30,target=dpStore.newTargets[p.chain],attain=monthly/target*100;
 const rating=p.state==='滞销'||attain<50?'滞销':attain>=100&&p.profit>=dpStore.marginTarget&&p.returnRate<=8&&p.state==='在售'?'优质':'平庸';
 return {rating,monthly,target,attain,days,marginTarget:dpStore.marginTarget,tone:{优质:'green',平庸:'orange',滞销:'red'}[rating]};
}
function naSeries(p,period){
 const b=bounds(period),start=[b.start,shiftDate(b.cutoff,-29)].sort()[0],launch=shiftDate(b.cutoff,1-p.days),count=aiFlowDayDiff(start,b.cutoff)+1;
 const raw=newProductTrendData(p,b.cutoff,count,[{name:p.channel,color:'#7773ed'}],launch)[0],inPeriod=raw.points.filter(d=>d.date>=b.start),total=inPeriod.reduce((s,d)=>s+d.salesCents,0),target=Math.round(p.sales*1000000),scale=total?target/total:0,allocated=splitTarget(target,inPeriod.map(d=>d.salesCents));let index=0;
 return {...raw,points:raw.points.map(d=>{const salesCents=d.date>=b.start?allocated[index++]:Math.round(d.salesCents*scale),unitCents=d.volume?d.salesCents/d.volume:0,volume=unitCents?Math.round(salesCents/unitCents):0;return {...d,salesCents,revenue:salesCents/1000000,volume}})};
}
function naAdvice(p,f){
 const weak=p.profit<f.marginTarget,returns=p.returnRate>8;
 return [
 ['推广',weak||returns?'先处理风险':f.rating==='优质'?'优先推广':f.rating==='滞销'?'控制投入':'限额测试',weak?'利润率未达标，先修复单品利润，再扩大投放。':returns?'退货率超过8%演示预警线，先核查售后原因。':f.rating==='优质'?'围绕当前渠道复制有效内容，小步增加投放并核对利润。':f.rating==='滞销'?'暂停低效扩量，仅保留小规模需求验证。':'用7天小预算测试卖点、受众和内容，达标后再扩量。'],
 ['调价',weak?'守住利润底线':f.rating==='滞销'?'评估促销价':'小范围验证',weak?`以利润率达到${fmt(f.marginTarget,1)}%为目标，先拆解费用，测算可承受促销价。`:f.rating==='滞销'?'结合库存与单台成本测算促销方案，避免只降价不增量。':'测试组合装或优惠券，对比销量、GMV与利润后决定价格。'],
 ['迭代',returns||p.state==='整改'?'优先整改':f.rating==='优质'?'小步优化':'验证需求',returns||p.state==='整改'?'按退货原因和用户反馈定位主要问题，复测通过后恢复放量。':f.rating==='优质'?'保留成熟卖点，优先改进高频体验问题，避免大幅改版。':'收集未转化与退货反馈，7天内明确一个卖点或体验优化方向。'],
 ['清库',f.rating==='滞销'?'优先评审':'暂不建议',f.rating==='滞销'?'先核对库存、库龄和保本价；若优化无效，提交分批清库方案。':'当前不直接清库；持续跟踪动销，出现积压后再评审。']
 ];
}
function openNewAssessment(id){withPeriod('new',()=>{
 const period={...periodFor()},p=productRows(true).find(r=>r.id===+id);if(!p)return;
 const f=naFacts(p,period),b=bounds(period),series=naSeries(p,period),advice=naAdvice(p,f);let start=shiftDate(b.cutoff,-29),end=b.cutoff;
 openModal('AI 新品评估 · '+p.name,`<article class="na-assessment"><header class="na-hero" data-product-summary><div>${riskThumbnail(p.name)}<div><h2>${esc(p.name)}</h2><p>${esc(p.model)} · ${esc(chains[p.chain])} · ${esc(p.brand)} · ${esc(p.channel)}</p><small>上架 ${p.days} 天 · 产品等级 ${p.grade}</small></div></div><span class="tag ${f.tone}">AI 评级 · ${f.rating}</span></header><section class="na-verdict"><span class="ai-logo" aria-hidden="true"><b>AI</b></span><div><strong>${f.rating==='优质'?'具备推广基础，优先验证扩量':f.rating==='滞销'?'动销不足，先止损并评审优化方案':'表现尚待提升，优先验证转化与利润'}</strong><p>月均 GMV 达成 ${fmt(f.attain,1)}% · 利润率 ${fmt(p.profit,1)}% · 总退货率 ${fmt(p.returnRate,1)}%</p></div></section><div class="na-metrics">${[['本期 GMV',fmt(p.sales,1)+' 万元'],['月均 GMV / 目标',fmt(f.monthly,1)+' / '+fmt(f.target,1)+' 万元'],['单品利润率',fmt(p.profit,1)+'%'],['总退货率',fmt(p.returnRate,1)+'%']].map(([k,v])=>`<div><small>${k}</small><strong>${v}</strong></div>`).join('')}</div><section class="na-actions"><h3>经营建议</h3><div>${advice.map(([title,label,body])=>`<section><h4>${title}<span>${label}</span></h4><p>${body}</p></section>`).join('')}</div></section><section class="na-trends"><div class="na-trend-head"><h3>销量与 GMV 趋势 <small>${esc(p.channel)}</small></h3><div class="nt-range-picker"><button id="na-recent" aria-pressed="true">近30天</button><button id="na-custom" aria-pressed="false">自定义日期</button></div></div><form id="na-date-form" class="nt-custom-range" hidden><label>开始日期<input id="na-start" type="date" min="${series.points[0].date}" max="${b.cutoff}" value="${start}" required></label><label>结束日期<input id="na-end" type="date" min="${series.points[0].date}" max="${b.cutoff}" value="${end}" required></label><button class="btn small" type="submit">应用</button><span id="na-error" role="alert"></span></form><p id="na-range" class="note"></p><div id="na-charts" class="nt-chart-grid"></div></section><details class="na-rules"><summary>评级与数据口径 · 演示</summary><p>滞销：月均 GMV 完成率＜50%，或销售状态为滞销。优质：月均 GMV 完成率≥100%、利润率≥${fmt(f.marginTarget,1)}%、退货率≤8%且在售。其余为平庸；评级与 ABCD 产品等级分开显示。</p><p>月均 GMV＝本期 GMV ÷ 本期已上架天数 ×30；目标沿用品类月均销售目标。评级基于本期数据，切换趋势日期不改变评级。${p.days<14?'上架不足14天，评级仅作阶段性参考。':''}</p><p>本期 ${b.start} — ${b.cutoff}，GMV 与新品列表一致。每日 GMV 为演示分布，销量按演示成交单价折算；未上架日期为0，跨本期的趋势日期按同一系数模拟。库存和库龄尚未纳入本评估，清库建议需核对库存后执行。</p></details></article>`,false,periodLabel(period)+' · '+b.start+' — '+b.cutoff+' · '+p.channel);
 const render=()=>{const selected={...series,points:series.points.filter(d=>d.date>=start&&d.date<=end)},totals=newTrendTotals([selected]),metrics=[{key:'volume',name:'销量',unit:'件',digits:0,value:totals.volume},{key:'revenue',name:'GMV',unit:'万元',digits:2,value:totals.revenue}];$('#na-range').textContent=start+' — '+end+' · '+selected.points.length+' 天';$('#na-charts').innerHTML=metrics.map(m=>`<section class="nt-chart"><div class="nt-chart-heading"><h3>${m.name}趋势</h3><strong>${fmt(m.value,m.digits)} ${m.unit}</strong></div>${newTrendChart([selected],m)}</section>`).join('');};
 $('#na-custom').onclick=()=>{$('#na-date-form').hidden=false;$('#na-start').focus()};
 $('#na-recent').onclick=()=>{start=shiftDate(b.cutoff,-29);end=b.cutoff;$('#na-start').value=start;$('#na-end').value=end;$('#na-date-form').hidden=true;$('#na-error').textContent='';$('#na-recent').setAttribute('aria-pressed','true');$('#na-custom').setAttribute('aria-pressed','false');render()};
 $('#na-date-form').onsubmit=e=>{e.preventDefault();const from=$('#na-start').value,to=$('#na-end').value;if(!from||!to||from>to||from<series.points[0].date||to>b.cutoff){$('#na-error').textContent='请选择有效日期范围，开始日期不能晚于结束日期';return}start=from;end=to;$('#na-error').textContent='';$('#na-recent').setAttribute('aria-pressed','false');$('#na-custom').setAttribute('aria-pressed','true');render()};
 $('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn primary small" id="productdraft">生成工作草稿</button>');
 
 $('#productdraft').onclick=()=>draft(p.name+' · '+f.rating+'新品经营优化');render();
 });}
const naPreviousProductDetail=productDetail;
productDetail=function(isNew,id,...args){return isNew&&dpState.view==='director'?openNewAssessment(id):naPreviousProductDetail(isNew,id,...args)};