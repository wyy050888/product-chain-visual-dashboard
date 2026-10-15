

// Director sales-success ledger. Each SPU has one aggregate backed by platform rows.
const nsPlatforms=['抖音','快手','视频号','天猫','京东','拼多多'];
const nsHeaders=['SPU名称','产品型号','产品简称','产品归属','产品类别','产品分类','上线日期','上线天数','价格','GSV','GSV目标','规模达成率','利润额','利润率','利润达成率','退货率'];
let nsPlatform='all',nsScopeKey='';
const nsMoney=v=>pfMoneyYuan((v/10000)*10000);
const nsRate=v=>v===null?'—':fmt(v,1)+'%';
function nsLight(v){return v===null?'none':v>=100?'green':v>=80?'orange':'red'}
function nsAttainment(v){const tone=nsLight(v),label={none:'无目标',green:'已达标',orange:'接近目标',red:'未达标'}[tone];return `<span class="ns-attainment ${tone}" title="${label}" aria-label="${nsRate(v)}，${label}"><i></i>${nsRate(v)}</span>`}
function nsSummarize(p,rows){
 const sum=k=>rows.reduce((n,r)=>n+r[k],0),gsvCents=sum('gsvCents'),targetCents=sum('targetCents'),profitCents=sum('profitCents'),targetProfitCents=sum('targetProfitCents'),units=sum('units'),returns=sum('returns');
 return {...p,gsvCents,targetCents,profitCents,targetProfitCents,units,returns,gsv:gsvCents/100,gsvTarget:targetCents/100,profitAmount:profitCents/100,targetProfit:targetProfitCents/100,price:units?gsvCents/100/units:0,scaleRate:targetCents?gsvCents/targetCents*100:null,profitRate:gsvCents?profitCents/gsvCents*100:0,profitAttainment:targetProfitCents?profitCents/targetProfitCents*100:null,returnRate:units?returns/units*100:0};
}
function nsSalesFacts(rows){
 const b=bounds(),elapsed=Math.max(0,aiFlowDayDiff(b.start,b.cutoff)+1);
 return rows.map(p=>{
  const activeDays=Math.min(p.days,elapsed),basePrice=[1299,399,599,299][p.chain]+(p.id%5)*50;
  const targetCents=Math.round(dpStore.newTargets[p.chain]*10000*activeDays/30*100),ratio=[.72,.93,1.12,1.28,.86,1.06,.58,1.35][p.id%8],gsvCents=Math.round(targetCents*ratio),profitCents=Math.round(gsvCents*p.profit/100);
  const ownership=['公司产品','一类自选','一类一盘货'][p.id%3],meta={...p,shortName:p.name.replace(/智能|静音|便携|家用|无线|可视|高速|声波|多功能|轻量|节能/g,'')||p.name,ownership,productType:ownership==='公司产品'?'自研':'自选',season:srAttribute(p.name).replace('冬季品','冬季').replace('夏季品','夏季')};
  const weights=nsPlatforms.map((_,i)=>[30,13,11,19,17,10][(i+p.id)%6]),targets=splitTarget(targetCents,[24,14,12,20,18,12]),gsvs=splitTarget(gsvCents,weights),profits=splitTarget(profitCents,weights.map((w,i)=>w*(.78+(i%3)*.22))),profitTargets=splitTarget(Math.round(targetCents*dpStore.marginTarget/100),targets);
  const platformRows=nsPlatforms.map((platform,i)=>{
   const units=Math.max(1,Math.round(gsvs[i]/100/(basePrice*(.9+i*.04)))),returns=Math.min(units,Math.round(units*(p.returnRate+(i-2)*.35)/100));
   const launch=shiftDate(p.actualLaunch,Math.min(p.days-1,i*2)),days=aiFlowDayDiff(launch,b.cutoff)+1;
   const raw={gsvCents:gsvs[i],targetCents:targets[i],profitCents:profits[i],targetProfitCents:profitTargets[i],units,returns};
   return nsSummarize({...meta,platform,actualLaunch:launch,days},[raw]);
  });
  return {...nsSummarize({...meta,platform:'全平台汇总'},platformRows),platformRows};
 });
}
function nsVisibleRows(rows){return nsPlatform==='all'?rows:rows.map(p=>({...p.platformRows.find(r=>r.platform===nsPlatform),platformRows:p.platformRows}))}
function nsValues(p){return [p.name,p.model,p.shortName,p.ownership,p.productType,p.season,p.actualLaunch,p.days,p.price,p.gsv,p.gsvTarget,p.scaleRate,p.profitAmount,p.profitRate,p.profitAttainment,p.returnRate]}
function nsDisplayValues(p){return [`<div class="ns-product">${riskThumbnail(p.name)}<span>${esc(p.name)}</span></div>`,esc(p.model),esc(p.shortName),p.ownership,p.productType,p.season,p.actualLaunch,p.days+'天','¥'+fmt(p.price,2),nsMoney(p.gsv),nsMoney(p.gsvTarget),nsAttainment(p.scaleRate),nsMoney(p.profitAmount),nsRate(p.profitRate),nsAttainment(p.profitAttainment),nsRate(p.returnRate)]}
function nsTable(headers,rows,cls=''){return `<table class="ns-table ${cls}"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<td data-label="${headers[i]}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
function nsRules(){return `<details class="ns-rules"><summary>指标口径 · 演示</summary><p>达成率＜80%红灯，80%≤达成率＜100%黄灯，≥100%绿灯；无目标不判灯。规模达成率＝GSV÷GSV目标；利润达成率＝利润额÷目标利润额。</p><p>全平台GSV、目标、利润额按平台加总；利润率＝总利润额÷总GSV，退货率＝总退货件数÷总销量，价格＝总GSV÷总销量。汇总比率不直接平均。各平台上线日期不同，汇总上线日期取最早日期。</p><p>成功产品沿用“按期上线且产生有效销售”口径。六平台经营数据、产品资料与目标均为演示数据。目标利润率为${fmt(dpStore.marginTarget,1)}%；目标按本期已上线天数折算并分配至各平台。价格单位元，GSV与利润额单位万元。</p></details>`}

function nsOpenDetail(id){withPeriod('new',()=>{
 const p=nsSalesFacts(newLinkedRows(newList(),'sold','all')).find(r=>r.id===+id);if(!p)return;
 const period=periodLabel(),range={...bounds()};let platform=nsPlatform;
 openModal(p.name+' · 新品销售成功率详情',`<article class="ns-detail"><header class="ns-detail-hero" data-product-summary>${riskThumbnail(p.name)}<div><h2>${esc(p.name)}</h2><p>${esc(p.model)} · ${esc(p.shortName)}</p></div><span class="tag">6个平台在售</span></header><dl class="ns-meta">${[['产品归属',p.ownership],['产品类别',p.productType],['产品分类',p.season]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><div class="ns-detail-toolbar"><label>数据范围<select id="ns-detail-platform"><option value="all">全平台汇总</option>${nsPlatforms.map(n=>`<option ${n===platform?'selected':''}>${n}</option>`).join('')}</select></label><span>${range.start} — ${range.cutoff}</span></div><div id="ns-detail-metrics"></div><div id="ns-detail-gaps"></div><h3 class="ns-platform-heading">各平台经营数据 <small>全量展示 · 金额单位：万元</small></h3><div class="ns-platform-table">${nsTable(['平台','上线日期','上线天数','价格','GSV','GSV目标','规模达成率','利润额','利润率','利润达成率','退货率'],p.platformRows.map(r=>[r.platform,r.actualLaunch,r.days+'天','¥'+fmt(r.price,2),nsMoney(r.gsv),nsMoney(r.gsvTarget),nsAttainment(r.scaleRate),nsMoney(r.profitAmount),nsRate(r.profitRate),nsAttainment(r.profitAttainment),nsRate(r.returnRate)]))}</div>${nsRules()}</article>`,false,'六平台经营数据 · 演示');
 function fill(){const r=platform==='all'?p:p.platformRows.find(r=>r.platform===platform);$('#ns-detail-metrics').innerHTML=`<div class="ns-detail-kpis">${[['上线日期',r.actualLaunch],['上线天数',r.days+'天'],['价格','¥'+fmt(r.price,2)],['GSV',nsMoney(r.gsv)],['GSV目标',nsMoney(r.gsvTarget)],['规模达成率',nsAttainment(r.scaleRate)],['利润额',nsMoney(r.profitAmount)],['利润率',nsRate(r.profitRate)],['利润达成率',nsAttainment(r.profitAttainment)],['退货率',nsRate(r.returnRate)]].map(([k,v])=>`<div><small>${k}</small><strong>${v}</strong></div>`).join('')}</div>`;$('#ns-detail-gaps').innerHTML=`<div class="ns-gaps">${[['规模',r.scaleRate,r.gsvTarget-r.gsv,r.gsvTarget],['利润',r.profitAttainment,r.targetProfit-r.profitAmount,r.targetProfit]].map(([k,rate,gap,target])=>`<div class="${nsLight(rate)}"><strong>${k}${gap>0?'未达标 · 差 '+nsMoney(gap):'已达标'}</strong><span>${k}目标 ${nsMoney(target)} · ${gap>0?'优先跟进差额':'超额 '+nsMoney(-gap)}</span></div>`).join('')}</div>`}
 $('#ns-detail-platform').onchange=e=>{platform=e.target.value;fill()};fill();
 $('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn small" id="ns-detail-back">返回产品明细</button>');
 $('#ns-detail-back').onclick=()=>{$('#close').click();$('#newtable').scrollIntoView({block:'nearest',behavior:'instant'})};
 
})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ns-detail]');if(b)nsOpenDetail(b.dataset.nsDetail)});