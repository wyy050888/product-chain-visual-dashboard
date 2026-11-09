import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

export async function diagnosisListedDate(page){
 const text=value=>String(value??'—');
 const box=vm.createContext({esc:text,upTodoDate:text,gdCellPreview:text,gdAnalysisObject:row=>row.objectName,gdFollowDate:(row,key)=>key==='firstAt'?row.date:row.updatedAt,gdFollowStatusMarkup:()=>'',gdParticipantAdvice:()=>'',gdProblemMarkup:row=>row.problem,gdProseMarkup:text,gdPersonMarkup:text,gdButton:()=>'',gdAnalysisTable:(headers,markup)=>({headers:Array.from(headers,h=>typeof h==='string'?h:h.label),markup})});
 vm.runInContext(readFileSync(new URL('../../src/modules/project-panorama/13-risk-detail-view.js',import.meta.url),'utf8'),box);
 vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/04-key-work-table.js',import.meta.url),'utf8'),box);
 const row={workKey:'repeat-risk',keyType:'high-risk',riskBoardName:'呆滞预警榜（实时）',objectName:'测试产品',problem:'再次上榜',participants:[{action:'核对处置',assignee:'负责人'}],date:'2026-10-28',updatedAt:'2026-10-30',firstSeenAt:'2026-09-01',due:'2026-11-05'};
 const listed=box.gdKeyWorkTable([row],'high-risk');
 assert.deepEqual(Array.from(listed.headers),['诊断日期','更新日期','业务对象','风险榜单','问题描述','行动建议','建议负责人','跟进状态','操作']);
 assert(listed.markup.includes('<td data-label="诊断日期">2026-10-28</td>'));
 assert(listed.markup.includes('<td data-label="风险榜单">呆滞预警榜（实时）</td>'));
 assert(!listed.markup.includes('2026-09-01'),'再次上榜不显示最早入榜日');
 assert(!listed.markup.includes('2026-11-05'),'新增高危不使用任务计划日期');
 const project=box.gdKeyWorkTable([{...row,keyType:'project',projectLight:'高危红灯'}],'project');
 assert(project.headers.includes('建议整改期限'));assert(!project.headers.includes('上榜日期'));
 assert(project.headers.includes('项目红绿灯'));assert(!project.headers.includes('优先级'));
 for(const light of ['红灯','黄灯','绿灯','高危红灯'])assert(box.gdKeyWorkFactMarkup({keyType:'project',projectLight:light}).includes('data-light="'+light+'"'));
 assert(project.markup.includes('<td data-label="建议整改期限">2026-11-05</td>'));
 const root=page.locator('#ai');
 await root.locator('[data-gd-part="coordination"]').click();
 await root.locator('[data-gd-tab="high-risk"]').click();
 assert.equal(await root.locator('.key-work thead th').filter({hasText:'风险榜单'}).count(),1);
 assert.equal(await root.locator('.key-work thead th').filter({hasText:'优先级'}).count(),0);
 assert.equal(await root.locator('[data-gd-filter="priority"]').count(),0);
 assert.equal(await root.locator('.key-work thead th').filter({hasText:'建议整改期限'}).count(),0);
 await root.locator('[data-gd-tab="project"]').click();
 assert.equal(await root.locator('.key-work thead th').filter({hasText:'上榜日期'}).count(),0);
 assert.equal(await root.locator('.key-work thead th').filter({hasText:'建议整改期限'}).count(),1);
 assert.equal(await root.locator('.key-work thead th').filter({hasText:'项目红绿灯'}).count(),1);
 assert.equal(await root.locator('[data-gd-key-work] [data-label="项目红绿灯"] [data-light]').count(),await root.locator('[data-gd-key-work]').count());
}

