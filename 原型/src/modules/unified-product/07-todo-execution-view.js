// 六列主表：一个执行事项一行，负责人仅在点击后进入多选编辑。
function upTodoExecutionGroup(group,task,canDelete=false){
 const row=upTodoExecutionState(task,group),field=(key,content)=>upTodoInlineDisplay(key,content,row.id,!group.rows.some(r=>r.assignee)&&key==='status',true);
 const remove=upTodoExecutionIcon(`data-execution-delete="${esc(row.id)}" ${canDelete?'':'disabled'}`,canDelete?'删除执行事项':'至少保留一条执行事项','<path d="M3 6h18M9 6V4h6v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/>');
 const feedback=`<div class="up-execution-feedback">${field('feedback',row.feedback?esc(row.feedback):'<span class="up-todo-inline-placeholder">填写备注</span>')}${remove}</div>`;
 return `<tr data-execution-group="${esc(group.key)}" data-execution-anchor="${esc(row.id)}" data-responsibility-row="${esc(row.id)}"><td data-responsibility-action-cell>${field('action',esc(upTodoExecutionText(task,row)))}</td><td>${upTodoPeopleMultiple(task,row.id)}</td><td>${field('status',upTodoStatusTag(row))}</td><td>${field('due',esc(upTodoDate(row.due)))}</td><td data-execution-completed>${esc(upTodoDate(row.completedAt))}</td><td>${feedback}</td></tr>`;
}
function upTodoExecutionIcon(action,label,path){return `<button type="button" class="up-execution-icon" ${action} aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg></button>`}
function upTodoExecutionDraft(task,draft,open){
 if(!open)return '';
 return `<tr class="up-execution-draft" data-responsibility-form><td><textarea data-responsibility-action aria-label="新增执行事项" placeholder="填写执行事项" rows="2" maxlength="3000">${esc(draft.action)}</textarea><p class="up-todo-dialog-error" role="alert"></p></td><td>${upTodoPeopleMultiple(task)}</td><td><select data-responsibility-status aria-label="新增事项状态">${['pending','working','done'].map(status=>`<option value="${status}" ${draft.status===status?'selected':''}>${upTodoStatuses[status]}</option>`).join('')}</select></td><td><input type="date" data-responsibility-due aria-label="新增事项计划完成日期" value="${esc(draft.due)}"></td><td>—</td><td><textarea data-responsibility-feedback aria-label="新增事项反馈备注" placeholder="填写备注" rows="2" maxlength="3000">${esc(draft.feedback)}</textarea><div class="up-execution-draft-tools">${upTodoExecutionIcon('data-responsibility-submit','确认新增','<path d="m5 12 4 4L19 6"/>')}${upTodoExecutionIcon('data-responsibility-cancel','删除空行','<path d="M3 6h18M9 6V4h6v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/>')}</div></td></tr>`;
}

// 建单前先核对既有分工，确认后复用同一六列表进行办理；不把多人分工降为单负责人。
function upTodoAssignmentPreview(task){
 const headers=['执行事项','负责人','状态','计划完成日期','实际完成日期','反馈备注'];
 const rows=upTodoResponsibilityGroups(task.responsibilities).map(group=>{
  const row=group.rows[0],names=group.rows.map(r=>(r.assignee||'待分配')+'-'+(r.department||upTodoPersonDepartment(r.assignee,task)));
  return `<tr><td>${esc(row.action)}</td><td>${names.map(esc).join('<br>')}</td><td>${upTodoStatusTag(row)}</td><td data-todo-assign-date="${row.due==null?'inherit':'fixed'}">${esc(upTodoDate(row.due||task.due))}</td><td>—</td><td>—</td></tr>`;
 }).join('');
 return `<section class="up-todo-assignment-preview"><h5>执行事项</h5><div class="tablewrap"><table aria-label="任务下发"><thead><tr>${headers.map(h=>'<th>'+h+'</th>').join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
