function rfListRows(kind){
 const state=kind===1?brState:kind===6?rrState:null;if(!state)return rfRows(kind);
 const prior=state.platform;state.platform=rfState.listPlatforms[kind]||'all';
 try{return rfRows(kind)}finally{state.platform=prior}
}

function rfOpenList(k,reset=true){
 if(reset){rfState.kind=k;rfState.page=1;rfState.dimension='spu';if(k===1||k===6)rfState.listPlatforms[k]='all'}
 return withPeriod('risk',()=>{
  openModal(rfTitles[k]+' · 完整榜单',`<div class="br-list-tools">${k===1?`<label>平台 <select id="rf-list-platform">${qrPlatformOptions(rfState.listPlatforms[1],true)}</select></label>`:k===6?`<label>平台 <select id="rf-return-platform">${qrPlatformOptions(rfState.listPlatforms[6],true)}</select></label>`:(k===3||k===4)?`<label>产品属性 <select id="rf-list-season">${srSeasonOptions(k)}</select></label>`:''}<span class="note">${riskRangeText()} · 六项指标独立判灯${k===6?' · 已收退货率单位：%':''}</span></div>${k===3?'<div id="rf-dimensions"></div>':''}<div class="rf-list-table" id="rf-list-table"></div><div id="rf-pagination"></div><details class="br-rules"><summary>指标口径与数据说明</summary></details>`,false,'固定指标 · 红色异常 / 绿色正常');
  $('#dialog').dataset.rdKind=k;
  function fill(){withPeriod('risk',()=>{
   const rows=rfListRows(k),grouped=k===3&&rfState.dimension!=='spu',data=grouped?irGroups(rows,rfState.dimension):rows,pages=Math.max(1,Math.ceil(data.length/DRAWER_PAGE_SIZE));rfState.page=Math.min(rfState.page,pages);
   const headers=grouped?[rfState.dimension==='chain'?'类目（链条）':'品牌','高危SPU数','仓内库存','工厂库存','在制物料','高危品货值','操作']:['序号',k===1?'店铺名称 / 平台':'产品名称 / 型号',...rfNames[k],'操作'];
   const display=data.slice((rfState.page-1)*DRAWER_PAGE_SIZE,rfState.page*DRAWER_PAGE_SIZE).map((r,i)=>grouped?[esc(r.name),r.count,fmt(r.warehouse)+'件',fmt(r.factory)+'件',fmt(r.undelivered)+'件',pfMoneyYuan((r.goodsValueCents/1000000)*10000),`<button class="link" data-rf-group="${esc(String(r.key))}">查看明细</button>`]:[(rfState.page-1)*DRAWER_PAGE_SIZE+i+1,rfProduct(k,r,true),...rfFacts(k,r).map(rfCell),`<button class="link" data-riskitem="${k},${r.id}">查看详情</button>`]);
   $('#rf-list-table').innerHTML=data.length?table(headers,display):'<div class="empty">当前筛选下暂无风险记录</div>';
   if(k===3){$('#rf-dimensions').innerHTML=irTabs(rfState.dimension).replaceAll('data-ir-dimension','data-rf-dimension');$('#rf-dimensions').onclick=e=>{const b=e.target.closest('[data-rf-dimension]');if(b){rfState.dimension=b.dataset.rfDimension;rfState.page=1;fill()}}}
   mountListPager($('#rf-pagination'),data.length,rfState.page,next=>{rfState.page=next;fill()});
   $('#rf-list-table').onclick=e=>{const b=e.target.closest('[data-rf-group]');if(b){const g=data.find(g=>String(g.key)===b.dataset.rfGroup);withPeriod('risk',()=>irGroupDetail(g))}};
   
  })}fill();
  if(k===1)$('#rf-list-platform').onchange=e=>{rfState.listPlatforms[1]=e.target.value;rfState.page=1;fill()};
  if(k===6)$('#rf-return-platform').onchange=e=>{rfState.listPlatforms[6]=e.target.value;rfState.page=1;fill()};
  if(k===3||k===4)$('#rf-list-season').onchange=e=>{riskSeasonState[k]=e.target.value;rfState.page=1;renderRisks();fill()};
 });
}
const rfPreviousOpen=openRisk;
openRisk=function(k){return wfDirector()&&[1,2,3,4,6].includes(k)?rfOpenList(k):rfPreviousOpen(k)};
const rfPreviousDetail=riskDetail;
riskDetail=function(k,id){rfPreviousDetail(k,id);if(!wfDirector()||![1,2,3,4,6].includes(k))return;withPeriod('risk',()=>{const r=rfRows(k).find(r=>r.id===+id);if(!r)return;const metrics=$('.risk-detail-metrics'),facts=rfFacts(k,r);metrics.innerHTML=facts.map(m=>`<div><small>${m.name}</small><strong>${rfCell(m)}</strong><span>${esc(m.rule)}</span></div>`).join('');metrics.classList.add('rf-detail-metrics');if(k===4)$('.risk-context').insertAdjacentHTML('beforeend',`<span>产品属性：<b>${r.attribute}</b></span><span>风险等级：${brLevel(r.level)}</span><span>连续低动销：<b>${r.days} 天</b></span>`);if(k===6)rfReturnEvidence(r);$('#dialogtitle').textContent=r.name+' · '+rfTitles[k].replace('榜','详情');const header=$('.risk-alert-header strong');if(header)header.textContent=rfTitles[k];$('#dialogactions').insertAdjacentHTML('afterbegin',`<button class="btn small" data-rf-back="${k}">返回完整榜单</button>`);})};
function rfReturnEvidence(r){
 const f=rfReturnFacts(r);
 $('.risk-detail-metrics').insertAdjacentHTML('afterend',`<details class="rf-return-evidence"><summary>查看目标、两期基数与经营数据</summary>${table(['指标','本期','对照 / 目标'],[
 ['总退货率',fmt(r.returnRate,1)+'%','上期等长周期 '+fmt(r.previousRate,1)+'% · 目标≤'+r.returnTarget+'%'],
 ['已收退件数',fmt(r.received)+'件','上期等长周期 '+fmt(r.prevReceived)+'件'],
 ['已收退货率',fmt(r.receivedRate,1)+'%','目标≤'+r.receivedTarget+'%'],
 ['销量',fmt(r.shipped)+'件','上期等长周期 '+fmt(r.previousShipped)+'件'],
 ['GMV',pfMoneyYuan((f.gmvCents/1000000)*10000),'退款前发货成交金额'],
 ['退款金额',pfMoneyYuan((f.refundCents/1000000)*10000),'模拟同价整件退款'],
 ['GSV',pfMoneyYuan((f.gsvCents/1000000)*10000),'上期等长周期 '+pfMoneyYuan((f.previousGsvCents/1000000)*10000)+' · 目标 '+pfMoneyYuan((f.targetCents/1000000)*10000)],
 ['成本费用',pfMoneyYuan((f.costCents/1000000)*10000),'采购、营销及售后等模拟费用'],
 ['利润',pfMoneyYuan((f.profitCents/1000000)*10000),'GSV−成本费用；利润率目标≥10%']
 ])}<p class="note">本期 ${r.start} — ${r.end}；上期 ${r.prevStart} — ${r.prevEnd}。金额、利润及增长目标为演示口径。</p></details>`);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rf-back]');if(b)rfOpenList(+b.dataset.rfBack,false)});