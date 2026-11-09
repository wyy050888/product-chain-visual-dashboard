import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifySampleRefresh(){
 const role={id:'kept-role',assignee:'唐琪',department:'采购部',action:'旧模板动作',status:'pending',feedback:'',completedAt:''};
 const task={id:'seed',source:'global-diagnosis',gdAutomatic:true,status:'pending',descriptionVersion:3,title:'旧标题',description:'旧问题',gdProblem:'旧问题',assignedAt:'2026-10-01',due:'2026-10-25',logs:[{action:'assign'}],responsibilities:[role],plan:'唐琪：旧模板动作'};
 const row={workTaskId:task.id,title:'新标题',problem:'新问题',samplePreviousActions:['旧模板动作'],decisionParticipants:[{assignee:'唐琪',department:'采购部',action:'新模板动作',completionCriteria:'新标准'}]};
 let writes=0;const box={upTodos:{seed:structuredClone(task)},upPersistTodos:next=>{box.upTodos=next;writes++}};
 vm.createContext(box);vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/03-work-tasks.js',import.meta.url),'utf8'),box);
 box.gdRefreshSampleTasks([row]);const updated=box.upTodos.seed;
 assert.equal(updated.responsibilities[0].id,role.id);assert.equal(updated.responsibilities[0].action,'新模板动作');assert.equal(updated.due,task.due);assert.equal(updated.assignedAt,task.assignedAt);assert.equal(updated.status,task.status);
 box.gdRefreshSampleTasks([row]);assert.equal(writes,1,'已升级动作不会重复写入');
 const protectedTasks=[
  {...task,source:'manual'},{...task,gdAutomatic:false},{...task,status:'working'},{...task,status:'done'},
  {...task,descriptionVersion:2},{...task,deletedAt:'2026-10-22'},{...task,evidence:'办理成果'},
  {...task,logs:[{action:'edit'}]},{...task,plan:'人工安排'},
  {...task,responsibilities:[{...role,feedback:'已确认验货'}]},
  {...task,responsibilities:[{...role,action:'人工修改动作'}]},
  {...task,responsibilities:[{...role,assignee:'林悦'}]}
 ];
 for(const protectedTask of protectedTasks){box.upTodos={seed:structuredClone(protectedTask)};const before=JSON.stringify(box.upTodos);box.gdRefreshSampleTasks([row]);assert.equal(JSON.stringify(box.upTodos),before,'保留人工及办理数据')}
}

export function verifyDiagnosisSampleDiversity(audit,stockRecords){
 const work=audit.work,omissions=work.filter(r=>r.kind==='omission');
 assert.equal(omissions.length,2);assert.equal(omissions.filter(r=>r.problem.includes('呆滞库存')).length,1);assert.equal(omissions.filter(r=>r.problem.includes('待检库存')).length,1);
 const inspection=omissions.find(r=>r.problem.includes('待检库存')),stock=stockRecords.find(r=>r.spuId===inspection.object.spuId);
 assert(stock.factoryInspection>0);assert(inspection.sources.some(s=>s.content.replaceAll(',','').includes('工厂待检库存：'+stock.factoryInspection+'件')),'待检数量来自实际库存快照');
 assert(inspection.participants.every(p=>/待检|验货/.test(p.action)),'执行动作对应验货/放行问题');
 for(const row of omissions){assert.equal(row.coverage.mentions,0);assert(!audit.focus.some(g=>g.objectKey===row.object.key));assert(row.sources.some(s=>s.source.startsWith('来源扫描清单')))}
 const causes={
  'work-core-delivery':/样机交付与检测/, 'work-core-mold':/样品.*拉伤/, 'work-core-certification':/认证主体/,
  'work-core-margin':/阶梯报价|议价清单/, 'work-core-heater-cost':/重复紧固工序/, 'work-core-food-processor-cost':/非标专用件/
 };
 for(const [id,pattern] of Object.entries(causes)){const row=work.find(r=>r.id===id);assert.match(row.problem,pattern);assert(row.sources.some(s=>pattern.test(s.content)),'具体原因有来源支撑：'+id)}
 const issueReports=audit.reports.filter(r=>!r.missing&&r.findings.length),findings=issueReports.flatMap(r=>r.findings);
 assert.equal(issueReports.length,8);assert.equal(findings.length,28);assert.equal(new Set(findings.map(f=>f.problem)).size,28,'问题报告各诊断项分别呈现具体问题');
 for(const report of issueReports){const failed=report.checks.filter(c=>!c.passed);assert.equal(failed.length,report.findings.length);assert(!Object.hasOwn(report,'score'));for(const check of failed)assert(report.sources[0].content.includes(check.excerpt));for(const finding of report.findings)assert.doesNotMatch(finding.problem,/缺少必要信息/)}
 for(const report of audit.reports.filter(r=>!r.missing)){
  assert.equal(report.checks.length,6);assert(report.checks.every(c=>c.excerpt&&c.criterion),'所有诊断项都有原文和判断标准');
  const object=report.checks.find(c=>c.key==='object');if(object.passed){assert.match(object.excerpt,/产品：|项目：/);assert.match(object.excerpt,/型号|SPU|项目ID/)}else{assert.equal(report.owner,'王磊');assert.match(report.findings[0].problem,/业务对象|具体产品/);assert(!report.checks.filter(c=>c.key!=='object').some(c=>audit.work.some(w=>c.excerpt.includes(w.object.name))),'缺对象反例不能从其他字段补回明确产品名称')}
 }
 const descriptions=[...work.map(r=>r.problem),...audit.mismatch.map(r=>r.problem),...findings.map(f=>f.problem)];
 const normalized=descriptions.map(text=>text.replace(/\d[\d.,]*/g,'#').replace(/\s/g,''));
 assert.equal(new Set(normalized).size,normalized.length,'除报告遗漏外，不用同一描述替换数字生成样例');
 for(const row of work)assert.equal(audit.tasks.find(t=>t.task.id===row.task.id).causalProblem,row.causalProblem,'任务清单与重点事项沿用同一任务及问题');
 for(const row of [...work,...audit.mismatch]){
  const ref=row.problemSource,source=row.sources.find(s=>s.id===ref?.sourceId);
  assert(source,'核心依据必须绑定本事项的真实来源ID：'+row.id);assert(source.content.includes(ref.quote));assert(ref.quote.length<=48,'只提取短核心原文');
 }
}

