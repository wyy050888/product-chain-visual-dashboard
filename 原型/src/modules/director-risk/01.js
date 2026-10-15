

// Shorten director ranking titles without changing risk levels or thresholds.
const directorRiskNames=['高危品质风险榜','高危劣质店铺榜','高危亏损产品榜','库存风险榜','高危滞销产品榜','高危延期项目榜','高危退货恶化榜','供应商高危预警'];
function directorRiskTitle(title){for(const name of directorRiskNames)title=title.replace(name,name.replace('高危',''));return title}
const directorRiskRender=renderRisks;
renderRisks=function(...args){const result=directorRiskRender(...args);$('#riskrail .sr-global-risk')?.remove();document.querySelectorAll('#riskrail .rhead h3').forEach(heading=>{for(const node of heading.childNodes)if(node.nodeType===Node.TEXT_NODE)node.textContent=directorRiskTitle(node.textContent)});return result};
const directorRiskModal=openModal;
openModal=function(title,...args){return directorRiskModal(dpState.view==='director'?directorRiskTitle(title):title,...args)};

// Director-only risk overview. ABCD remains the independent business matrix.
const mkDirectorSection=$('#matrix'),mkPreviousSummary=matrixAnalysisHTML;
const mkLights={red:{label:'红灯',note:'优先处理'},yellow:{label:'黄灯',note:'重点跟踪'},green:{label:'绿灯',note:'正常经营'}};
function mkRiskFacts(rows){return rows.map(p=>{
 const signals=[],gap=Math.max(0,config.profit-p.profit),add=(tone,label,detail,action)=>signals.push({tone,label,detail,action});
 if(p.profit<config.profit)add('red','利润未达标',`利润率 ${fmt(p.profit,1)}%，低于分界 ${fmt(gap,1)}%`,'核查成本与售价');
 else if(p.profit<config.profit+2)add('yellow','利润临界',`利润率 ${fmt(p.profit,1)}%，高于分界不足 2%`,'守住利润空间');
 if(p.returnRate>8)add('red','退货偏高',`退货率 ${fmt(p.returnRate,1)}%，超预警线 ${fmt(p.returnRate-8,1)}%`,'排查退货原因');
 else if(p.returnRate>=6)add('yellow','退货临界',`退货率 ${fmt(p.returnRate,1)}%，距红线 ${fmt(8-p.returnRate,1)}%`,'跟踪售后变化');
 if(['整改','下架'].includes(p.state))add('red',p.state+'中','销售状态：'+p.state,'复核整改及恢复条件');
 else if(['滞销','断货'].includes(p.state))add('yellow',p.state+'风险','销售状态：'+p.state,p.state==='断货'?'核对补货计划':'调整库存与动销');
 signals.sort((a,b)=>(a.tone==='red'?0:1)-(b.tone==='red'?0:1));
 return {p,signals,tone:signals.some(s=>s.tone==='red')?'red':signals.length?'yellow':'green',profitGap:p.sales*gap/100};
}).sort((a,b)=>['red','yellow','green'].indexOf(a.tone)-['red','yellow','green'].indexOf(b.tone)||b.profitGap-a.profitGap||b.p.sales-a.p.sales)}
function mkRules(){return `<details class="mk-rules"><summary>红黄绿灯口径 · 演示规则</summary><p>红灯：利润率＜${fmt(config.profit,1)}%，或总退货率＞8%，或处于整改 / 下架状态。黄灯：未触发红灯且利润率距分界不足2%，或退货率6%—8%（含边界），或滞销 / 断货。其余为绿灯；多风险取最高等级，一款产品仅计一次。</p><p>利润分界沿用矩阵配置；退货6% / 8%为演示预警线。利润达标差额＝销售额×利润率缺口，仅作测算，不代表已发生亏损。按当前截止日的近30天经营数据判断。</p></details>`}
matrixAnalysisHTML=function(rows){
 if($('#matrix')!==mkDirectorSection)return mkPreviousSummary(rows);
 const facts=mkRiskFacts(rows),red=facts.filter(r=>r.tone==='red'),priorities=facts.filter(r=>r.tone!=='green').slice(0,3),sum=(items,fn)=>items.reduce((s,r)=>s+fn(r),0);
 return `<div class="mk-risk-overview"><div class="mk-heading"><h3>关键产品预警</h3><span>近30天 · ${rows.length} 款</span></div><div class="mk-lights">${Object.entries(mkLights).map(([tone,l])=>`<button class="mk-light ${tone}" data-mk-list="${tone}"><span><i></i>${l.label} · ${l.note}</span><strong>${facts.filter(r=>r.tone===tone).length}<small> 款</small></strong><em>查看产品 ›</em></button>`).join('')}</div><div class="mk-impact"><div><span>红灯产品销售额</span><strong>${fmt(sum(red,r=>r.p.sales),1)}<small> 万元</small></strong></div><div><span>利润达标差额 · 测算</span><strong>${fmt(sum(red,r=>r.profitGap),2)}<small> 万元</small></strong></div></div><div class="mk-priority-head"><h4>优先处理 TOP3</h4><button class="link" data-mk-list="all">查看全部 ›</button></div><div class="mk-priorities">${priorities.map(r=>`<button class="mk-priority" data-matrix-diagnosis="${r.p.id}">${riskThumbnail(r.p.name)}<span class="mk-product"><b>${esc(r.p.name)}</b><small>${esc(r.p.model)} · ${esc(r.p.channel)}</small><span class="${r.tone==='yellow'?'orange':'red'}">${esc(r.signals[0].detail)}</span><small>建议：${esc(r.signals[0].action)}</small></span><span class="tag ${r.tone==='yellow'?'orange':'red'}">${mkLights[r.tone].label}</span></button>`).join('')||'<div class="dp-empty">当前无红黄灯预警，继续保持监控。</div>'}</div>${mkRules()}</div>`;
};
function mkWithPeriod(period,fn){const old=localPeriods.matrix;localPeriods.matrix={...period};try{return withPeriod('matrix',fn)}finally{if(old)localPeriods.matrix=old;else delete localPeriods.matrix}}
function mkOpenList(tone='all',page=1,period=null){period=period||{...periodFor('matrix')};mkWithPeriod(period,()=>{
 const facts=mkRiskFacts(productRows(false)),range=bounds(),cutoff=range.cutoff;
 openModal('关键产品预警 · 产品明细',`<div class="mk-modal-tools" id="mk-list-tabs"></div><div id="mk-list-table" class="mk-list-table"></div><div id="mk-list-pages"></div>${mkRules()}`,false,shiftDate(cutoff,-29)+' — '+cutoff+' · 多项命中取最高等级');
 const fill=()=>{
  const rows=facts.filter(r=>tone==='all'||r.tone===tone),pages=Math.max(1,Math.ceil(rows.length/DRAWER_PAGE_SIZE));page=Math.max(1,Math.min(page,pages));
  $('#mk-list-tabs').innerHTML=[['all','全部'],...Object.entries(mkLights).map(([k,v])=>[k,v.label])].map(([k,label])=>`<button class="btn small ${tone===k?'primary':''}" data-mk-tone="${k}" aria-pressed="${tone===k}">${label} ${facts.filter(r=>k==='all'||r.tone===k).length}</button>`).join('');
  $('#mk-list-table').innerHTML=rows.length?table(['产品名称 / 型号','渠道','预警等级','单品利润率','总退货率','触发原因 / 偏差','操作'],rows.slice((page-1)*DRAWER_PAGE_SIZE,page*DRAWER_PAGE_SIZE).map(r=>[titleProduct(r.p),esc(r.p.channel),`<span class="tag ${r.tone==='yellow'?'orange':r.tone}">${mkLights[r.tone].label}</span>`,fmt(r.p.profit,1)+'%',fmt(r.p.returnRate,1)+'%',r.signals.length?r.signals.map(s=>`<div class="${s.tone==='yellow'?'orange':'red'}">${esc(s.detail)}</div>`).join(''):'当前未触发预警',`<button class="link" data-mk-detail="${r.p.id}">AI 诊断</button><button class="link" data-mk-trend="${r.p.id}">趋势图</button>`])):'<div class="dp-empty">当前灯色暂无产品</div>';
  mountListPager($('#mk-list-pages'),rows.length,page,next=>{page=next;fill()});
 };
 $('#mk-list-tabs').onclick=e=>{const b=e.target.closest('[data-mk-tone]');if(b){tone=b.dataset.mkTone;page=1;fill()}};
 $('#mk-list-table').onclick=e=>{const b=e.target.closest('[data-mk-detail],[data-mk-trend]');if(!b)return;mkWithPeriod(period,()=>b.dataset.mkDetail?openMatrixDiagnosis(b.dataset.mkDetail):openNewProductTrends(b.dataset.mkTrend,false,'matrix'));$('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn small" id="mk-back">返回预警列表</button>');$('#mk-back').onclick=()=>mkOpenList(tone,page,period)};
 fill();
 });}
document.addEventListener('click',e=>{const b=e.target.closest('#matrix [data-mk-list]');if(b)mkOpenList(b.dataset.mkList)});