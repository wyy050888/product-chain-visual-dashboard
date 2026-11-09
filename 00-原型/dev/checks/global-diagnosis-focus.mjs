import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function verifyFocusRules(){
 const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/02-focus-model.js',import.meta.url),'utf8'),sandbox);
 const expected={id:'case',owner:'甲',department:'产品中心',role:'重点A验收',mode:'direction',topic:'A',start:'2026-10-08',meeting:{owner:'甲',date:'2026-10-07',decision:'甲负责重点A验收'},risk:{active:true}},range={start:'2026-10-08',end:'2026-10-10'};
 const record=(owner,date,topics)=>({id:owner+date,date,owner,topics,submitted:date+'T18:00',progress:topics.join('、')});
 const data={expectations:[expected],coverage:[{owner:'甲',start:'2026-10-07',end:'2026-10-10',complete:true}],logs:[record('甲','2026-10-08',['B']),record('乙','2026-10-08',['A']),record('丙','2026-10-09',['A'])]};
 const run=change=>{const d=structuredClone(data);change?.(d);return sandbox.gdAnalyzeFocus(d,range)};
 assert.equal(run().length,1);
 assert.equal(run(d=>d.expectations[0].approvedSpecialty=true).length,0,'批准专项不因同事方向不同而报警');
 assert.equal(run(d=>d.expectations[0].role='').length,0,'没有明确职责不按人数判定');
 assert.equal(run(d=>d.expectations[0].meeting.owner='乙').length,0,'不能把他人的会议分工归给本人');
 assert.equal(run(d=>d.coverage[0].complete=false).length,0,'抓取不完整不判断未响应');
 assert.equal(run(d=>d.logs=d.logs.filter(l=>l.owner!=='甲')).length,0,'本人没有材料不等于未工作');
 assert.equal(run(d=>d.logs.push(record('甲','2026-10-09',['A']))).length,0,'材料已有重点动作不报警');
 assert.equal(run(d=>d.expectations[0].meeting.date='2026-10-11').length,0,'未来会议不能用作本期依据');
 assert.equal(run(d=>{d.expectations[0].mode='risk';d.expectations[0].risk.active=false}).length,0,'风险解除不产生风险响应异常');
 assert.equal(run(d=>{d.expectations[0].mode='risk';d.expectations[0].risk.range={end:'2026-10-01'}}).length,0,'过期风险快照不当作本期风险');
 assert.equal(run(d=>d.expectations[0].mode='interruption').length,0,'没有前期推进记录不判断推进中断');
 assert.equal(run(d=>{d.expectations[0].mode='interruption';d.logs.push(record('甲','2026-10-07',['A']))}).length,1);
 assert.equal(run(d=>{d.expectations[0].mode='interruption';d.logs.push(record('甲','2026-10-07',['A']),record('甲','2026-10-09',['A']))}).length,0,'后续已恢复推进不报警');
 assert.equal(sandbox.gdAnalyzeFocus(data,{start:'2026-10-01',end:'2026-10-06'}).length,0);
}

export async function globalDiagnosisFocus(page){
 verifyFocusRules();verifyReasonFacts();verifyReportIdentity();const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="focus"]').click();const d=await audit();
 assert.deepEqual(d.focus.map(r=>r.issueType),['focus-direction','focus-risk-response','focus-interruption']);assert(!d.focus.some(r=>r.owner==='王磊'));
 assert(d.focus.every(r=>r.status==='待处理'&&r.problemType==='待确认'&&r.focusEvidence.logs.every(l=>l.submitted&&!l.missing)));
 for(const row of d.focus){
  const group=root.locator('[data-gd-row="'+row.id+'"]');assert((await group.innerText()).includes(row.participants[0].assignee));assert((await group.innerText()).includes(row.participants[0].action));
  assert.equal(await group.locator('[data-gd-action="task-detail"]').count(),1);
  assert.equal(await group.locator('.gd-reason-basis').count(),0);await group.locator('[data-gd-action="task-detail"]').click();const detail=page.locator('.up-todo-dialog[open]');assert(await detail.locator('[data-todo-evidence-panel]').isHidden());await detail.locator('[data-todo-evidence]').click();const evidence=detail.locator('[data-todo-evidence-panel]');assert.equal(await evidence.locator('[data-gd-reason]').getAttribute('data-gd-reason'),row.issueType);
  assert((await evidence.locator('.gd-reason-basis').innerText()).includes(row.focusEvidence.meeting.owner),'原因依据指向原会议分工人');
  assert((await evidence.locator('.gd-reason-basis').innerText()).includes('日志'));
  assert((await evidence.locator('.gd-reason-basis').innerText()).includes('核实'));assert.doesNotMatch(await group.innerText(),/已认定失职|undefined|NaN/);await detail.locator('[data-todo-close]').click();
 }
 await root.locator('[data-gd-search]').fill('常规来料抽检');assert.equal((await audit()).visible.length,1);assert.equal((await audit()).visible[0].id,'focus-risk-product');
 assert.equal(d.counts.find(c=>c.key==='execution').stats[1][1],3);
 await resetDiagnosisFilters(root);
 assert.deepEqual((await root.locator('[data-label="问题描述"]').allTextContents()).sort(),['重点动作未见记录','风险复核未见记录','后续推进未见记录'].sort());
 assert.equal(await root.locator('[data-gd-reason-filter]:not([data-gd-reason-filter="all"])').count(),3);
 assert.equal(await root.locator('[data-gd-execution-context]>p').count(),0);assert.doesNotMatch(await root.locator('[data-gd-execution-context]').innerText(),/触发原因|对照会议分工/);
 await root.locator('[data-gd-tab="reports"]').click();const logs=(await audit()).visible;
 assert.equal(await root.locator('[data-gd-execution-context]>p').count(),0);assert.doesNotMatch(await root.locator('[data-gd-execution-context]').innerText(),/触发原因|核对日志是否抓取到/);assert(await root.locator('.gd-reason-summary-item').count()>0,'保留日志原因及数量');
 for(const row of logs.slice(0,8)){
  assert.deepEqual(row.businessObjects,[{type:'report',id:row.id+'|'+row.date,name:row.logOwner+' · '+row.type+' · '+row.date}],'日志对象按提交人、类型和日期展示');
  assert.deepEqual(row.task.businessObjects,row.businessObjects,'原待办同步日志身份');assert(row.task.spuId.startsWith('GLOBAL|report|'),'日志待办不混入产品待办');
  const objectCell=root.locator('[data-gd-row="'+row.id+'"] [data-label="业务对象"]'),displayName=row.businessObjects[0].name.replace(row.date,row.date.slice(2).replaceAll('-','/'));assert((await objectCell.innerText()).includes(displayName));assert.equal(await objectCell.locator('.gd-business-type').innerText(),'日志');
  const cell=root.locator('[data-gd-row="'+row.id+'"] [data-label="问题描述"]');
  assert(await cell.locator('.gd-problem').count()>0,'每条日志直接显示触发原因');await root.locator('[data-gd-row="'+row.id+'"] [data-gd-action="task-detail"]').click();const detail=page.locator('.up-todo-dialog[open]');await detail.locator('[data-todo-evidence]').click();assert((await detail.locator('[data-todo-evidence-panel]').innerText()).includes(row.logOwner),'日志依据保持原提交人');if(row.missing)assert((await detail.locator('[data-todo-evidence-panel]').innerText()).includes('尚未同步'));await detail.locator('[data-todo-close]').click();
  if(row.incomplete&&!row.next)assert((await cell.innerText()).includes('下一步安排未填写'));
 }
 for(const width of [1920,1024,390]){await page.setViewportSize({width,height:900});assert(await root.locator('.gd-execution-context').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'原因汇总不溢出 '+width)}
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：日志具体缺失项/晚交、工作聚焦原因及证据、原提交人、只读和窄屏');
}

