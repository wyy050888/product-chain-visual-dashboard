import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

export function verifyTodoBasisModel(){
 const task={id:'basis-task',gdIssue:'coordinate-project',gdProblem:'采购与品质需要确认统一排期',description:'保存的原始内容'},project={id:'coordinate-project',kind:'block',task};
 const data={reports:[],focus:[],coordination:[project],resource:[],meetings:[]},esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 let builds=0;const box={gdRenderedData:data,gdDataset:()=>{builds++;return data},gdProposal:r=>r.task,gdDiagnosisReasons:()=>[],gdActionRecipe:()=>({problem:'需确认'}),DATA_CUTOFF:'2026-10-22',shiftDate:(value,days)=>{const date=new Date(value+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10)},esc};vm.createContext(box);
 for(const file of ['02-decision-samples.js','02-meeting-sources.js','05-todo-basis.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/'+file,import.meta.url),'utf8'),box);
 const html=box.gdTodoBasisMarkup({id:'resource-test',kind:'conflict',task},task);assert(html.includes('产品链协同会议纪要.xlsx'));assert(html.includes('第8行'));assert(html.includes('样机交付与检测验证窗口需要统一'));assert(!html.includes('第9行'));assert.equal(builds,0,'依据沿用当前快照，不重算业务数据');
 assert.equal(box.gdTodoBasisMarkup({id:'closure',kind:'task',task},task),html,'共享待办从不同入口显示同一原始来源');
 const unlocated={...task,gdIssue:''};assert(box.gdTodoBasisMarkup({...project,task:unlocated},unlocated).includes('未保存具体来源定位'),'没有原事项定位时不把入口的会议当成原判定来源');
 const historical={...task,id:'old-task',description:'仅保存的历史内容'};const fallback=box.gdTodoBasisMarkup({kind:'task',task:historical},historical);assert(fallback.includes('未保存具体来源定位'));assert(fallback.includes('仅保存的历史内容'));assert(!fallback.includes('第8行'),'编号不同不能借用当前任务的会议材料');
 const missing=box.gdTodoLogBasis({missing:true,owner:'日志提交人',type:'日报',date:'2026-10-21',deadline:'2026-10-22T09:00:00Z',capturedAt:'2026-10-22T10:30:00Z'});assert(missing.source.includes('抓取记录'));assert(missing.content.includes('未匹配到'));assert(!missing.content.includes('工作进展：'),'缺失日志不生成正文');
 const unsafe=box.gdTodoMeetingBasis({file:'<img src=x>',sheet:'<b>页签</b>',row:4,date:'2026-10-22',discussion:'<script>内容</script>'});assert(unsafe.source.includes('<img'));const badTask={...task,gdIssue:'unknown',description:'<img src=x>'};assert(!box.gdTodoBasisMarkup({kind:'task',task:badTask},badTask).includes('<img'),'所有原始来源和内容转义显示');
 assert(!/诊断依据|下发依据/.test(html),'不再叠加两份问题摘要');
 const meeting=box.gdMeetingReference('coordinate-project'),sources=box.gdTodoBasisSources({focusEvidence:{meeting,logs:[{owner:'甲',type:'日报',date:'2026-10-20',logId:'log-a',progress:'甲的原文'},{owner:'乙',type:'周报',date:'2026-10-21',logId:'log-b',progress:'乙的原文'}]}},task);
 assert.equal(sources.length,3,'会议与不同日志分别形成一条来源记录');assert.equal(sources[0].source.split('\n').length,4,'来源类型、文档、页签行号、日期分行');assert(sources[1].source.includes('log-a')&&sources[1].content.includes('甲的原文'));assert(!sources[1].content.includes('乙的原文'));assert(sources[2].source.includes('log-b')&&sources[2].content.includes('乙的原文'));
}

