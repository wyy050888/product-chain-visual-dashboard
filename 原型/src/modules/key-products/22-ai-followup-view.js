// 列表只呈现判断、首要行动和结果；制度与工作记录在详情中按来源展开。
function kpmInsightJudgment(item){return `<button class="link kpm-followup-decision" data-kpm-ai-detail="${item.product.spuId}">${esc(item.advice.decision)}</button>`}
function kpmInsightTaskCell(item){
 const t=item.task;return `<button class="link" data-kpm-ai-task="${item.product.spuId}" ${t?.deletedAt?'disabled':''}>${t?.deletedAt?'已删除':t?esc(upTodoStatuses[t.status]):'采纳建议'}</button>${t?`<small>${esc(t.assignee||'—')}</small>`:''}`;
}
function kpmOpenFollowupTask(item,period){
 const task=drawerWithPeriod(period,()=>kpmFollowupTask(item),'matrix');if(task.deletedAt){toast('关联待办已删除');return;}
 if(!upTodos[task.id])try{upPersistTodos({...upTodos,[task.id]:task})}catch(error){toast(error.message);return;}
 document.querySelector('#dialogbody .kpm-management-drawer,#dialogbody .kpm-followup-detail')?.upRefresh?.();
 upOpenTodoDialog(upTodos[task.id],'detail',{},()=>document.querySelector('#dialogbody .kpm-management-drawer,#dialogbody .kpm-followup-detail')?.upRefresh?.());
}
function kpmOpenFollowupList(key){return withPeriod('matrix',()=>{
 kpmSuspendChartZoom();kpmHidePointTooltip();let period={...periodFor('matrix')},context=kpmManagementContext(key,'cycles',period),page=1,items=[];
 const priceFilters={price:kpmFilters.price,min:kpmFilters.min,max:kpmFilters.max};
 openModal('改善进展 · '+context.group.label,`<article class="kpm-management-drawer kpm-followup-list" data-kpm-management-list="${key}"><div class="kpm-management-list-tools"><input data-kpm-list-search type="search" placeholder="搜索产品名称 / SPU码 / 型号" aria-label="经营明细搜索"><label>产品分级<select data-kpm-list-grade><option value="all">全部</option>${[...kpmGradeOrder,'unrated'].map(g=>`<option value="${g}">${g==='unrated'?'待分级':g}</option>`).join('')}</select></label>${kpmPriceMarkup(priceFilters,'drawer')}<button class="link" data-kpm-list-reset>重置</button></div><div class="kpm-management-list-table tablewrap"></div><div class="kpm-management-list-pager"></div></article>`);
 const root=$('.kpm-followup-list'),host=root.querySelector('.kpm-management-list-table'),search=root.querySelector('[data-kpm-list-search]'),grade=root.querySelector('[data-kpm-list-grade]');
 const price=kpmMountPriceFilter(root.querySelector('[data-kpm-price-host]'),priceFilters,()=>{page=1;fill()});
 const heading=kpmMountManagementHeader({tab:'cycles',key,period,context,onChange:next=>{period=next;page=1;fill()}});
 function fill(){
  context=kpmManagementContext(key,'cycles',period);items=drawerWithPeriod(period,()=>kpmImprovementItems(context.rows).map(i=>({...i,view:'cycles',contextText:''})),'matrix');
  const query=search.value.trim().toLowerCase();items=items.filter(i=>kpmPriceMatch(i.product,priceFilters)&&(grade.value==='all'||(i.product.level||'unrated')===grade.value)&&(!query||[i.product.name,i.product.spuCode,i.product.model].some(v=>String(v||'').toLowerCase().includes(query))));
  items.sort((a,b)=>b.product.facts.gsvCents-a.product.facts.gsvCents);page=Math.max(1,Math.min(page,Math.ceil(items.length/DRAWER_PAGE_SIZE)||1));
  root.dataset.kpmPeriod=JSON.stringify(period);root.dataset.kpmRange=JSON.stringify(context.range);root.dataset.kpmPrice=JSON.stringify(priceFilters);heading.update({...context,rows:items.map(i=>i.product)});
  const visible=items.slice((page-1)*DRAWER_PAGE_SIZE,page*DRAWER_PAGE_SIZE);
  host.innerHTML=table(['SPU信息','改善事项','经营变化','AI判断','关联待办','操作'],visible.map(i=>[titleProduct(i.product,{showBrand:false}),esc(kpmImprovementKinds[i.kind]||'经营改善'),`<span class="kpm-followup-result ${kpmImprovementStages[i.stage][1]}">${esc(i.progress)}</span>`,kpmInsightJudgment(i),kpmInsightTaskCell(i),`<button class="link" data-kpm-ai-product="${i.product.spuId}">产品详情</button>`]),'kpm-management-products');
  host.querySelectorAll('tbody tr').forEach((tr,i)=>{if(visible[i])tr.dataset.kpmListSpu=visible[i].product.spuId});host.querySelectorAll('th').forEach(th=>th.setAttribute('data-up-basic',''));
  if(!visible.length)host.querySelector('tbody').innerHTML='<tr><td colspan="6">暂无符合条件的产品</td></tr>';
  mountListPager(root.querySelector('.kpm-management-list-pager'),items.length,page,next=>{page=next;fill()});
 }
 root.upRefresh=fill;search.oninput=grade.onchange=()=>{page=1;fill()};
 root.onclick=event=>{
  if(event.target.closest('[data-kpm-list-reset]')){search.value='';grade.value='all';price.reset();page=1;fill();return;}
  const detail=event.target.closest('[data-kpm-ai-detail]'),task=event.target.closest('[data-kpm-ai-task]'),product=event.target.closest('[data-kpm-ai-product]'),id=detail?.dataset.kpmAiDetail||task?.dataset.kpmAiTask||product?.dataset.kpmAiProduct;if(!id)return;
  const item=items.find(i=>i.product.spuId===id);if(detail)kpmOpenFollowupDetail(item,period);else if(product)kpmOpenManagementProduct(id,period);else kpmOpenFollowupTask(item,period);
 };
 fill();
});}
function kpmOpenFollowupDetail(initial,period){
 let item=initial;
 openModal('AI判断 · '+item.product.name,'<article class="kpm-followup-detail"></article>');const root=$('.kpm-followup-detail');
 function fill(){
  item=drawerWithPeriod(period,()=>kpmManagementInsight(initial.product,initial.view||'changes',{group:initial.group,totalGsv:initial.totalGsv}),'matrix');const a=item.advice,r=item.record,p=item.product;
  root.innerHTML=`<header class="kpm-followup-verdict"><strong>${esc(a.decision)}</strong>${item.contextText?`<p class="kpm-insight-context">${esc(item.contextText)}</p>`:''}<p>${esc(a.reason)}</p></header><section><h3>方案比较</h3><table><thead><tr><th data-up-basic>方向</th><th data-up-basic>建议</th><th data-up-basic>判断依据</th></tr></thead><tbody>${a.alternatives.map(([name,rank,text])=>`<tr><td>${esc(name)}</td><td>${esc(rank)}</td><td>${esc(text)}</td></tr>`).join('')}</tbody></table></section><section><h3>部门行动</h3><div class="kpm-followup-actions">${a.actions.map(([dept,text])=>`<div><b>${esc(dept)}</b><span>${esc(text)}</span></div>`).join('')}</div></section><details class="kpm-followup-basis"><summary>查看依据</summary><dl><dt>经营数据</dt><dd>截至${item.cutoff}：GSV ${upMoney(p.facts.gsvCents)}，页面利润率${upPercent(p.facts.profitRate)}，总退${upPercent(p.facts.returnRate)}</dd>${item.policy?`<dt>制度要求</dt><dd>${esc(item.policy)}</dd>`:''}${r?`<dt>${esc(r.source)}</dt><dd>${esc(r.note)}<small>承诺期间 ${r.start} — ${r.due}</small></dd>`:''}</dl></details>${item.task?`<section class="kpm-insight-linked"><h3>关联待办</h3><button class="link" data-kpm-ai-open-task ${item.task.deletedAt?'disabled':''}>${esc(item.task.title)}</button><small>${esc(upTodoStatuses[item.task.status])} · ${esc(item.task.assignee)}</small></section>`:''}<footer><button class="link" data-kpm-ai-product>产品详情</button>${item.task?'':'<button class="btn primary" data-kpm-ai-open-task>采纳建议</button>'}</footer>`;
 }
 root.upRefresh=fill;
 root.onclick=event=>{if(event.target.closest('[data-kpm-ai-product]'))kpmOpenManagementProduct(item.product.spuId,period);else if(event.target.closest('[data-kpm-ai-open-task]'))kpmOpenFollowupTask(item,period)};
 fill();
}
document.addEventListener('drawer:restored',()=>document.querySelector('.kpm-followup-detail')?.upRefresh?.(),true);
