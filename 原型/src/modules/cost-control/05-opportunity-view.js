function ccOpenOpportunity(){
 const rows=ccOpportunityRows();ccEnsureOpportunitySamples(rows);
 const state={query:'',brand:'all',category:'all',status:'all',page:1,sort:{key:'gsvCents',direction:'desc'}};
 const select=(key,label,options)=>`<label>${label}<select data-cc-filter="${key}" aria-label="${label}"><option value="all">全部</option>${options.map(([value,text])=>`<option value="${esc(value)}">${esc(text)}</option>`).join('')}</select></label>`;
 openModal('AI 优先降本清单',`<article class="cc-drawer" data-cc-drawer="opportunity"><div class="cc-opportunity-filters ui-business-filters"><label class="ui-search-field"><input type="search" data-cc-query aria-label="搜索SPU" placeholder="搜索产品名称 / SPU码 / 型号"></label>${select('brand','品牌',[...new Set(rows.map(row=>row.brand))].map(value=>[value,value]))}${select('category','类目',pfCategories.map(value=>[value,value]))}${select('status','任务状态',Object.entries(upTodoStatuses))}<button type="button" class="link" data-cc-reset>重置</button></div><div class="cc-opportunity-results cc-table-scroll"></div><div class="cc-opportunity-pages"></div></article>`,false,shiftDate(DATA_CUTOFF,-29)+' — '+DATA_CUTOFF);
 $('#dialogsub').textContent=shiftDate(DATA_CUTOFF,-29)+' — '+DATA_CUTOFF;
 const root=$('.cc-drawer'),result=root.querySelector('.cc-opportunity-results');
 decorateFilterFields(root.querySelector('.cc-opportunity-filters'));
 const taskStatus=row=>ccOpportunityTask(row).status;
 function paint(){
  const query=state.query.trim().toLocaleLowerCase();
  let visible=rows.filter(row=>pfIncludes(state.brand,row.brand)&&pfIncludes(state.category,row.category)&&(state.status==='all'||taskStatus(row)===state.status)&&(!query||[row.product.name,row.product.spuCode,row.product.model].join(' ').toLocaleLowerCase().includes(query)));
  visible=rpSortRows(visible,state.sort,(row,key)=>row[key]);const total=visible.length;state.page=Math.min(state.page,Math.max(1,Math.ceil(total/DRAWER_PAGE_SIZE)));visible=visible.slice((state.page-1)*DRAWER_PAGE_SIZE,state.page*DRAWER_PAGE_SIZE);
  const sort=(key,label)=>rpSortHeader(key,label,state.sort).replace(/ title="[^"]*"/g,'');
  result.innerHTML=`<table class="cc-table cc-opportunity-table"><thead><tr>${['SPU信息',sort('gsvCents','近30天GSV'),sort('profitRate','近30天利润率'),`<span class="cc-saving-heading">${sort('unitCents','预计单台降本空间')}${ccSavingHelp()}</span>`,'AI 建议降本方向','任务状态','操作'].map(label=>`<th data-up-basic>${label}</th>`).join('')}</tr></thead><tbody>${visible.length?visible.map(row=>{const task=ccOpportunityTask(row),saved=task.status!=='suggested';return `<tr data-cc-spu="${esc(row.spuId)}" data-cc-task-status="${task.status}"><td>${titleProduct(row.product,{showBrand:false})}</td><td>${ccMoney(row.gsvCents)}<span class="cc-opportunity-unit cc-gsv-unit">w</span></td><td class="${row.profitRate<0?'red':''}">${ccRate(row.profitRate)}</td><td data-cc-saving-cents="${row.unitCents??''}">${Number.isFinite(row.unitCents)?fmt(row.unitCents/100,2)+'<span class="cc-opportunity-unit">元/台</span>':'—'}</td><td>${esc(row.direction)}</td><td>${upTodoStatusTag(task)}</td><td><div class="cc-row-actions"><button type="button" class="link" data-cc-assign="${esc(row.spuId)}" ${task.deletedAt?'disabled':''}>${task.deletedAt?'已删除':saved?'跟进任务':'下发任务'}</button><button type="button" class="link" data-cc-view="${esc(row.spuId)}">查看</button></div></td></tr>`}).join(''):'<tr><td colspan="7" class="empty">暂无符合条件的数据</td></tr>'}</tbody></table>`;
  rpApplySortAria(result,state.sort);mountListPager(root.querySelector('.cc-opportunity-pages'),total,state.page,next=>{state.page=next;paint()});
 }
 root.oninput=event=>{if(event.target.matches('[data-cc-query]')){state.query=event.target.value;state.page=1;paint()}};
 root.onchange=event=>{if(event.target.matches('[data-cc-filter]')){state[event.target.dataset.ccFilter]=pfControlValue(event.target);state.page=1;paint()}};
 root.onclick=event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-cc-reset')){Object.assign(state,{query:'',brand:'all',category:'all',status:'all',page:1});root.querySelector('[data-cc-query]').value='';root.querySelectorAll('[data-cc-filter]').forEach(select=>pfControlSet(select,'all'));paint()}
  if(button.dataset.rpSort){rpSortCycle(state.sort,button.dataset.rpSort);state.page=1;paint();result.querySelector(`[data-rp-sort="${button.dataset.rpSort}"]`)?.focus({preventScroll:true})}
  if(button.dataset.ccAssign){const row=rows.find(row=>row.spuId===button.dataset.ccAssign),task=ccOpportunityTask(row);if(task.deletedAt)return;upOpenTodoDialog(task,task.status==='suggested'?'assign':'detail',upAiFullContext(row.product).state,()=>{paint();toast('降本待办已同步')})}
  if(button.dataset.ccView){const row=rows.find(row=>row.spuId===button.dataset.ccView);upOpenDetail({spuId:row.spuId,start:row.start,end:row.end,period:{mode:'recent30',year:+row.end.slice(0,4),value:+row.end.slice(5,7)},platform:'all',tab:'operating',module:'cost'})}
 };
 root.ccRefresh=paint;paint();
}
