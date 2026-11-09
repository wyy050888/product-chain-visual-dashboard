function gdTag(text,tone=''){return `<span class="tag ${tone}">${esc(text)}</span>`}
// 总诊断优先级只作展示，不附带悬浮说明或额外焦点。
function gdPriority(row){
 const key=upTodoPriorityKey((row.task||row).priority);
 return `<span class="up-todo-priority ${key}" aria-label="${esc(upTodoPriorities[key])}">${esc(upTodoPriorities[key])}</span>`;
}
function gdButton(action,id,label){return `<button type="button" class="link" data-gd-action="${action}" data-gd-id="${esc(id)}">${esc(label)}</button>`}
function gdAnalysisObject(row){
 const obj=row.object,light=row.kind!=='key-work'&&obj?.type==='project'&&row.light?`<span class="gd-project-light">${traffic(row.light)}</span>`:'';
 return `<div class="gd-business-object">${diagnosisObjectTag(obj?.type)}<strong>${esc(obj?.name||row.objectName)}${light}</strong></div>${gdHistoryBadge(row)}`;
}
function gdAnalysisTable(headers,rows,kind){
 const layout=['key-work','deviation'].includes(kind)?gdAnalysisColumnLayout(headers,kind):{attributes:'',columns:''};
 return `<div class="tablewrap gd-table-scroll gd-analysis-table ${kind}"><table data-gd-analysis-table="${kind}" ${layout.attributes}>${layout.columns}<thead><tr>${headers.map(h=>typeof h==='string'?'<th>'+h+'</th>':gdSortHeader(h.key,h.label)).join('')}</tr></thead><tbody>${rows||'<tr><td colspan="'+headers.length+'" class="gd-empty">暂无符合条件的记录</td></tr>'}</tbody></table></div>`;
}
function gdFocusTable(rows){
 return gdAnalysisTable(['业务对象','当前聚焦事项','参与人数','人员名单','操作'],rows.map(g=>g.topics.map((topic,i)=>`<tr data-focus-object="${esc(g.id)}" data-focus-topic="${esc(topic.name)}">${i===0?`<td rowspan="${g.topics.length}"><div class="gd-focus-object-heading">${gdAnalysisObject(g)}<span class="gd-focus-total"><b>${g.people.length}</b> 人</span></div></td>`:''}<td>${esc(topic.name)}</td><td><span class="gd-focus-count">${topic.people.length} 人</span></td><td><div class="gd-person-list">${topic.people.map(name=>gdPersonMarkup(name,upTodoPersonDepartment(name))).join('')}</div></td><td><button type="button" class="link" data-gd-action="analysis" data-gd-id="${esc(g.id)}" data-gd-topic="${esc(topic.name)}">${topic.sources.length} 条记录</button></td></tr>`).join('')).join(''),'focus');
}
function gdMismatchTable(rows){
 return gdAnalysisTable(['业务对象','诊断结论','行动建议','涉及人员','操作'],rows.map(r=>`<tr data-analysis-row="${esc(r.id)}"><td>${gdAnalysisObject(r)}</td><td>${gdProblemMarkup(r)}</td><td>${gdProseMarkup(r.suggestion)}</td><td><div class="gd-person-list">${r.people.map(name=>gdPersonMarkup(name,upTodoPersonDepartment(name))).join('')}</div></td><td>${gdButton('analysis',r.id,'查看依据')}</td></tr>`).join(''),'mismatch');
}
// 列表和核对记录共用逐条诊断内容，避免另取摘要造成措辞或顺序不一致。
function gdReportFindingsContent(report){
 return report.findings.length?report.findings.map(f=>`<div class="gd-report-finding"><span class="gd-readable-text">${gdReadableMarkup(f.problem)}</span></div>`).join(''):'<span class="gd-analysis-muted">未发现内容问题</span>';
}
function gdReportFindingsMarkup(report){return gdCellPreview(gdReportFindingsContent(report))}
function gdReportMakeupStatus(row){
 const submitted=row.latestSubmittedAt||row.submitted;
 if(submitted)return Number.isFinite(Date.parse(submitted))?'是':'待核实';
 return row.syncComplete===true?'否':'待核实';
}
function gdReportsTable(rows,missing){
 const headers=missing?['人员 / 部门','报告类型','工作日期','应交时间','是否已补交']:['人员 / 部门','报告类型','工作日期','问题说明','操作'];
 return gdAnalysisTable(headers,rows.map(r=>`<tr data-report-row="${r.id}"><td>${gdPersonMarkup(r.owner,r.department)}</td><td>${esc(r.type)}</td><td>${r.date}</td>${missing?`<td>${r.deadline.slice(0,19).replace('T',' ')}</td><td data-label="是否已补交">${gdReportMakeupStatus(r)}</td>`:`<td data-label="问题说明">${gdReportFindingsMarkup(r)}</td>`}${missing?'':`<td>${gdButton('analysis',r.id,'查看依据')}</td>`}</tr>`).join(''),missing?'missing':'quality');
}
function gdCoreHelpMarkup(){return `<span class="metric-help gd-core-help" role="button" tabindex="0" data-gd-core-help="true" data-metric-rule="${esc('核心事项标准\n满足任一项\n'+gdCoreStandards.map(([label,value])=>label+'：'+value).join('\n'))}" aria-label="查看核心事项标准"></span>`}
// 复用公共浮层的定位、悬浮停留与键盘关闭，仅提供核心标准的结构化内容。
function gdRenderCoreTooltip(target){
 const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text)el.textContent=text;return el};
 const heading=node('div','gd-core-tip-heading');heading.append(node('h4','','核心事项标准'),node('span','','满足任一项'));target.append(heading);
 const list=node('ol','gd-core-tip-rules');
 gdCoreStandards.forEach(([label,value],index)=>{const item=node('li',''),content=node('div','');content.append(node('strong','',label),node('p','',value));item.append(node('span','gd-core-tip-index',String(index+1)),content);list.append(item)});
 target.append(list);
}

function gdDeviationAdvice(row){return gdParticipantAdvice(row.participants)}

function gdDeviationTable(rows){
 const headers=['诊断日期','业务对象',{key:'priority',label:'优先级'},'问题描述','行动建议','涉及人员','跟进状态','更新日期','操作'];
 return gdAnalysisTable(headers,rows.map(row=>`<tr data-gd-deviation="${esc(row.id)}"><td data-label="诊断日期">${esc(gdFollowDate(row,'firstAt'))}</td><td data-label="业务对象">${gdCellPreview(gdAnalysisObject(row))}</td><td data-label="优先级">${gdPriority(row)}</td><td data-label="问题描述">${gdCellPreview(gdProblemMarkup(row))}</td><td data-label="行动建议">${gdCellPreview(gdDeviationAdvice(row))}</td><td data-label="涉及人员">${gdCellPreview(row.participants.map(p=>gdPersonMarkup(p.assignee,p.department)).join('<br>'))}</td><td data-label="跟进状态">${gdFollowStatusMarkup(row)}</td><td data-label="更新日期">${esc(gdFollowDate(row,'updatedAt'))}</td><td data-label="操作">${gdButton('analysis',row.id,'查看依据')}</td></tr>`).join(''),'deviation');
}