export async function verifyTodoBasis(page){
 verifyTodoBasisModel();
 const root=page.locator('#ai'),dialog=page.locator('.up-todo-dialog[open]'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 await root.locator('[data-gd-part="coordination"]').click();await resetDiagnosisFilters(root);
 const row=(await audit()).coordination.find(r=>r.id==='coordinate-project'),read=()=>page.evaluate(id=>JSON.stringify(JSON.parse(localStorage.getItem('product-risk-todos-v1'))[id]),row.task.id),before=await read();
 await root.locator('[data-gd-row="coordinate-project"] [data-gd-action="task-detail"]').first().click();await dialog.locator('[data-todo-evidence]').click();
 const evidence=dialog.locator('[data-todo-evidence-panel]'),source=await evidence.locator('[data-todo-basis-location]').allTextContents(),content=await evidence.locator('[data-todo-basis-content]').allTextContents();
 assert.deepEqual(await evidence.locator('.gd-todo-basis-table th').allTextContents(),['来源','内容']);assert.equal(await evidence.locator('.gd-todo-basis-table tbody tr').count(),source.length,'每条来源与内容对应同一行');
 assert.equal(source[0].split('\n').length,4,'来源单元格按定位信息分行');assert.equal(await evidence.locator('[data-todo-basis-location]').first().evaluate(e=>getComputedStyle(e).whiteSpace),'pre-line');
 assert(source.join('\n').includes('产品链协同会议纪要.xlsx'));assert(source.join('\n').includes('10月协同会'));assert(source.join('\n').includes('第8行'));assert(content.join('\n').includes('采购和品质分别反馈可用排期'));assert(content.join('\n').includes('项目部汇总排期'));assert.equal(await evidence.locator('[data-todo-basis-reason] h5').innerText(),'AI判定');assert(!/诊断依据|下发依据/.test(await evidence.innerText()));
 await dialog.screenshot({path:fileURLToPath(new URL('../../outputs/todo-ai-basis.png',import.meta.url))});await dialog.locator('[data-todo-close]').click();
 await root.locator('[data-gd-part="resource"]').click();await resetDiagnosisFilters(root);await root.locator('[data-gd-row="resource-test"] [data-gd-action="task-detail"]').first().click();await dialog.locator('[data-todo-evidence]').click();
 assert.deepEqual(await evidence.locator('[data-todo-basis-location]').allTextContents(),source);assert.deepEqual(await evidence.locator('[data-todo-basis-content]').allTextContents(),content);await dialog.locator('[data-todo-close]').click();assert.equal(await read(),before,'查看依据不改原待办、反馈及下发记录');
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="focus"]').click();await resetDiagnosisFilters(root);
 const focus=(await audit()).focus.find(item=>item.focusEvidence?.logs.length);assert(focus,'使用真实的多来源聚焦样例');
 await root.locator('[data-gd-row="'+focus.id+'"] [data-gd-action="task-detail"]').click();await dialog.locator('[data-todo-evidence]').click();
 const records=evidence.locator('[data-todo-basis-source]'),facts=focus.focusEvidence;
 assert.equal(await records.count(),1+facts.logs.length+Number(Boolean(facts.coverage))+Number(Boolean(facts.risk?.active)),'多个来源各占一行，不合并到一个单元格');
 for(const [index,log] of facts.logs.entries()){const record=records.nth(index+1);assert((await record.locator('[data-todo-basis-location]').innerText()).includes(log.logId));assert((await record.locator('[data-todo-basis-content]').innerText()).includes(log.progress||'未填写'))}
 for(const width of [1920,390]){await page.setViewportSize({width,height:1100});assert(await evidence.locator('.gd-todo-basis-table-wrap').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await evidence.screenshot({path:fileURLToPath(new URL('../../outputs/todo-basis-sources-'+width+'.png',import.meta.url))})}
 await dialog.locator('[data-todo-close]').click();await page.setViewportSize({width:1920,height:1080});
 console.log('通过：来源定位/原文/AI判定、共享任务一致、历史缺失不借用来源、缺失日志不补造正文及只读');
}
