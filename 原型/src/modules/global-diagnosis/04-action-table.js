function gdPersonLabel(name,department){return (name||'待分配')+(department&&department!=='—'?'-'+department:'')}
function gdPersonMarkup(name,department){return '<span class="gd-person"><span class="gd-person-name">'+esc(name||'待分配')+'</span>'+(department&&department!=='—'?'<span class="gd-person-department">-'+esc(department)+'</span>':'')+'</span>'}
function gdActionObjectCell(row){return row.businessObjects.map(object=>'<div class="gd-business-object">'+diagnosisObjectTag(object.type)+'<span>'+esc(object.name)+'</span></div>').join('')}
function gdActionDateCell(row){
 const task=row.task,value=task.due||'';
 return '<span class="gd-date '+(task.status!=='done'&&value&&value<aiToday()?'red':'')+'">'+(value?esc(value):'—')+'</span>';
}
function gdActionProgress(row){return upTodoStatusTag(row.task)}
function gdActionPreview(markup){return gdCellPreview(markup)}
function gdActionOwnerCell(row,roles){
 const people=roles.map(role=>({name:role.assignee,department:role.department||upTodoPersonDepartment(role.assignee,row.task)}));
 const unique=[...new Map(people.map(person=>[gdPersonLabel(person.name,person.department),person])).values()],full=unique.map(person=>gdPersonLabel(person.name,person.department)).join('\n');
 return '<div class="gd-owner-summary" role="group" tabindex="0" aria-label="'+esc(full)+'">'+unique.map(person=>'<div class="gd-owner-line">'+gdPersonMarkup(person.name,person.department)+'</div>').join('')+'</div>';
}
// 三类清单共用摘要排版；正文仅去除与摘要完全重复的前缀。
function gdActionContentMarkup(value){
 const action=String(value||''),summary=gdActionSummary(action),prefix='【'+summary+'】';
 const body=action.startsWith(prefix)?action.slice(prefix.length):action;
 const plain=text=>text.replace(/[\s，。；：、,.!?;:]/g,'');
 const detail=plain(body)===plain(summary)?'':body.startsWith(summary)?body.slice(summary.length).replace(/^[\s，。；：、,.;:]+/,''):body;
 return `<div class="gd-action-content"><strong class="gd-action-summary">${esc(prefix)}</strong>${detail?`<span class="gd-action-detail gd-readable-text">${gdReadableMarkup(detail)}</span>`:''}</div>`;
}
function gdActionContentCell(row,roles){
 const actions=[...new Set(roles.map(role=>upTodoExecutionText(row.task,role)))];
 return actions.map(gdActionContentMarkup).join('');
}
function gdActionOperationsCell(row){
 return '<div class="gd-action-tools">'+gdButton('task-detail',row.id,'查看任务')+'</div>';
}
function gdActionEvidenceMarkup(row){
 const reasons=gdDiagnosisReasons(row);
 if(reasons.length)return '<div class="gd-diagnosis-reasons">'+reasons.map(reason=>'<div data-gd-reason="'+esc(reason.key)+'"><strong class="gd-reason-label">'+esc(reason.label)+'</strong><p class="gd-reason-basis">'+esc(reason.basis)+'</p></div>').join('')+'</div>';
 return '<div class="gd-problem">'+esc(row.impact?row.problem.replace(/[。；;]$/,'')+'；'+row.impact:row.problem)+'</div>';
}
function gdActionProblemCell(row){
 return gdProblemMarkup(row);
}
function gdSortHeader(key,label,filter=gdTableFilters()){
 const active=filter.sort===key,direction=active?filter.sortDirection:'',next=!active?(['completed','listedAt'].includes(key)?'降序':'升序'):direction==='asc'?'降序':'升序';
 return '<th aria-sort="'+(active?(direction==='asc'?'ascending':'descending'):'none')+'"><button type="button" class="rp-sort-header" data-gd-header-sort="'+key+'" data-direction="'+direction+'" aria-label="'+label+'：'+next+'" title="点击'+next+'">'+label+'<span class="rp-sort-arrows" aria-hidden="true"></span></button></th>';
}
function gdActionTable(entries,filter=gdTableFilters()){
 const headers=['业务对象','优先级','问题描述','执行事项','责任部门/责任人','计划完成日期','状态','实际完成日期','操作'],sortKeys={1:'priority',5:'due',7:'completed'};
 const markup=entries.map(({row,roles})=>{
  const task=row.task;
  return '<tr data-gd-row="'+esc(row.id)+'" data-gd-task="'+esc(task.id)+'" class="gd-task-start"><td data-label="业务对象">'+gdActionPreview(gdActionObjectCell(row))+'</td><td data-label="优先级">'+gdPriority(task)+'</td><td data-label="问题描述">'+gdActionPreview(gdActionProblemCell(row))+'</td><td data-label="执行事项">'+gdActionPreview(gdActionContentCell(row,roles))+'</td><td data-label="责任部门/责任人">'+gdActionPreview(gdActionOwnerCell(row,roles))+'</td><td data-label="计划完成日期">'+gdActionDateCell(row)+'</td><td data-label="状态"><div class="gd-task-state">'+gdActionProgress(row)+'</div></td><td data-label="实际完成日期"><span class="gd-date">'+esc(upTodoDate(task.status==='done'?task.completedAt:''))+'</span></td><td data-label="操作">'+gdActionOperationsCell(row)+'</td></tr>';
 }).join('');
 // 列宽布局版本隔离旧偏好；两个任务入口继续共用新版本的手动列宽。
 return '<div class="tablewrap gd-table-scroll gd-action-table"><table data-gd-table data-column-key="gd-task-columns-v2"><thead><tr>'+headers.map((h,i)=>sortKeys[i]?gdSortHeader(sortKeys[i],h,filter):'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+(markup||'<tr><td colspan="'+headers.length+'" class="gd-empty">暂无符合条件的事项</td></tr>')+'</tbody></table></div>';
}
