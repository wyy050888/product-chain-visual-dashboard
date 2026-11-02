// 店铺与产品使用同一套六平台字段，事件筛选、统计与明细共用原因口径。
function sdViolationDetail(m,event){
 const product=m.products[0]?.product||{spuId:m.shop.shopId,spuCode:'—',name:m.shop.name,brand:m.shop.brand};
 const types={fine:'罚款',frozen:'资金冻结',offShelf:'下架',drop:'掉权',limited:'限单'};
 const detail=upViolationDetail(product,{...event,shopId:m.shop.shopId,shopName:m.shop.name,platform:m.shop.channel,type:types[event.type]});
 return {...detail,shop:m.shop.name,object:event.object+'\n'+event.objectId,number:event.id,status:event.status,reason:event.reason,action:event.result,
  description:event.reason+'；'+event.result,subject:event.objectId,period:['frozen','offShelf','drop','limited'].includes(event.type)?event.date+' 起；结束时间待核实':'—',
  appealDeadline:'—',appeal:'待核实',advice:event.reasonType==='quality'?'按记录中的违规对象和品质原因核对，提交整改结果':'按记录中的违规对象、原因和状态核对，回填处理结果'};
}
function sdViolationMetrics(m,state){
 const c=rpShopPeriodFacts(m.shop,state.start,state.end,state.violationQualityOnly!==false),range=riskRange(state.start,state.end),p=rpShopPeriodFacts(m.shop,range.previousStart,range.previousEnd,state.violationQualityOnly!==false);
 return ['violations',...rpShopMetricKeys(m.shop.channel)].map(key=>{
  if(key==='problemSpus')return rpShopProblemField(m.shop,state.end,range.previousEnd);
  const name=key==='violations'?'违规次数':sdEventNames[key];
  const money=['fine','frozen'].includes(key);
  return {key,name,value:money?pfMoneyYuan(c[key]):c[key]+'次',tone:money?rpQualityAmountTone(c[key]):'',...(money?{target:c[key+'Count']+'次',targetTone:'rp-quality-gray'}:rpCountComparison(c[key],p[key]))};
 });
}
// 两类链接明细复用榜单浮层，数量、字段与指标值保持同源。
function sdPddLinkDetails(shop,end){
 if(shop.channel!=='拼多多')return '';
 const groups=rpPddLinkGroups(shop,end);if(!groups.all.length)return '<section class="sd-core-links"><h3>拼多多核心链接考核</h3><p class="muted">未配置核心链接</p></section>';
 const tables=['red','yellow',...(groups.unknown.length?['unknown']:[])].map(tone=>`<section class="sd-pdd-links" data-sd-link-tone="${tone}" aria-label="${tone==='red'?'红灯':tone==='yellow'?'黄灯':'待补数据'}链接明细">${rpPddLinkTable(shop,tone,end,true)}</section>`).join('');
 return `<section class="sd-core-links" aria-labelledby="sd-core-links-title"><h3 id="sd-core-links-title">拼多多核心链接考核</h3>${tables}</section>`;
}
function sdMountViolations(root,m,state){
 const host=root.querySelector('[data-up-panel="violations"]');state.violationType||='all';
 if(!rpShopMetricAllowed(state.violationType,m.shop.channel))state.violationType='all';
 const metrics=sdViolationMetrics(m,state),types=rpShopMetricKeys(m.shop.channel).filter(key=>key!=='problemSpus').map(key=>[key,sdEventNames[key]]);
 host.innerHTML=`<div class="sd-violation-stats" style="--sd-violation-metrics:${metrics.length}">${metrics.map(upQualityMetric).join('')}</div><div class="sd-violation-filters"><input type="search" placeholder="搜索违规对象 / 编号 / 原因" aria-label="搜索店铺违规" value="${esc(state.violationQuery||'')}"><div>${[['all','全部'],...types].map(([key,label])=>`<button class="btn small ${state.violationType===key?'active':''}" data-sd-type="${key}" aria-pressed="${state.violationType===key}">${label}</button>`).join('')}</div><label class="up-violation-quality-check"><input type="checkbox" data-sd-violation-quality ${state.violationQualityOnly!==false?'checked':''}>展示品质违规统计</label></div><div class="up-table" data-sd-violation-table></div><div data-sd-violation-pager></div>${sdPddLinkDetails(m.shop,state.end)}`;
 const fill=()=>{
  const q=(state.violationQuery||'').trim().toLowerCase(),columns=upViolationColumns[m.shop.channel];
  const rows=m.events.filter(e=>(state.violationQualityOnly===false||e.reasonType==='quality')&&(state.violationType==='all'||e.type===state.violationType)&&(!q||[e.object,e.objectId,e.id,e.reason].join(' ').toLowerCase().includes(q)));
  upMountTable(host.querySelector('[data-sd-violation-table]'),host.querySelector('[data-sd-violation-pager]'),columns.map(([label])=>label),rows.map(e=>{const d=sdViolationDetail(m,e);return columns.map(([,key])=>key==='shop'?upViolationShopCell(d):`<span class="sd-violation-cell">${esc(d[key]??'—')}</span>`)}),'当前筛选下暂无违规条目');
  if(!rows.length)host.querySelector('[data-sd-violation-table]').innerHTML=table(columns.map(([label])=>label),[]).replace(/<tbody>[\s\S]*?<\/tbody>/,'<tbody></tbody>')+'<div class="up-empty">当前筛选下暂无违规条目</div>';
 };
 host.querySelector('input[type=search]').oninput=e=>{state.violationQuery=e.target.value;fill()};
 host.querySelector('[data-sd-violation-quality]').onchange=e=>{state.violationQualityOnly=e.target.checked;host.querySelector('.sd-violation-stats').innerHTML=sdViolationMetrics(m,state).map(upQualityMetric).join('');fill()};
 for(const button of host.querySelectorAll('[data-sd-type]'))button.onclick=()=>{state.violationType=button.dataset.sdType;sdMountViolations(root,m,state)};
 fill();
}
