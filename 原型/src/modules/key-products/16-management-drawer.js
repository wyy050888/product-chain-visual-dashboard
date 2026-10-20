// 每个经营信号独立下钻，保留主表状态；嵌套详情使用现有抽屉返回栈。
function kpmManagementChangeFacts(p){
 const c=p.assessment.current,b=p.assessment.previous;
 return [`${upMoney(b.gsvCents)} → ${upMoney(c.gsvCents)}`,`${upPercent(b.profitRate)} → <span class="${c.profitRate<0?'negative':''}">${upPercent(c.profitRate)}</span>`];
}
function kpmOpenManagementList(key){if(kpmManagementTab==='cycles')return kpmOpenFollowupList(key);withPeriod('matrix',()=>{
 kpmSuspendChartZoom();kpmHidePointTooltip();
 const tab=kpmManagementTab,structure=tab==='structure';
 let period={...periodFor('matrix')},context=kpmManagementContext(key,tab,period),page=1,sort={key:'gsv',direction:'desc'};
 let {rows,range,cycles,totalGsv}=context,insights=[];
 const priceFilters={price:kpmFilters.price,min:kpmFilters.min,max:kpmFilters.max};
 const label=context.group?.label||(key.slice(6)==='unrated'?'待分级产品':key.slice(6)+'级产品');
 openModal(kpmManagementTabs[tab]+' · '+label,`<article class="kpm-management-drawer kpm-insight-list" data-kpm-management-list="${esc(key)}" data-kpm-view="${tab}"><div class="kpm-management-list-tools"><input type="search" data-kpm-list-search placeholder="搜索产品名称 / SPU码 / 型号" aria-label="经营明细搜索"><label>产品分级<select data-kpm-list-grade aria-label="经营明细产品分级"><option value="all">全部</option>${[...kpmGradeOrder,'unrated'].map(g=>`<option value="${g}">${g==='unrated'?'待分级':g}</option>`).join('')}</select></label>${kpmPriceMarkup(priceFilters,'drawer')}<button type="button" class="link" data-kpm-list-reset>重置</button></div><div class="kpm-management-list-table tablewrap"></div><div class="kpm-management-list-pager"></div></article>`);
 const root=$('#dialogbody .kpm-management-drawer'),host=root.querySelector('.kpm-management-list-table'),search=root.querySelector('[data-kpm-list-search]'),grade=root.querySelector('[data-kpm-list-grade]');
 const header=(field,label)=>`<button type="button" class="link" data-kpm-list-sort="${field}">${label} ${sort.key===field?(sort.direction==='asc'?'↑':'↓'):'↕'}</button>`;
 const priceControl=kpmMountPriceFilter(root.querySelector('[data-kpm-price-host=drawer]'),priceFilters,()=>{page=1;fill()});
 const heading=kpmMountManagementHeader({tab,key,period,context,onChange:next=>{
  period=next;context=kpmManagementContext(key,tab,period);({rows,range,cycles,totalGsv}=context);page=1;fill();$('#dialogbody').scrollTop=0;
 }});
 function fill(){
  root.dataset.kpmPrice=JSON.stringify(priceFilters);root.dataset.kpmPeriod=JSON.stringify(period);root.dataset.kpmRange=JSON.stringify(range);

  const q=search.value.trim().toLowerCase(),filtered=rows.filter(p=>kpmPriceMatch(p,priceFilters)&&(grade.value==='all'||(p.level||'unrated')===grade.value)&&(!q||[p.name,p.spuCode,p.model].some(v=>String(v||'').toLowerCase().includes(q))));
  heading.update({...context,rows:filtered});totalGsv=context.all.filter(p=>kpmPriceMatch(p,priceFilters)).reduce((n,p)=>n+p.facts.gsvCents,0);
  const ordered=rpSortRows(filtered,sort,(p,k)=>k==='margin'?(structure?p.facts.profitRate:p.assessment.current.profitRate):(tab==='changes'?p.assessment.current.gsvCents:p.facts.gsvCents));
  page=Math.max(1,Math.min(page,Math.ceil(ordered.length/DRAWER_PAGE_SIZE)||1));
  const headers=structure?['SPU信息','产品分级','等级变动',header('gsv','GSV'),header('margin','利润率'),'AI判断','关联待办','操作']:['SPU信息','等级变动',header('gsv','GSV（上期 → 本期）'),header('margin','利润率（上期 → 本期）'),'AI判断','关联待办','操作'];
  const pageRows=ordered.slice((page-1)*DRAWER_PAGE_SIZE,page*DRAWER_PAGE_SIZE);
  insights=pageRows.map(p=>({...drawerWithPeriod(period,()=>kpmManagementInsight(p,tab,context),'matrix'),group:context.group,totalGsv}));
  host.innerHTML=table(headers,pageRows.map((p,index)=>{
   const ai=insights[index],shared=[kpmInsightJudgment(ai),kpmInsightTaskCell(ai)];
   const action=`<button type="button" class="link" data-kpm-list-detail="${p.spuId}">产品详情</button>`;
   if(structure)return [titleProduct(p,{showBrand:false}),kpmGradeBadge(p),esc(kpmChangeText(p.assessment)),`${upMoney(p.facts.gsvCents)}<span class="kpm-structure-share">（${upPercent(totalGsv>0?p.facts.gsvCents/totalGsv*100:null)}）</span>`,upPercent(p.facts.profitRate),...shared,action];
   return [titleProduct(p,{showBrand:false}),esc(kpmChangeText(p.assessment)),...kpmManagementChangeFacts(p),...shared,action];
  }),'kpm-management-products');
  host.querySelectorAll('tbody tr').forEach((tr,i)=>{if(pageRows[i])tr.dataset.kpmListSpu=pageRows[i].spuId});
  host.querySelectorAll('th').forEach(th=>th.setAttribute('data-up-basic','true'));
  mountListPager(root.querySelector('.kpm-management-list-pager'),ordered.length,page,n=>{page=n;fill()});
 }
 root.upRefresh=fill;
 search.oninput=grade.onchange=()=>{page=1;fill()};
 root.onclick=event=>{
  if(event.target.closest('[data-kpm-list-reset]')){search.value='';grade.value='all';priceControl.reset();page=1;sort={key:'gsv',direction:'desc'};fill();return}
  const order=event.target.closest('[data-kpm-list-sort]');if(order){rpSortCycle(sort,order.dataset.kpmListSort);page=1;fill();return}
  const ai=event.target.closest('[data-kpm-ai-detail]'),task=event.target.closest('[data-kpm-ai-task]');
  if(ai||task){const id=ai?.dataset.kpmAiDetail||task.dataset.kpmAiTask,item=insights.find(i=>i.product.spuId===id);if(ai)kpmOpenFollowupDetail(item,period);else kpmOpenFollowupTask(item,period);return}
  const detail=event.target.closest('[data-kpm-list-detail]');if(detail){kpmOpenManagementProduct(detail.dataset.kpmListDetail,period);return}

 };
 fill();
});}
// 抽屉恢复后读取最新任务状态，保留搜索、筛选和页码。
document.addEventListener('drawer:restored',()=>document.querySelector('#dialogbody .kpm-management-drawer')?.upRefresh?.(),true);