export function verifyProblemSourceModel(){
 const box={esc:text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')};vm.createContext(box);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/shared-classification/02-diagnosis-catalog.js',import.meta.url),'utf8'),box);
 for(const file of ['04-readable-text.js','05-source-location.js','02-problem-source.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/'+file,import.meta.url),'utf8'),box);
 const source={id:'selected',owner:'唐琪',type:'日报',date:'2026-10-21',capturedDate:'2026-10-23',objectKey:'spu|one',content:'核对进度：样品标准仍待确认；后续另有工作安排。'};
 const row={kind:'core',causalProblem:'检测口径未定，采购虽已收样仍无法送检，准入评审可能延后。',object:{key:'spu|one'},sources:[{id:'first',content:'这条不是判断的核心依据'},source],problemSource:{sourceId:'selected',quote:'样品标准仍待确认'},task:{descriptionVersion:3}};
 const before=JSON.stringify(row),note=box.gdProblemSource(row);
 assert.equal(note.attribution,'唐琪10/21日报反映');assert.equal(note.sourceId,'selected');assert.equal(JSON.stringify(row),before,'归因展示不改写任务或来源');
 assert.equal(box.gdProblemText(row),'唐琪10/21日报反映，检测口径未定，采购虽已收样仍无法送检，准入评审可能延后。');assert(!box.gdProblemText(row).includes(row.problemSource.quote),'展示归纳后的原因与影响，不拼接引用原文');
 assert.equal(box.gdProblemSource({...row,problemSource:{...row.problemSource,sourceId:'missing'}}),null,'不借用首条来源');
 assert.equal(box.gdProblemSource({...row,problemSource:{...row.problemSource,quote:'无法在原文找到的推断'}}),null,'不把推断伪装为来源原文');
 assert.equal(box.gdProblemSource({...row,object:{key:'spu|other'}}),null,'不跨业务对象错引');
 assert.equal(box.gdProblemSource({...row,task:{descriptionVersion:2}}),null,'人工改写问题不自动沿用旧归因');
 assert.equal(box.gdProblemText({...row,task:{descriptionVersion:2}}),box.gdReadableText(row.causalProblem),'人工描述不追加旧来源');
 const markup=box.gdProblemMarkup({...row,sources:[{...source,owner:'<唐琪>'}]});assert(markup.includes('&lt;唐琪&gt;'));assert(!markup.includes('<唐琪>'));assert.equal((markup.match(/<div/g)||[]).length,1);assert.doesNotMatch(markup,/<p|<br|gd-problem-source\"/,'同一段摘要，不再额外分行展示原文');
}
