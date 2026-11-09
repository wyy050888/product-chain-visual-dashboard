function gdAnalysisSourceTable(sources){
 const rows=gdSourceRows(sources),receipts=rows.filter(s=>diagnosisSourceType(s).key==='ai-analysis'),evidence=rows.filter(s=>diagnosisSourceType(s).key!=='ai-analysis');
 return `<div class="gd-analysis-sources"><table aria-label="来源与内容"><thead><tr><th>来源</th><th>内容</th></tr></thead><tbody>${evidence.map(s=>`<tr data-analysis-source="${esc(s.id)}"><td>${gdSourceLocationMarkup(s)}</td><td>${gdSourceContentMarkup(s)}</td></tr>`).join('')}</tbody></table></div>`+(receipts.length?`<div class="gd-detail-note" data-source-reading-scope>读取范围：${receipts.map(s=>gdReadableMarkup(s.content)).join('<br>')}</div>`:'');
}
// 重点清单与工作偏差共用依据布局，字段名和数值对应各自主表。
function gdWorkEvidenceFields(row){
 const keyWork=row.kind==='key-work',participants=row.participants||[];
 const suggestion=`<section class="gd-detail-section gd-text-section"><h5>行动建议</h5>${gdParticipantAdvice(participants)}</section>`;
 const priority=keyWork?`<section class="gd-detail-section gd-text-section"><h5>${row.keyType==='project'?'项目红绿灯':'风险榜单'}</h5><p>${gdKeyWorkFactMarkup(row)}</p></section>`:`<section class="gd-detail-section gd-text-section gd-detail-priority"><h5>优先级</h5><p>${gdPriority(row)}</p></section>`;
 const roster=`<section class="gd-detail-section gd-detail-roster"><h5>${keyWork?'建议负责人':'涉及人员'}</h5><div class="gd-person-list gd-detail-people">${participants.map(p=>gdPersonMarkup(p.assignee,p.department)).join('')}</div></section>`;
 return gdTextSection('诊断日期',gdFollowDate(row,'firstAt'))+gdTextSection('更新日期',gdFollowDate(row,'updatedAt'))+priority+gdTextSection('问题描述',gdProblemText(row))+suggestion+roster+(keyWork&&row.keyType==='project'?gdTextSection('建议整改期限',upTodoDate(row.due)):'')+gdTextSection('跟进状态',gdFollowStatus(row)||'—',gdFollowStatus(row)?'':'（缺少本事项的明确跟进证据）');
}
function gdOpenAnalysis(row,topicName=''){
 const focus=row.kind==='focus-analysis',report=row.kind==='report-analysis',topic=focus&&row.topics.find(t=>t.name===topicName),sources=topic?topic.sources:row.sources;
 const people=focus?(topic?.people||row.people):row.people||[];
 const reportName=report&&(row.reportName||row.sources?.[0]?.sourceName||row.owner+'的'+row.type+gdSourceDate(row.date));
 const keyWork=row.kind==='key-work',deviation=['omission','blocker','solution','focus-shift'].includes(row.kind),evidence=keyWork||deviation,resource=row.kind==='mismatch'||row.kind==='improvement';
 const name=report?'':row.object?.name||row.objectName,heading=focus?topicName||'全部聚焦事项':report?row.owner+' · '+row.type+' · '+row.date:row.title;
 const title=focus?'工作聚焦 - '+name:report?(row.missing?'报告提交台账-':'问题诊断报告-')+reportName:evidence?'查看依据 - '+name:row.kind==='improvement'?'改善建议 - '+row.title:resource?'工作排序建议':'重点工作依据 - '+name;
 const roster=focus?`<section class="gd-detail-section gd-detail-roster"><h5>参与人员（${people.length}人）</h5><div class="gd-person-list gd-detail-people">${people.map(person=>gdPersonMarkup(person,upTodoPersonDepartment(person))).join('')}</div></section>`:'';
 const reportDiagnosis=report&&!row.missing?gdReportDiagnosisView(row):'';
 const diagnosis=evidence?gdWorkEvidenceFields(row):resource?gdTextSection(row.kind==='improvement'?'当前情况':'诊断结论',gdProblemText(row))+gdTextSection('行动建议',row.suggestion)+gdTextSection('预期改善',row.benefit)+`<section class="gd-detail-section gd-detail-roster"><h5>涉及人员</h5><div class="gd-person-list gd-detail-people">${people.map(person=>gdImprovementPersonMarkup(row,person)).join('')}</div></section>`:row.problem?gdTextSection('问题描述',row.problem):'';
 const context=evidence?'':row.coreHit?gdTextSection('命中核心标准',row.coreHit):row.dependencies?gdTextSection('上下游依赖',row.dependencies.join(' → ')):row.gaps?gdTextSection('方案缺口',row.gaps.join('、')):row.coverage?gdTextSection('扫描结果',`${row.coverage.start} — ${row.coverage.end}，已收集 ${row.coverage.checked} 条具名来源，该对象匹配 0 条。该判断限定于已收集材料。`):'';
 const detailHead=evidence||row.kind==='improvement'?'':focus?`<section class="gd-detail-section gd-text-section gd-focus-topic"><h5>当前聚焦事项</h5><p><strong>${esc(heading)}</strong></p></section>`:report?'':`<div class="gd-detail-head"><h3>${esc(heading)}</h3>${name&&!deviation&&row.kind!=='key-work'?resource?gdAnalysisObject(row):`<div>${esc(name)}</div>`:''}</div>`;
 const reportTabs=report&&!row.missing;
 const sourceContent=`<section class="gd-detail-section" ${reportTabs?'data-gd-report-pane="sources"':''}>${reportTabs?'':'<h5>来源依据</h5>'}${gdAnalysisSourceTable(sources)}${gdHistoryEvidence(row)}</section>`;
 const content=reportTabs?`<div data-gd-report-pane="report">${reportDiagnosis}</div>${sourceContent}`:detailHead+roster+diagnosis+context+reportDiagnosis+sourceContent;
 openModal(title,`<article class="gd-dialog gd-analysis-dialog ${focus?'gd-focus-dialog':''} ${row.kind==='improvement'?'gd-improvement-dialog':''} ${evidence?'gd-evidence-dialog':''} ${deviation?'gd-deviation-dialog':''} ${keyWork?'gd-key-work-dialog':''} ${reportTabs?'gd-report-dialog':''}" ${evidence?'data-skip-product-summary':''} data-gd-analysis-detail="${esc(row.id)}">${content}</article>`);
 // 公共副标题与主标题同排，已有抽屉栈会保留其中的标签节点。
 if(focus||evidence)$('#dialogsub').innerHTML=diagnosisObjectTag(row.object?.type);
}
