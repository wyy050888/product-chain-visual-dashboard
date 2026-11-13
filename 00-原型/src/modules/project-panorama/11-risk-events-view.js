function ppEventCountCell(kind,events){
 const [red,yellow]=ppRiskLights.map(light=>events.filter(({risk})=>risk.light===light).length);
 return `<td data-pp-event-count="${kind}" aria-label="红灯风险 ${red}，黄灯风险 ${yellow}"><span class="red">${red}</span>${ppRiskCountSeparator}<span class="orange">${yellow}</span></td>`;
}

function ppRiskEventsTable(currentRows){
 const range=ppEventRange(),dimension=ppState.distribution,department=ppEventDepartment();
 const groups=ppEventGroups(ppEventRows(range,currentRows),range,dimension,department);
 const today=dashboardToday(),shortDate=date=>date.slice(date.slice(0,4)===today.slice(0,4)?5:2).replaceAll('-','/');
 const dateLabel=range.start!==range.end?`<span class="pp-event-period-range"><span>${shortDate(range.start)}</span><span>–${shortDate(range.end)}</span></span>`:`<span>${shortDate(range.end)}</span>`;
 const rangeLabel=range.start===range.end?range.end:range.start+' 至 '+range.end;
 const departmentPicker=pcIsActive()?'':`<select data-pp-event-department aria-label="新增与闭环风险责任部门">${['全部',...ppDepartments].map(name=>`<option value="${name}" ${department===name?'selected':''}>${name==='全部'?'全部部门':name}</option>`).join('')}</select>`;
 const rows=groups.map(group=>`<tr data-pp-event-group="${esc(group.key)}"><th scope="row">${esc(group.key)}</th>${ppEventCountCell('new',group.new)}${ppEventCountCell('closed',group.closed)}</tr>`).join('');
 return `<article class="pp-card pp-events"><div class="pp-card-head"><h3 id="pp-event-title">新增与闭环风险</h3>
  <button type="button" class="risk-date-trigger" data-pp-event-period aria-label="风险统计日期 ${rangeLabel}" title="${rangeLabel}" aria-haspopup="dialog" aria-expanded="false" aria-controls="pp-event-date-popover">${dateLabel}<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2v4m8-4v4M3 8h14"/></svg></button></div>
  ${ppChartDimensionTabs('data-pp-event-dimension',departmentPicker)}
  <div class="pp-event-table-wrap tablewrap"><table aria-labelledby="pp-event-title"><thead><tr><th scope="col">${dimension==='type'?'项目类型':'链群'}</th><th scope="col">新增</th><th scope="col">闭环</th></tr></thead><tbody>${rows}</tbody></table></div>
 </article>`;
}

function ppRefreshRiskEvents(panel,focusSelector){
 panel.outerHTML=withPeriod('projects',()=>ppRiskEventsTable());
 $('#pp-overview .pp-events')?.querySelector(focusSelector)?.focus({preventScroll:true});
}

document.addEventListener('change',event=>{
 const select=event.target.closest('#projects.pp-main [data-pp-event-department]');if(!select)return;
 ppEventState.department=select.value;
 ppRefreshRiskEvents(select.closest('.pp-events'),'[data-pp-event-department]');
});
document.addEventListener('click',event=>{
 const button=event.target.closest('#projects.pp-main [data-pp-event-period]');if(!button)return;
 if(button.getAttribute('aria-expanded')==='true'){dateRangeActive?.close();return}
 openDateRangePicker(button,ppEventRange(),(start,end)=>{
  ppEventState.range=start===end&&end===dashboardToday()?null:{start,end};
  ppRefreshRiskEvents(button.closest('.pp-events'),'[data-pp-event-period]');
 },{id:'pp-event-date-popover',label:'选择风险统计日期范围',min:pjDayMinimum,max:dashboardToday});
});