export async function diagnosisRiskDateSort(page){
 await page.clock.setFixedTime(new Date('2026-11-06T02:30:00Z'));await page.reload({waitUntil:'domcontentloaded'});await page.locator('a[href="#ai"]').click();
 const root=page.locator('#ai');
 await root.locator('[data-gd-part="coordination"]').click();
 await root.locator('[data-gd-tab="high-risk"]').click();
 const samples=await page.evaluate(()=>globalDiagnosisAudit().work.filter(row=>row.keyType==='high-risk'&&row.sample).map(row=>({id:row.workKey,date:row.date,previous:row.previousAppearedAt})));
 assert(samples.length>=4,'新增高危至少展示4条演示记录');
 assert(new Set(samples.map(row=>row.date)).size>=4,'样例覆盖不同上榜日期');
 assert(samples.some(row=>row.previous),'包含间隔后再次上榜样例');
 for(const row of samples)if(row.previous)assert((Date.parse(row.date)-Date.parse(row.previous))/86400000>=15);
 const dateHeader=root.locator('[data-gd-header-sort="listedAt"]');
 const dates=()=>root.locator('[data-gd-key-work] [data-label="诊断日期"]').allTextContents();
 function ordered(values,direction){assert(values.length>0);const sorted=[...values].sort();if(direction==='desc')sorted.reverse();assert.deepEqual(values,sorted);}
 assert.equal(await dateHeader.getAttribute('data-direction'),'desc');ordered(await dates(),'desc');
 await dateHeader.click();assert.equal(await dateHeader.getAttribute('data-direction'),'asc');ordered(await dates(),'asc');
 await root.locator('[data-gd-tab="project"]').click();
 assert.equal(await root.locator('[data-gd-header-sort="priority"]').count(),0,'项目卡点没有优先级排序');
 await root.locator('[data-gd-tab="high-risk"]').click();
 assert.equal(await dateHeader.getAttribute('data-direction'),'asc','切换Tab保留手选排序');ordered(await dates(),'asc');
 await dateHeader.click();ordered(await dates(),'desc');
 await root.locator('[data-gd-key-work] [data-gd-action="analysis"]').first().click();
 assert((await page.locator('#dialogbody').innerText()).includes('演示样例'),'模拟入榜历史在依据中标明');
 await page.locator('#close').click();
 await page.reload();
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="high-risk"]').click();
 assert.equal(await dateHeader.getAttribute('data-direction'),'desc');ordered(await dates(),'desc');
 const reloaded=await page.evaluate(()=>globalDiagnosisAudit().work.filter(row=>row.keyType==='high-risk'&&row.sample).map(row=>({id:row.workKey,date:row.date})).sort((a,b)=>a.id.localeCompare(b.id)));
 assert.deepEqual(reloaded,samples.map(({id,date})=>({id,date})).sort((a,b)=>a.id.localeCompare(b.id)),'刷新不改变样例日期或重复添加');
}

export async function diagnosisProjectDeadline(page){
 const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
 const project={id:7,name:'测试项目',projectState:'进行中',status:'红灯',owner:'项目负责人',dept:'项目部',ledger:[],stageData:[{id:'stage-1',name:'验证',light:'红灯',tasks:[{id:'task-1',name:'复测',light:'红灯',done:false,end:'2026-09-01',owner:'任务负责人',dept:'品质部'}]}]};
 const load=date=>{
  const box=vm.createContext({DATA_CUTOFF:date,localStorage:storage,projectDispatches:{},withPeriod:(_,fn)=>fn(),diagnosisNormalizeSource:value=>value,shiftDate:(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10)});
  vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/03-project-key-work.js',import.meta.url),'utf8'),box);return box;
 };
 const box=load('2026-10-31'),context={by:()=>({rows:[project]})};
 assert.equal(box.gdProjectRectificationDue('2026-10-31'),'2026-11-03');
 assert.equal(box.gdProjectRectificationDue('2026-12-30'),'2027-01-02','跨年按自然日');
 assert.equal(box.gdProjectRectificationDue('2024-02-27'),'2024-03-01','闰年按自然日');
 const first=box.gdProjectKeyWork(context)[0];
 assert.equal(first.discoveredAt,'2026-10-31');assert.equal(first.due,'2026-11-03');
 assert.notEqual(first.due,project.stageData[0].tasks[0].end,'不取源任务计划完成日期');
 box.DATA_CUTOFF='2026-11-01';assert.equal(box.gdProjectKeyWork(context)[0].due,first.due,'重复分析不顺延');
 const reloaded=load('2026-11-02').gdProjectKeyWork(context)[0];assert.equal(reloaded.discoveredAt,first.discoveredAt);assert.equal(reloaded.due,first.due,'刷新后保留发现日');
 project.stageData[0].tasks[0].id='task-2';assert.equal(box.gdProjectKeyWork(context)[0].discoveredAt,'2026-11-01','不同任务独立记录发现日');
 const root=page.locator('#ai');
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="project"]').click();
 const rows=await page.evaluate(()=>globalDiagnosisAudit().work.filter(row=>row.keyType==='project').map(row=>({date:row.discoveredAt,due:row.due})));
 assert(rows.length>0,'项目卡点有数据');
 for(const row of rows){const expected=new Date(Date.parse(row.date+'T00:00:00Z')+3*86400000).toISOString().slice(0,10);assert.equal(row.due,expected);}
 assert.equal(await root.locator('th').filter({hasText:'建议整改期限'}).count(),1);
 await root.locator('[data-gd-key-work] [data-gd-action="analysis"]').first().click();
 assert((await page.locator('#dialogbody').innerText()).includes('建议整改期限'),'依据使用相同字段名');
 await page.locator('#close').click();
}