function verifyReportIdentity(){
 const sandbox={upSpus:new Map([['SPU-A',{spuId:'SPU-A',name:'日志提到的产品'}]])};vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/shared-classification/02-diagnosis-catalog.js',import.meta.url),'utf8'),sandbox);
 for(const file of ['02-action-model.js','03-tasks.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/'+file,import.meta.url),'utf8'),sandbox);
 const row={id:'sample-log',kind:'report',owner:'办理人',logOwner:'原提交人',type:'日报',date:'2026-10-20',spuId:'SPU-A',projectId:1};
 const task={id:'original-task',spuId:'SPU-A',objectName:'日志提到的产品',businessObjects:[{type:'product',id:'SPU-A',name:'日志提到的产品'}],due:'2027-01-03',status:'done',evidence:'已补交',completedAt:'2026-10-21T08:00:00Z'};
 const objects=sandbox.gdBusinessObjects(row,task);assert.equal(objects[0].type,'report');assert.equal(objects[0].name,'原提交人 · 日报 · 2026-10-20');
 assert.equal(sandbox.gdTaskKey(row),sandbox.gdTaskKey({...row,owner:'新办理人'}),'改派办理人不改变原日志身份');
 const normalized=sandbox.gdNormalizeReportTask(task,row);for(const key of ['id','due','status','evidence','completedAt'])assert.equal(normalized[key],task[key]);
 assert.equal(normalized.objectName,objects[0].name);assert.equal(normalized.spuId,'GLOBAL|'+sandbox.gdTaskKey(row));assert.equal(sandbox.gdNormalizeReportTask(normalized,row),normalized,'同一日志无需反复保存');
 assert.equal(sandbox.gdBusinessObjects({...row,kind:'focus'},task)[0].type,'product','工作聚焦仍保留产品对象');
}

function verifyReasonFacts(){
 const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/00-issue-types.js',import.meta.url),'utf8'),sandbox);
 const row={kind:'report',owner:'办理人',logOwner:'原提交人',type:'日报',date:'2026-10-20',deadline:'2026-10-21T09:00:00+08:00',capturedAt:'2026-10-21T10:30:00+08:00',submitted:'2026-10-21T09:05:00+08:00',progress:'',reportProblem:'已填写问题',next:'已填写下一步',incomplete:true};
 let reasons=sandbox.gdDiagnosisReasons(row);assert.deepEqual(Array.from(reasons,r=>r.label),['工作进展未填写'],'不将任意字段缺失笼统写成下一步缺失');assert(reasons[0].basis.includes('原提交人'));assert(!reasons[0].basis.includes('办理人'));
 reasons=sandbox.gdDiagnosisReasons({...row,late:true});assert.deepEqual(Array.from(reasons,r=>r.label),['工作进展未填写','日志晚交'],'内容与时效原因可同时保留');assert(reasons[1].basis.includes('09:00')&&reasons[1].basis.includes('09:05'));
 reasons=sandbox.gdDiagnosisReasons({...row,missing:true});assert.equal(reasons.length,1);assert.equal(reasons[0].key,'log-missing');assert(reasons[0].basis.includes('尚未同步'));
 assert.equal(sandbox.gdDiagnosisReasons({...row,incomplete:false}).length,0);
}
