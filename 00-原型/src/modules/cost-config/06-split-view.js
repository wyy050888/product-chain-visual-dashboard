const cecTabFilters={actual:null,target:null};
function cecSwitchTab(tab){
 if(!['actual','target'].includes(tab)||tab===cecState.tab)return;
 cecTabFilters[cecState.tab]={department:cecState.department,query:cecState.query,page:cecState.page};
 Object.assign(cecState,{tab,department:'',query:'',page:1},cecTabFilters[tab]||{});cecRenderPage();
}
function cecSplitDepartments(){
 const query=cecState.query.trim().toLowerCase();
 return ccDepartments.filter(row=>(!cecState.department||row.id===cecState.department)&&(!query||row.name.toLowerCase().includes(query)||(cecState.tab==='actual'&&ccItems.some(item=>item.department===row.id&&[item.metric,ccCategoryName(item.category)].some(value=>value.toLowerCase().includes(query))))));
}
function cecRenderDepartmentTabs(){
 $('#cec-departments').innerHTML=[['','全部部门'],...ccDepartments.map(row=>[row.id,row.name])].map(([id,name])=>`<button type="button" role="tab" data-cec-department="${id}" aria-selected="${cecState.department===id}" aria-controls="cec-table-content" tabindex="${cecState.department===id?0:-1}">${esc(name)}</button>`).join('');
}
function cecRenderSplitTable(){
 const actual=cecState.tab==='actual',page=$('#cec-page');page.dataset.cecTab=cecState.tab;page.dataset.cecMode=cecState.mode;
 $('#cec-data-panel').setAttribute('aria-labelledby','cec-tab-'+cecState.tab);
 page.querySelectorAll('[data-cec-tab]').forEach(button=>{const selected=button.dataset.cecTab===cecState.tab;button.setAttribute('aria-selected',selected);button.tabIndex=selected?0:-1});
 $('#cec-history').dataset.uiImportHistory=cecImportModule(cecState.tab);
 $('#cec-query').placeholder=actual?'搜索降本指标':'搜索部门';$('#cec-query').setAttribute('aria-label',actual?'搜索部门或降本指标':'搜索部门');
 const departments=$('#cec-departments');departments.hidden=!actual;page.querySelector('.cec-filters').hidden=!actual;
 if(actual)cecRenderDepartmentTabs();else departments.replaceChildren();
 return actual?cecRenderActualTable():cecRenderTargetTable();
}
function cecRenderActualTable(){
 const query=cecState.query.trim().toLowerCase(),departments=new Set(cecSplitDepartments().map(row=>row.id)),periods=cecYearPeriods();
 const rows=ccItems.filter(item=>departments.has(item.department)&&(!query||[cecDepartment(item.department).name,item.metric,ccCategoryName(item.category)].some(value=>value.toLowerCase().includes(query)))).map(item=>{
  const cells=periods.map(period=>cecActualPeriodCell(item.id,period.months));return {...item,periods:cells.map(cell=>cell.actualCents),...cecLatestUpdate([...cells,cecStore.metrics[item.id]])};
 });
 const table=$('#cec-page .cec-table'),widths=[160,140,300,...periods.map(()=>150),100,180];table.querySelector('colgroup')?.remove();table.insertAdjacentHTML('afterbegin','<colgroup>'+widths.map(width=>'<col style="width:'+width+'px">').join('')+'</colgroup>');table.style.minWidth=widths.reduce((sum,width)=>sum+width,0)+'px';
 const headers=['责任部门','一级类目','二级类目',...periods.map(period=>cecState.mode==='year'?'年度实际降本金额（元）':period.label),'更新人','更新时间'];
 $('#cec-head').innerHTML='<tr>'+headers.map((label,index)=>'<th'+(index>=3&&index<headers.length-2?' class="cec-number"':'')+'>'+label+'</th>').join('')+'</tr>';
 const amounts=values=>values.map((value,index)=>'<td class="cec-number" data-cec-actual-period="'+periods[index].key+'">'+cecDisplayMoney(value)+'</td>').join('');
 const size=cecPageSize();cecState.page=Math.max(1,Math.min(cecState.page,Math.ceil(rows.length/size)||1));
 $('#cec-body').innerHTML=rows.slice((cecState.page-1)*size,cecState.page*size).map(row=>`<tr data-cec-project="${esc(row.id)}"><td>${esc(cecDepartment(row.department).name)}</td><td>${esc(ccCategoryName(row.category))}</td><td data-preserve-terms>${esc(row.metric)}</td>${amounts(row.periods)}<td class="cec-updater">${esc(row.actor||'—')}</td><td class="cec-updated">${esc(row.updatedAt||'—')}</td></tr>`).join('')||'<tr><td colspan="'+headers.length+'" class="cec-empty">暂无符合条件的明细</td></tr>';
 const totals=periods.map((_,index)=>{const known=rows.map(row=>row.periods[index]).filter(Number.isFinite);return known.length?known.reduce((sum,value)=>sum+value,0):null});
 $('#cec-total').innerHTML=rows.length?'<tr><td>合计</td><td></td><td></td>'+amounts(totals)+'<td></td><td></td></tr>':'';
 cecRenderPager(rows.length,size);
}
function cecRenderPager(total,size){const host=$('#cec-pagination');host.innerHTML=listPager(total,cecState.page,size);bindListPager(host,value=>{cecState.page=value;cecRenderTable()})}
$('#cec-page').addEventListener('keydown',event=>{
 const tab=event.target.closest('[data-cec-tab],[data-cec-department]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();
 if(tab.hasAttribute('data-cec-department')){
  const buttons=[...$('#cec-departments').querySelectorAll('button')],at=buttons.indexOf(tab),index=event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
  buttons[index].click();$('#cec-departments [aria-selected="true"]').focus();return;
 }
 const kind=event.key==='Home'?'actual':event.key==='End'?'target':cecState.tab==='actual'?'target':'actual';cecSwitchTab(kind);$('#cec-page [data-cec-tab="'+kind+'"]').focus();
});
