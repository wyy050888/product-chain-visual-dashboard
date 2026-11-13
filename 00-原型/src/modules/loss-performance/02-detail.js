// 渠道切换只更新诊断数据，保留抽屉标签、处理表单与上一层榜单。
const lossPreviousDetail=riskDetail;
riskDetail=function(kind,id){
 const result=lossPreviousDetail(kind,id);if(kind!==2||!wfDirector())return result;
 withPeriod('risk',()=>{
  const product=brLossRows().find(r=>r.id===+id);if(!product)return;
  const body=$('#dialogbody'),metrics=body.querySelector('.risk-detail-metrics');
  metrics.insertAdjacentHTML('beforebegin',`<div class="loss-scope-tools"><select id="loss-detail-platform" aria-label="亏损产品统计范围"><option value="all">全公司</option>${qrPlatforms.map(n=>`<option value="${n}">${n}</option>`).join('')}</select></div>`);
  const render=()=>withPeriod('risk',()=>{
   const platform=$('#loss-detail-platform').value,scope=platform==='all'?'全公司':platform,r={...product,lossPlatform:platform},period=riskLossPeriod(r);
   const facts=rfFacts(2,r);
   metrics.innerHTML=facts.map(m=>`<div><small>${m.name}</small><strong>${rfCell(m)}</strong><span>${esc(m.rule)}</span></div>`).join('');
   body.querySelector('.risk-context').innerHTML=[['型号',product.model],['品类',chains[product.chain]],['品牌',product.brand],['统计范围',scope],['当前责任人',product.owner]].map(([label,value])=>`<span>${label}：<b>${esc(value)}</b></span>`).join('');
   const buckets=riskTrendBuckets(period.points);
   body.querySelector('.risk-trends').innerHTML=`<div><h3>所选周期发货销量趋势 <span>${scope} · ${formatSalesQuantity(period.sales,'件')}</span></h3>${riskTrendChart(buckets,'sales','#7b88fa','所选周期发货销量趋势','件')}</div><div><h3>所选周期退货率趋势 <span>${scope}</span></h3>${riskTrendChart(buckets,'rate','#e56570','所选周期退货率趋势','%')}</div>`;
   const signal=body.querySelector('.risk-analysis .rd-decision>div p');
   if(signal)signal.textContent=`${scope}：所选周期${period.loss>0?'亏损':'盈利'} ${pfMoneyYuan((Math.abs(period.loss))*10000)}，利润率 ${period.gsv?fmt(-period.loss/period.gsv*100,1)+'%':'—'}。`;
   $('#dialogsub').textContent=period.start+' — '+period.end+' · '+scope;
   body.dataset.lossPlatform=platform;
  });
  $('#loss-detail-platform').onchange=render;render();
 });return result;
};
