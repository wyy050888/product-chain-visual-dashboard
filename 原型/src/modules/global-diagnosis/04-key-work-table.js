function gdKeyWorkTable(rows,tab){
 const showDue=tab==='project',showListed=tab==='high-risk';
 const headers=['业务对象',{key:'priority',label:'优先级'},'问题描述','行动建议','建议负责人',...(showDue?[{key:'due',label:'建议整改期限'}]:[]),...(showListed?[{key:'listedAt',label:'上榜日期'}]:[]),'操作'];
 const markup=rows.map(row=>`<tr data-gd-key-work="${esc(row.workKey)}"><td data-label="业务对象">${gdCellPreview(gdAnalysisObject(row))}</td><td data-label="优先级">${gdPriority(row)}</td><td data-label="问题描述">${gdCellPreview(gdProblemMarkup(row))}</td><td data-label="行动建议">${gdCellPreview(row.participants.length===1?gdProseMarkup(row.participants[0].action):gdActionContentCell(row,row.participants))}</td><td data-label="建议负责人">${gdCellPreview(row.participants.map(p=>gdPersonMarkup(p.assignee,p.department)).join('<br>'))}</td>${showDue?`<td data-label="建议整改期限">${esc(upTodoDate(row.due))}</td>`:''}${showListed?`<td data-label="上榜日期">${esc(upTodoDate(row.date))}</td>`:''}<td data-label="操作">${gdButton('analysis',row.id,'查看依据')}</td></tr>`).join('');
 return gdAnalysisTable(headers,markup,'key-work');
}
function gdImprovementsTable(rows){
 const headers=['改善事项','当前情况','行动建议','预期改善','涉及人员','操作'];
 const markup=rows.map(row=>`<tr data-gd-improvement="${esc(row.id)}"><td data-label="改善事项"><strong>${esc(row.title)}</strong></td><td data-label="当前情况">${gdCellPreview(gdProblemMarkup(row))}</td><td data-label="行动建议">${gdCellPreview(gdProseMarkup(row.suggestion))}</td><td data-label="预期改善">${gdCellPreview(gdProseMarkup(row.benefit))}</td><td data-label="涉及人员">${row.people.map(p=>gdImprovementPersonMarkup(row,p)).join('<br>')}</td><td data-label="操作">${gdButton('analysis',row.id,'查看依据')}</td></tr>`).join('');
 return gdAnalysisTable(headers,markup,'improvements');
}

function gdImprovementPersonMarkup(row,name){return gdPersonMarkup(name,row.sources.find(s=>s.owner===name&&s.department)?.department||upTodoPersonDepartment(name))}
