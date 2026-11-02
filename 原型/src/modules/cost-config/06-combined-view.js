// 部门目标和实际同表展示；只在部门层出现目标，实际细项展开查看。
const cecExpandedDepartments=new Set(ccDepartments.map(row=>row.id));
function cecCombinedDepartments(){
 const query=cecState.query.trim().toLowerCase();
 return ccDepartments.filter(row=>(!cecState.department||row.id===cecState.department)&&(!query||row.name.toLowerCase().includes(query)||ccItems.some(item=>item.department===row.id&&item.metric.toLowerCase().includes(query))));
}
function cecCombinedDepartment(row){
 const items=ccItems.filter(item=>item.department===row.id),target=cecDepartmentTargetSummary(row.id),cells=items.map(item=>cecSummaryCell(item.id)),values=cells.map(cell=>cell.actualCents).filter(Number.isFinite);
 return {...row,items,targetCents:target.targetCents,actualCents:values.length?values.reduce((a,b)=>a+b,0):null,...cecLatestUpdate([target,...cells,...items.map(item=>cecStore.metrics[item.id])])};
}
function cecCombinedDetails(department){
 let first=true;
 return cecDepartmentCatalog(department.id).flatMap(group=>group.metrics.map((item,index)=>{
  const cell=cecSummaryCell(item.id),update=cell.updatedAt?cell:cecStore.metrics[item.id]||{},anchor=first?` id="cec-details-${department.id}"`:'';first=false;
  return `<tr class="cec-detail-row" data-cec-details="${department.id}" data-cec-project="${esc(item.id)}"${anchor}><td class="cec-tree-spacer"></td>${index===0?`<td rowspan="${group.metrics.length}" class="cec-category-cell">${esc(group.name)}</td>`:''}<td class="cec-metric-cell" data-preserve-terms><strong>${esc(item.metric)}</strong></td><td colspan="2" class="cec-no-target"></td><td class="cec-number">${cecMoney(cell.actualCents)}</td><td class="cec-updater">${esc(update.actor||'—')}</td><td class="cec-updated">${esc(update.updatedAt||'—')}</td><td class="cec-row-actions"><button type="button" data-cec-view="${esc(item.id)}">查看</button></td></tr>`;
 })).join('');
}
function cecRenderCombinedTable(){
 const rows=cecCombinedDepartments().map(cecCombinedDepartment),size=cecPageSize(),prefix={month:'月度',quarter:'季度',year:'年度'}[cecState.mode];
 cecState.page=Math.min(cecState.page,Math.max(1,Math.ceil(rows.length/size)));
 $('#cec-head').innerHTML='<tr>'+['责任部门','一级类目','二级类目','年度目标（元）',prefix+'目标金额（元）',prefix+'实际降本金额（元）','更新人','更新时间','操作'].map(label=>'<th>'+label+'</th>').join('')+'</tr>';
 $('#cec-body').innerHTML=rows.slice((cecState.page-1)*size,cecState.page*size).map(row=>{
  const expanded=cecExpandedDepartments.has(row.id),annual=cecAnnualDepartmentTarget(row.id).total;
  return `<tr data-cec-target-department="${row.id}" class="cec-department-row ${expanded?'is-expanded':''}"><td colspan="3"><button type="button" class="cec-department-toggle" data-cec-expand="${row.id}" aria-expanded="${expanded}" aria-controls="cec-details-${row.id}"><span class="cec-expand-chevron" aria-hidden="true">›</span>${esc(row.name)}<small>${row.items.length}项</small></button></td><td class="cec-number" data-cec-annual-target>${cecMoney(annual)}</td><td class="cec-number" data-cec-period-target>${cecMoney(row.targetCents)}</td><td class="cec-number" data-cec-department-actual>${cecMoney(row.actualCents)}</td><td class="cec-updater">${esc(row.actor||'—')}</td><td class="cec-updated">${esc(row.updatedAt||'—')}</td><td></td></tr>${expanded?cecCombinedDetails(row):''}`;
 }).join('')||'<tr><td colspan="9" class="cec-empty">暂无符合条件的部门</td></tr>';
 const sum=key=>{const values=rows.map(row=>row[key]).filter(Number.isFinite);return values.length?values.reduce((a,b)=>a+b,0):null},annuals=rows.map(row=>cecAnnualDepartmentTarget(row.id).total).filter(Number.isFinite);
 $('#cec-total').innerHTML=rows.length?`<tr><td colspan="3">合计</td><td class="cec-number">${cecMoney(annuals.length?annuals.reduce((sum,value)=>sum+value,0):null)}</td><td class="cec-number">${cecMoney(sum('targetCents'))}</td><td class="cec-number">${cecMoney(sum('actualCents'))}</td><td></td><td></td><td></td></tr>`:'';
 const host=$('#cec-pagination');host.innerHTML=listPager(rows.length,cecState.page,size);bindListPager(host,page=>{cecState.page=page;cecRenderTable()});
}
$('#cec-page').addEventListener('click',event=>{
 const all=event.target.closest('[data-cec-expand-all]');if(all){const expand=all.dataset.cecExpandAll==='true';for(const row of cecCombinedDepartments())expand?cecExpandedDepartments.add(row.id):cecExpandedDepartments.delete(row.id);cecRenderTable();return}
 const toggle=event.target.closest('[data-cec-expand]');
 if(toggle){const id=toggle.dataset.cecExpand;cecExpandedDepartments.has(id)?cecExpandedDepartments.delete(id):cecExpandedDepartments.add(id);cecRenderTable();$('#cec-page [data-cec-expand="'+id+'"]').focus({preventScroll:true})}
});
