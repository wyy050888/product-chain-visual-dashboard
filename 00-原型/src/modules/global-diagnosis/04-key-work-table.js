function gdKeyWorkTable(rows,tab){
 const showDue=tab==='project';
 const factLabel=showDue?'项目红绿灯':'风险榜单';
 const headers=[{key:'listedAt',label:'诊断日期'},'业务对象',factLabel,'问题描述','行动建议','建议负责人',...(showDue?[{key:'due',label:'建议整改期限'}]:[]),'跟进状态','更新日期','操作'];
 const markup=rows.map(row=>`<tr data-gd-key-work="${esc(row.workKey)}"><td data-label="诊断日期">${esc(gdFollowDate(row,'firstAt'))}</td><td data-label="业务对象">${gdCellPreview(gdKeyWorkObjectMarkup(row))}</td><td data-label="${factLabel}">${gdKeyWorkFactMarkup(row)}</td><td data-label="问题描述">${gdCellPreview(gdProblemMarkup(row))}</td><td data-label="行动建议">${gdCellPreview(gdParticipantAdvice(row.participants))}</td><td data-label="建议负责人">${gdKeyWorkPrimaryMarkup(row)}</td>${showDue?`<td data-label="建议整改期限">${esc(upTodoDate(row.due))}</td>`:''}<td data-label="跟进状态">${gdFollowStatusMarkup(row)}</td><td data-label="更新日期">${esc(gdFollowDate(row,'updatedAt'))}</td><td data-label="操作">${gdButton('analysis',row.id,'查看依据')}</td></tr>`).join('');
 return gdAnalysisTable(headers,markup,'key-work');
}
// 名称投影不改变项目＋任务的内部身份；阶段仍在来源依据中。
function gdKeyWorkObjectMarkup(row){
 if(row.keyType!=='project')return gdAnalysisObject(row);
 return `<div class="gd-readable-text">项目：${esc(row.object?.name||row.objectName||'—')}<br>任务：${esc(row.projectTaskName||'—')}</div>`;
}
// 多个协同时不能按数组顺序猜主责，明确主责或唯一承接人才可进入外侧列。
function gdKeyWorkPrimaryMarkup(row){
 const people=row.participants||[],primary=people.find(p=>p.primary===true||p.role==='主责')||(people.length===1?people[0]:null);
 return primary?gdPersonMarkup(primary.assignee,primary.department):'—';
}
function gdKeyWorkFactMarkup(row){return row.keyType==='project'?ppTraffic(row.projectLight||row.light):esc(row.riskBoardName||(typeof rpTitles==='undefined'?'':rpTitles[row.riskBoardKind])||'榜名未提供')}
function gdImprovementsTable(rows){
 const headers=['改善事项','当前情况','行动建议','预期改善','涉及人员','操作'];
 const markup=rows.map(row=>`<tr data-gd-improvement="${esc(row.id)}"><td data-label="改善事项"><strong>${esc(row.title)}</strong></td><td data-label="当前情况">${gdCellPreview(gdProblemMarkup(row))}</td><td data-label="行动建议">${gdCellPreview(gdProseMarkup(row.suggestion))}</td><td data-label="预期改善">${gdCellPreview(gdProseMarkup(row.benefit))}</td><td data-label="涉及人员">${row.people.map(p=>gdImprovementPersonMarkup(row,p)).join('<br>')}</td><td data-label="操作">${gdButton('analysis',row.id,'查看依据')}</td></tr>`).join('');
 return gdAnalysisTable(headers,markup,'improvements');
}

function gdImprovementPersonMarkup(row,name){return gdPersonMarkup(name,row.sources.find(s=>s.owner===name&&s.department)?.department||upTodoPersonDepartment(name))}
