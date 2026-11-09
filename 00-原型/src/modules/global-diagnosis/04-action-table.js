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
function gdActionParts(value){
 const action=String(value||''),summary=gdActionSummary(action),prefix='【'+summary+'】';
 const body=action.startsWith(prefix)?action.slice(prefix.length):action;
 const plain=text=>text.replace(/[\s，。；：、,.!?;:]/g,'');
 const detail=plain(body)===plain(summary)?'':body.startsWith(summary)?body.slice(summary.length).replace(/^[\s，。；：、,.;:]+/,''):body;
 return {summary,prefix,detail};
}
function gdActionContentMarkup(value){
 const {prefix,detail}=gdActionParts(value);
 return `<div class="gd-action-content"><strong class="gd-action-summary">${esc(prefix)}</strong>${detail?`<span class="gd-action-detail gd-readable-text">${gdReadableMarkup(detail)}</span>`:''}</div>`;
}
// 同一建议摘要只展示一次，下方按实际分工分述；不把姓名或岗位当作摘要。
function gdParticipantAdvice(participants){
 const groups=new Map();
 for(const person of participants){const part=gdActionParts(person.action);if(!groups.has(part.summary))groups.set(part.summary,[]);groups.get(part.summary).push({person,...part})}
 return [...groups].map(([summary,items])=>`<div class="gd-action-content"><strong class="gd-action-summary">【${esc(summary)}】</strong>${items.map(({person,detail})=>`<div class="gd-action-detail gd-readable-text">${items.length>1&&person.assignee?esc(person.assignee)+'：':''}${gdReadableMarkup(detail)}</div>`).join('')}</div>`).join('');
}
function gdActionContentCell(row,roles){
 const actions=[...new Set(roles.map(role=>upTodoExecutionText(row.task,role)))];
 return actions.map(gdActionContentMarkup).join('');
}
function gdActionOperationsCell(row){
 const icon=(action,label,paths)=>`<button type="button" class="gd-task-icon" data-gd-action="${action}" data-gd-id="${esc(row.id)}" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg></button>`;
 return '<div class="gd-action-tools">'+icon('task-detail','编辑','<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>')+icon('task-delete','删除','<path d="M3 6h18M9 6V4h6v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/>')+'</div>';
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
// 列宽偏好升级为v3，旧布局偏好不覆盖当前默认宽度。
function gdActionTable(entries,filter=gdTableFilters()){
 const sortKeys={priority:'priority',due:'due',completedAt:'completed',registrationDate:'registered'};
 const header=gdLedgerColumns.map(([key,label])=>sortKeys[key]?gdSortHeader(sortKeys[key],label,filter):'<th>'+label+'</th>').join('')+'<th>操作</th>';
 const body=entries.map(({row})=>'<tr data-gd-row="'+esc(row.id)+'" data-gd-task="'+esc(row.id)+'">'+gdLedgerColumns.map(([key,label])=>{
  const task=row.task,value=key==='gdCategory'?(gdLedgerChain(task[key])==='无'?'<span class="gd-ledger-none">无</span>':esc(gdLedgerChain(task[key]))):key==='priority'?gdPriority(task):key==='status'?'<span class="up-todo-status '+task.status+'">'+gdLedgerStatus[task.status]+'</span>':esc((key==='completedAt'?upTodoDate(task[key]):task[key])||'—');
  return '<td data-label="'+label+'">'+(['title','deliverable','latestProgress'].includes(key)?gdActionPreview(value):value)+'</td>';
 }).join('')+'<td>'+gdActionOperationsCell(row)+'</td></tr>').join('');
 return '<div class="tablewrap gd-table-scroll gd-action-table"><table data-gd-table data-column-key="gd-ledger-columns-v3"><thead><tr>'+header+'</tr></thead><tbody>'+(body||'<tr><td colspan="15" class="gd-empty">暂无符合条件的任务</td></tr>')+'</tbody></table></div>';
}
