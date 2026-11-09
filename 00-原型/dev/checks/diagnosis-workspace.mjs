import assert from 'node:assert/strict';
import {assertPreviewButtonClear} from './preview-geometry.mjs';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

export function verifyExecutionIdentity(){
 const box=vm.createContext({upTodos:{}});
 vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/03-key-work.js',import.meta.url),'utf8'),box);
 const row={workKey:'project-risk|7|r1',projectId:7,riskId:'r1',workTaskId:'task-r1',keyType:'project'};
 assert.equal(box.gdHasExecution(row,[]),false);
 assert.equal(box.gdHasExecution({...row,executionOrderId:'EXEC-1'},[]),true);
 assert.equal(box.gdHasExecution(row,[{id:'other',status:'working',gdProjectId:8,gdRiskId:'r1'}]),false,'相同风险编号但项目不同不混用');
 assert.equal(box.gdHasExecution(row,[{id:'other',status:'working',gdProjectId:7,gdRiskId:'r2'}]),false,'同项目不同风险不混用');
 for(const status of ['pending','working','done'])assert.equal(box.gdHasExecution(row,[{id:'assigned',status,gdWorkKey:row.workKey}]),true);
 assert.equal(box.gdHasExecution(row,[{id:'assigned',status:'suggested',gdWorkKey:row.workKey}]),false);
 assert.equal(box.gdHasExecution(row,[{id:'task-r1',status:'pending',deletedAt:'2026-10-24'}]),true,'已删除建议不自动重开');
 const taskRow={...row,projectTaskId:'s1-t1'};
 assert.equal(box.gdHasExecution(taskRow,[{id:'assigned',status:'working',gdProjectId:7,gdProjectTaskId:'s1-t1'}]),true);
 assert.equal(box.gdHasExecution(taskRow,[{id:'assigned',status:'working',gdProjectId:7,gdSource:'projects',gdIssue:'work-core-delivery'}]),false,'同项目其它处理事项不能覆盖本任务');
 const activeRisk={keyType:'high-risk',riskIdentity:'3|sku1|all',eventKey:'risk-alert|3|sku1|all|2026-10-16',workKey:'risk-alert|3|sku1|all|2026-10-16'};
 assert.equal(box.gdHasExecution(activeRisk,[{id:'old-window',status:'working',gdEventKey:'risk-alert|3|sku1|all|2026-10-01'}]),true,'在办执行单跨15天窗口继续匹配');
 assert.equal(box.gdHasExecution(activeRisk,[{id:'old-window',status:'done',gdEventKey:'risk-alert|3|sku1|all|2026-10-01'}]),false,'旧窗口已结束时仍按当前风险重新判断');
 assert.equal(box.gdHasExecution(activeRisk,[{id:'other-platform',status:'working',gdEventKey:'risk-alert|3|sku1|抖音|2026-10-01'}]),false);
 const high={eventKey:'safety|spu-1|event-1',workKey:'safety|spu-1|event-1'};
 assert.equal(box.gdHasExecution(high,[{id:'existing',status:'working',gdEventKey:high.eventKey}]),true);
 assert.equal(box.gdHasExecution({...high,eventKey:'safety|spu-1|event-2',workKey:'safety|spu-1|event-2'},[{id:'existing',status:'done',gdEventKey:high.eventKey}]),false,'新事件不被历史事件吞掉');
}
export function verifyRiskTaskIndependence(){
 const cutoff='2026-10-26',risk={keyType:'high-risk',workKey:'risk-alert|3|sku1|all|'+cutoff,eventKey:'risk-alert|3|sku1|all|'+cutoff,date:cutoff,title:'新增高危',object:{name:'SKU1'}},project={keyType:'project',workKey:'project-risk|7|r1',date:cutoff,title:'项目卡点',object:{name:'项目1'}};
 const box=vm.createContext({DATA_CUTOFF:cutoff,upTodos:{},gdNewRiskKeyWork:()=>[risk],gdProjectKeyWork:()=>[project],gdProposal:()=>({status:'suggested'}),gdPresentAction:row=>row,aiToday:()=>cutoff});
 vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/03-key-work.js',import.meta.url),'utf8'),box);
 for(const status of ['pending','working','done']){
  box.upTodos={risk:{status,gdWorkKey:risk.workKey,gdEventKey:risk.eventKey},project:{status,gdWorkKey:project.workKey}};
  assert.equal(box.gdHasExecution(risk),true,'能识别已有执行单');
  const rows=box.gdBuildKeyWork({}, {}, [],{start:'2026-10-01',end:cutoff});assert.deepEqual(Array.from(rows,row=>row.keyType),['high-risk'],'存在待处理/在办/已完成任务均不排除新增高危，项目卡点仍排除');
 }
 box.upTodos={};assert.equal(box.gdBuildKeyWork({}, {}, [],{start:'2026-10-01',end:cutoff}).length,2);
}
export function verifyProjectTaskGaps(){
 const box=vm.createContext({});
 vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/03-project-key-work.js',import.meta.url),'utf8'),box);
 const responsible=box.gdProjectTaskOwner({owner:'秦鼎',dept:'项目部'},{owner:'潘东跃',dept:'产品部'});assert.equal(responsible.assignee,'潘东跃');assert.equal(responsible.department,'产品中心');
 const fallback=box.gdProjectTaskOwner({owner:'秦鼎',dept:'项目部'},{owner:''});assert.equal(fallback.assignee,'秦鼎');assert.equal(fallback.department,'项目部');
 const task={id:'s1-t1',name:'样机验证',light:'红灯',done:false,delay:8},stage={id:'s1',name:'验证阶段',light:'红灯',tasks:[task]};
 const project={id:7,projectState:'进行中',status:'红灯',ledger:[]};
 const gaps=(p=project,stages=[stage],orders=[])=>box.gdProjectTaskGaps(p,stages,orders);
 assert.equal(gaps().length,1,'三级均红且两类关联均缺失才进入');
 const noIds={...stage,id:undefined,tasks:[{...task,id:'t1'}]};
 assert.equal(gaps(project,[{name:'其它阶段',light:'绿灯',tasks:[]},noIds])[0].stageId,1,'阶段身份不随其它阶段的灯色筛选发生漂移');
 for(const status of ['绿灯','黄灯',null])assert.equal(gaps({...project,status}).length,0,'人工修正后的项目灯色优先于任务延期红灯');
 for(const light of ['绿灯','黄灯',null])assert.equal(gaps(project,[{...stage,light}]).length,0,'阶段修正后，即使项目因其它阶段为红、该任务仍延期红，也不进入');
 assert.equal(gaps(project,[{...stage,tasks:[{...task,light:'黄灯'}]}]).length,0);
 assert.equal(gaps({...project,projectState:'已完成'}).length,0);
 assert.equal(gaps(project,[{...stage,tasks:[{...task,done:true}]}]).length,0);
 assert.equal(gaps({...project,ledger:[{taskIds:[task.id],action:'已有方案'}]}).length,0,'已关联风险台账排除，不推断没有处理方案');
 assert.equal(gaps({...project,ledger:[{taskId:'other',taskNames:[task.name]}]}).length,1,'明确ID优先，不把同名的其它任务风险当成本任务');
 assert.equal(gaps({...project,ledger:[{stage:['验证阶段'],taskNames:[task.name]}]}).length,0,'兼容旧台账阶段和任务名称关联');
 assert.equal(gaps({...project,ledger:[{stage:['其它阶段'],taskNames:[task.name]}]}).length,1);
 assert.equal(gaps(project,[stage],[{projectId:7,taskId:task.id}]).length,0,'有本任务执行单排除');
 assert.equal(gaps(project,[stage],[{projectId:8,taskId:task.id},{projectId:7,taskId:'other'}]).length,1,'其它项目或其它任务执行单不互相排除');
 assert.equal(gaps(project,[{...stage,tasks:[{...task,executionOrderId:'exec-1'}]}]).length,0);
 assert.equal(gaps(project,[{...stage,tasks:[{...task,riskId:'risk-1'}]}]).length,0);
}
export function verifyRiskChanges(){
 const saved=new Map([['dashboard.gd-risk-appearances.v1',JSON.stringify({'3|sku1|all':['2026-10-15']})]]),writes=[];
 const load=()=>{
  const box=vm.createContext({window:{},DATA_CUTOFF:'2026-10-26',qrPlatforms:['抖音','快手','视频号','天猫','京东','拼多多'],boundedCache:()=>new Map(),localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>{saved.set(key,value);writes.push(key)}},uiPeriodValidDate:value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value});
  for(const name of ['risk-presentation/02-appearance-history.js','global-diagnosis/03-risk-alerts.js'])vm.runInContext(readFileSync(new URL('../../src/modules/'+name,import.meta.url),'utf8'),box);
  return box;
 };
 const box=load(),history={kind:3,objectId:'sku1',platform:'all',appearances:['2026-10-01']},current={severity:2};
 const coverage=date=>Array.from({length:14},(_,i)=>new Date(Date.parse(date+'T00:00:00Z')-(i+1)*86400000).toISOString().slice(0,10));
 const event=(date,c=current,h=history,dates=[...h.appearances,date])=>box.gdRiskReminder(h,c,date,dates,coverage(date));
 assert.equal(box.gdRiskReminder(history,current,'2026-10-16',['2026-10-01','2026-10-16'],[]),null,'缺少前14天快照，不能把没记录当作未入榜');
 assert.equal(event('2026-10-01').date,'2026-10-01');
 for(const date of ['2026-10-02','2026-10-15'])assert.equal(event(date),null,'近期在上方风险榜出现过，不重复新增');
 const next=event('2026-10-16');assert.equal(next.date,'2026-10-16');assert.equal(next.previousAppeared,'2026-10-01');assert.equal(next.type,'风险复核','间隔15个自然日可重判');
 for(const severity of [1,2,3])assert.equal(event('2026-10-15',{severity}),null,'灯色变化不绕过出现去重');
 assert.equal(event('2026-10-16',null),null,'解除的风险不展示');
 assert.equal(event('2026-10-16',current,{...history,handledAt:'2026-10-10'}).type,'风险复核','旧事件已处理不能永久屏蔽间隔后的新事件');
 assert.equal(event('2026-10-16',current,{...history,handledAt:'2026-10-16'}),null,'本次事件已处理时不重复提醒');
 assert.equal(event('2026-10-16',current,history,[]),null,'没有当日入榜出现记录不伪造首次');
 assert.equal(event('2026-10-16',current,history,['2026-10-20']),null,'不读取未来出现记录');
 assert.equal(event('2026-10-16',current,history,['2026-10-01']),null,'不把旧榜单记录改成当日出现');
 assert.equal(event('2026-10-16',current,{...history,appearances:['2026-10-01','2026-10-10']}),null,'使用上方最近一次出现，即使AI从未展示也抑制');
 const daily=Array.from({length:16},(_,i)=>'2026-10-'+String(i+1).padStart(2,'0'));
 assert.equal(event('2026-10-16',current,history,daily),null,'连续在上方入榜满16天不自动重复');
 assert.equal(event('2026-10-30',current,history,['2026-10-16','2026-10-30']),null);
 assert.equal(event('2026-10-31',current,history,['2026-10-16','2026-10-31']).date,'2026-10-31');
 for(const [first,day15,day16] of [['2026-01-25','2026-02-08','2026-02-09'],['2024-02-20','2024-03-05','2024-03-06'],['2025-12-25','2026-01-08','2026-01-09']]){
  const h={...history,objectId:first,appearances:[first]};assert.equal(event(day15,current,h),null);assert.equal(event(day16,current,h).previousAppeared,first,'跨月/闰年/跨年仍按自然日');
 }
 assert.equal(box.gdRiskHistoryKey(history),box.gdRiskHistoryKey({...history,id:'another-record'}));
 assert.notEqual(box.gdRiskHistoryKey(history),box.gdRiskHistoryKey({...history,platform:'抖音'}));assert.notEqual(box.gdRiskHistoryKey(history),box.gdRiskHistoryKey({...history,kind:4}));
 const records=[{key:'3|sku1|all'},{key:'3|CW-LJ-XHSYY-Q516-SKU01|all'},{key:'1|shop1|抖音'}];
 assert.equal(box.rpRecordWarningAppearances(records,'2026-10-25'),false,'历史查询不补造出现记录');
 assert.equal(box.rpRecordWarningAppearances(records,'2026-10-26'),true);
 assert.equal(box.rpRecordWarningAppearances(records,'2026-10-26'),false,'刷新不重复写同日出现');
 const stored=box.rpWarningHistory().find(row=>row.objectId==='sku1');assert.deepEqual(Array.from(stored.appearances),['2026-10-26'],'旧AI展示台账不能混入上方出现记录');
 assert.equal(stored.baseline,true);assert.equal(box.gdRiskReminder(stored,current,'2026-10-26'),null,'缺历史的首次采集作为基线，不谎称首次风险');
 assert(writes.every(key=>key==='dashboard.risk-board-appearances.v1'),'只由风险榜台账写入');
 assert.deepEqual(Array.from(load().rpWarningHistory().find(row=>row.objectId==='sku1').appearances),['2026-10-26'],'上方出现记录刷新后保持');
 saved.set('dashboard.risk-board-appearances.v1',JSON.stringify({records:{},observedDates:coverage('2026-10-26')}));
 const complete=load();complete.rpRecordWarningAppearances([{key:'3|new-sku|all'}],'2026-10-26');
 const fresh=complete.rpWarningHistory().find(row=>row.objectId==='new-sku');assert.equal(fresh.baseline,false,'前14天全量快照完整，首次入榜可确认为新增');
 assert.equal(complete.gdRiskReminder(fresh,current,'2026-10-26').type,'新出现风险');
 // 新增高危来源阶段同样不排除已有执行任务或执行单编号。
 complete.rpWarningHistory=()=>[{...fresh,id:'new-risk',executionOrderId:'EXEC-1'}];complete.gdRiskSources=()=>[{key:'3|new-sku|all',kind:3,title:'缺货预警榜',severity:2,row:{spuId:'spu1',skuId:'new-sku',name:'SKU1',category:'环境'},metrics:[]}];
 complete.gdHasExecution=()=>{throw Error('新增高危不应查询执行任务作为入榜前提')};complete.gdSourceDate=value=>value;complete.aiAssignees=[];complete.upTodoPersonDepartment=()=>'';complete.diagnosisNormalizeSource=value=>value;
 const rows=complete.gdNewRiskKeyWork({by:()=>({range:{start:'2026-10-01',end:'2026-10-26'}})},{start:'2026-10-01',end:'2026-10-26'});assert.equal(rows.length,1);assert(!rows[0].problem.includes('执行任务'));
}
export async function diagnosisWorkspace(page){
 verifyExecutionIdentity();verifyRiskTaskIndependence();verifyProjectTaskGaps();verifyRiskChanges();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 // 确认原型不拿稀疏历史推断新增；专项随后注入明确的完整历史快照夹具。
 const original=await page.evaluate(()=>({board:riskBoardAppearanceSnapshot(),risks:globalDiagnosisRiskSnapshot()}));
 if(original.board.observedDates.length<15)assert.equal(original.risks.rows.filter(row=>!row.sample).length,0,'普通记录历史不完整时不制造新增高危；显式样例使用隔离的模拟历史');
 await page.evaluate(()=>{const board=riskBoardAppearanceSnapshot(),end=board.observedDates.at(-1),observedDates=Array.from({length:15},(_,i)=>new Date(Date.parse(end+'T00:00:00Z')-i*86400000).toISOString().slice(0,10));localStorage.setItem(board.storageKey,JSON.stringify({records:Object.fromEntries(board.history.map(row=>[row.kind+'|'+row.objectId+'|'+row.platform,row])),observedDates}))});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 await root.locator('[data-gd-part="coordination"]').click();
 assert.deepEqual(await root.locator('#aigrid h3').allTextContents(),['重点工作清单','工作偏差预警','日周报诊断','任务清单']);
 assert.deepEqual(await root.locator('[data-gd-tab]').evaluateAll(es=>es.map(e=>e.dataset.gdTab)),['project','high-risk']);
 const initial=await audit(),keys=initial.work.map(r=>r.workKey);
 assert.equal(initial.state.tabs.coordination,'project');
 for(const [key,label] of [['project','项目卡点'],['high-risk','新增高危']]){
  const tab=root.locator('[data-gd-tab="'+key+'"]'),help=root.locator('[data-gd-key-help="'+key+'"]');
  await tab.click();
  const view=await audit(),expected=initial.work.filter(r=>r.keyType===key);
  assert.deepEqual(view.visible.map(r=>r.id),expected.map(r=>r.id),'Tab仅显示对应类型');
  assert.equal(await tab.locator('span').innerText(),String(expected.length));
  assert.equal(await root.locator('.key-work [data-gd-action="task"]').count(),0);
  assert.equal(await root.locator('.key-work [data-label="优先级"] .gd-project-light,.key-work .gd-key-light').count(),0,'灯色不再放在优先级列');
  for(const record of await root.locator('[data-gd-key-work]').all()){
   const workKey=await record.getAttribute('data-gd-key-work'),row=expected.find(r=>r.workKey===workKey);
   const light=record.locator('[data-label="业务对象"] strong>.gd-project-light');
   if(row.object.type==='project'&&row.light)assert.equal((await light.innerText()).replace('●','').trim(),row.light,'项目名称后显示对应灯色');
   else assert.equal(await light.count(),0,'非项目对象不显示项目灯色');
  }

  assert.deepEqual([...new Set(await root.locator('.key-work [data-label="操作"]').allTextContents())],['查看依据'],'重点清单两类仅保留查看依据');
  assert.equal(await help.evaluate(el=>el.previousElementSibling?.dataset.gdTab),key,'问号紧跟各自Tab且不嵌入按钮');
  await help.focus();
  await page.locator('#metric-tooltip').waitFor({state:'visible'});
  assert((await page.locator('#metric-tooltip').innerText()).startsWith(label));
  if(key==='high-risk')assert(!(await page.locator('#metric-tooltip').innerText()).includes('执行任务'),'新增高危提示移除执行任务前提');
  assert(await page.locator('#metric-tooltip .metric-rule-section li').count()>=2,'二级提示逐点展示');
  assert.equal((await audit()).state.tabs.coordination,key,'查看提示不切换分类');
  await help.press('Escape');
  await page.locator('#metric-tooltip').waitFor({state:'hidden'});
  const record=root.locator('[data-gd-key-work]').first(),workKey=await record.getAttribute('data-gd-key-work'),row=expected.find(r=>r.workKey===workKey);
  const fields=(await root.locator('.key-work th').allTextContents()).filter(label=>!['业务对象','操作'].includes(label));
  const problem=await record.locator('[data-label="问题描述"] .gd-task-preview').innerText(),due=key==='project'?await record.locator('[data-label="建议整改期限"]').innerText():null;
  assert.equal(await root.locator('.key-work [data-gd-header-sort="due"]').count(),key==='project'?1:0,'仅项目卡点显示建议整改期限');
  assert.equal(await record.locator('[data-label="建议整改期限"]').count(),key==='project'?1:0);
  await record.locator('[data-gd-action="analysis"]').click();
  const detail=page.locator('.gd-key-work-dialog.gd-evidence-dialog');assert(await detail.isVisible());
  assert.match(await page.locator('#dialogtitle').innerText(),/^查看依据 - /);
  assert((await page.locator('#dialogtitle').innerText()).includes(row.object.name));
  assert.equal(await page.locator('#dialogsub [data-business-object-type="'+row.object.type+'"]').count(),1);
  assert.equal(await page.locator('#dialogbody .product-detail-image').count(),0);
  assert.equal(await detail.locator('.gd-detail-head').count(),0);
  assert.deepEqual(await detail.locator('h5').evaluateAll(es=>es.filter(e=>!e.closest('[data-ai-finding-history]')).map(e=>e.textContent)),[...fields,'来源依据'],'重点依据与主表字段一致，跟进记录另核');
  assert.equal(await detail.locator('.gd-detail-priority .up-todo-priority').innerText(),({P0:'紧急',P1:'重要',P2:'一般'})[row.priority]);
  const sections=detail.locator('.gd-text-section');
  assert.equal(await sections.nth(1).locator('p').innerText(),problem,'问题描述完整复用主表');
  if(key==='project')assert.equal(await sections.last().locator('p').innerText(),due,'日期复用主表原值');
  else assert(!(await detail.innerText()).includes('建议整改期限'),'新增高危依据同步移除日期');
  assert.deepEqual(await detail.locator('.gd-person-name').allTextContents(),row.participants.map(p=>p.assignee||'待分配'));
  assert.deepEqual(await detail.locator('.gd-detail-section > .gd-analysis-sources [data-analysis-source]').evaluateAll(es=>es.map(e=>e.dataset.analysisSource)),row.sources.map(source=>source.id));
  assert.equal(await detail.locator('input,textarea,select,[data-todo-action]').count(),0);
  await page.locator('#close').click();

 }
 await root.locator('[data-gd-tab="project"]').focus();
 await root.locator('[data-gd-tab="project"]').press('ArrowRight');
 assert.equal(await root.locator('[data-gd-tab="high-risk"]').getAttribute('aria-selected'),'true');
 await root.locator('[data-gd-tab="project"]').click();
 assert.equal(new Set(keys).size,keys.length);assert(initial.work.some(r=>r.light==='红灯'));assert(initial.work.filter(r=>r.keyType==='project').every(r=>r.light==='红灯'),'项目卡点不再纳入黄灯');
 assert(initial.work.some(r=>r.keyType==='high-risk'));assert(!initial.work.some(r=>r.keyType==='business'));
 assert.deepEqual(initial.counts[0].stats.map(([name])=>name),['项目卡点','新增高危']);
 assert.equal(initial.counts[0].count,initial.counts[0].stats.reduce((sum,[,count])=>sum+count,0),'移除分类同步从总量中扣除');
 assert(!(await root.locator('#aigrid').innerText()).includes('经营红线'));
 const store=()=>page.evaluate(()=>Object.fromEntries(globalDiagnosisAudit().tasks.map(r=>[r.task.id,r.task])));
 const beforeStore=await store();
 for(const row of initial.work){
  assert(row.sources.length&&row.businessObjects.length);assert.equal(row.task.status,'suggested');assert(row.workKey);
  assert(!beforeStore[row.task.id],'已下发的执行单不进入重点清单');
  if(row.keyType==='project'){assert(row.owner&&row.participants.every(p=>p.assignee),'已有项目负责人不得被演示目录清空');assert.equal(row.participants[0].assignee,row.decisionParticipants[0].assignee);assert.equal(row.participants[0].department,row.decisionParticipants[0].department);assert(row.projectTaskId!=null&&row.projectId!=null&&row.due);assert.match(row.sources[0].content,/项目红绿灯：红灯[\s\S]*阶段红绿灯：红灯[\s\S]*任务红绿灯：红灯/);assert.match(row.sources[0].content,/关联风险台账：未关联[\s\S]*关联执行单：未关联/)}
 }
 for(let i=0;i<3;i++)await root.locator('#refreshai').click();
 assert.deepEqual((await audit()).work.map(r=>r.workKey),keys,'刷新不增加同一高危事件或项目卡点');
 assert.deepEqual(await store(),beforeStore,'查看和刷新不自动下发重点事项');
 await root.locator('[data-gd-header-sort="due"]').click();
 assert.equal(await root.locator('th[aria-sort="ascending"] [data-gd-header-sort="due"]').count(),1);
 await root.locator('[data-gd-header-sort="priority"]').click();

 // 重点工作清单只读查看依据，不改变执行单和原事项。
 const high=initial.work.find(r=>r.keyType==='high-risk');
 await root.locator('[data-gd-tab="high-risk"]').click();
 await root.locator('[data-gd-search]').fill(high.object.name);
 const highRow=root.locator('[data-gd-key-work="'+high.workKey+'"]');
 await highRow.locator('[data-gd-action="analysis"]').click();
 assert.match(await page.locator('#dialogtitle').innerText(),/^查看依据 - /);
 assert.equal(await page.locator('#dialogbody .gd-detail-section > .gd-analysis-sources [data-source-type-key="risk-alert"]').count(),high.sources.length);
 assert(!(await page.locator('#dialogbody').innerText()).includes('绝缘耐压'));
 const riskAudit=await page.evaluate(()=>globalDiagnosisRiskSnapshot());
 assert(riskAudit.rows.every(r=>['新出现风险','风险复核'].includes(r.changeType)));
 assert(riskAudit.rows.every(r=>!r.problem.includes('升级')),'不再从灯色变化推断新增');
 assert((await page.locator('#dialogbody').innerText()).includes('上方风险榜出现记录'));
 assert(!(await page.locator('#dialogbody').innerText()).includes('新增高危展示记录'));
 const boardHistory=await page.evaluate(()=>riskBoardAppearanceSnapshot());
 assert(boardHistory.history.some(row=>row.baseline),'风险榜全量入榜采集不限三个历史样例');
 assert(!riskAudit.rows.some(row=>boardHistory.history.find(h=>h.kind+'|'+h.objectId+'|'+h.platform===row.riskIdentity)?.baseline&&row.date===boardHistory.history.find(h=>h.kind+'|'+h.objectId+'|'+h.platform===row.riskIdentity)?.appearances[0]),'基线不冒充新增');
 for(const r of riskAudit.rows)if(r.previousAppearedAt)assert((Date.parse(r.date)-Date.parse(r.previousAppearedAt))/86400000>=15,'复核满足15天间隔');
 for(const row of riskAudit.rows){
  const history=riskAudit.history.find(h=>h.id===row.riskAlertId);
  assert(history);assert(history.appearances.includes(row.date));assert(!history.appearances.some(day=>day<row.date&&(Date.parse(row.date)-Date.parse(day))/86400000<15),'按最近一次上方出现抑制');assert(riskAudit.sources.some(source=>source.key===history.kind+'|'+history.objectId+'|'+history.platform),'新增记录绑定真实预警榜身份');
  assert.equal(row.source,'risk');assert(row.sources.every(source=>source.sourceTypeKey==='risk-alert'));
  assert(!row.problem.includes('绝缘耐压'));
 }
 assert(riskAudit.rows.filter(row=>row.riskAlertId==='quality-freeze-existing-a831').every(row=>row.changeType==='风险复核'&&row.previousAppearedAt),'历史预警满15天且仍触发才复核');
 await page.locator('#close').click();
 assert.deepEqual(await store(),beforeStore,'查看重点依据不生成或修改执行单');
 await root.locator('#refreshai').click();
 assert.deepEqual((await audit()).work.map(r=>r.workKey),keys,'查看后刷新保留原事项');

 // 三类偏差只读查看，保留原事项身份和来源，不再创建或关联任务。
 await root.locator('[data-gd-part="resource"]').click();
 assert.deepEqual(await root.locator('[data-gd-tab]').evaluateAll(es=>es.map(e=>e.dataset.gdTab)),['omission','blocker','solution','focus-shift']);
 const stable=initial.deviations.map(r=>r.id),tasksBefore=JSON.stringify(await store());
 const proactive=initial.deviations.filter(row=>row.coordinationType==='proactive');
 assert.deepEqual(proactive.map(row=>row.id).sort(),['work-coordination-launch-support','work-coordination-material-trial']);
 assert.equal(initial.deviations.filter(row=>row.coordinationType==='blocked').length,2,'保留原上下游受阻样例');
 for(const row of proactive){
  assert.equal(row.kind,'blocker');assert(row.departments.length>=2&&row.participants.length>=2,'协同建议包含各方配合内容');
  assert.doesNotMatch(row.problem,/受阻|阻塞|延期|无法/,'主动协同不冒充已发生卡点');
  const source=row.sources.find(source=>source.id===row.problemSource.sourceId);
  assert(source&&source.objectKey===row.object.key&&source.content.includes(row.problemSource.quote),'协同建议保留同对象的真实引用');
  assert(row.sources.every(source=>!/受阻|阻塞|延期|无法/.test(source.content)),'来源仅记录准备工作');
 }

 assert.deepEqual((await audit()).deviations.map(r=>r.id),stable);
 assert(initial.deviations.every(r=>!r.task&&!r.workTaskId&&!r.due&&!r.status));
 assert(!Object.values(await store()).some(t=>initial.deviations.some(r=>r.id===t.gdIssue)));
 assert(!Object.values(await store()).some(t=>['coordinate-supplier','decision-launch-batch'].includes(t.gdIssue)));
 for(const tab of ['omission','blocker','solution','focus-shift']){
  await root.locator('[data-gd-tab="'+tab+'"]').click();assert(await root.locator('[data-gd-deviation]').count()>0);
  assert.equal(await root.locator('[data-gd-deviation-help]').count(),4);
  const help=root.locator('[data-gd-deviation-help="'+tab+'"]');
  assert.equal(await help.evaluate(el=>el.previousElementSibling?.dataset.gdTab),tab,'偏差问号紧跟对应Tab');
  await help.hover();await page.locator('#metric-tooltip').waitFor({state:'visible'});
  const helpText=await page.locator('#metric-tooltip').innerText();
  assert(helpText.startsWith({omission:'工作遗漏',blocker:'协同卡点',solution:'缺少方案','focus-shift':'资源错配'}[tab]));
  assert(helpText.includes({omission:'未见对应工作安排',blocker:'导致下游工作无法继续推进',solution:'可执行方案','focus-shift':'实际工作记录'}[tab]));
  if(tab==='blocker')assert(helpText.includes('直接识别需要跨部门共同推进或衔接的工作'));
  assert.equal((await audit()).state.tabs.resource,tab,'查看提示不改变Tab');
  await help.focus();await help.press('Escape');await page.locator('#metric-tooltip').waitFor({state:'hidden'});

  assert.deepEqual(await root.locator('.deviation th').allTextContents(),['业务对象','优先级','问题描述','行动建议','涉及人员','操作']);
  assert.equal(await root.locator('[data-gd-status-dropdown],[data-gd-task],[data-gd-action="task-detail"],[data-gd-action="task"]').count(),0);
  for(const button of await root.locator('.deviation [data-gd-action]').all())assert.equal(await button.innerText(),'查看依据');
  const row=(await audit()).visible[0];
  await root.locator('[data-gd-deviation="'+row.id+'"] [data-gd-action="analysis"]').click();
  const detail=page.locator('.gd-deviation-dialog.gd-evidence-dialog');assert(await detail.isVisible());
  assert.equal(await page.locator('#dialogbody .product-detail-image').count(),0);
  assert.equal(await detail.locator('.gd-detail-head').count(),0);
  const fields=await detail.locator('h5').evaluateAll(es=>es.filter(e=>!e.closest('[data-ai-finding-history]')).map(e=>e.textContent));
  const tableFields=(await root.locator('.deviation th').allTextContents()).filter(label=>!['业务对象','操作'].includes(label));
  assert.deepEqual(fields,[...tableFields,'来源依据'],'依据抽屉业务字段与主表一致，不额外增加诊断字段');
  assert.equal(await detail.locator('.gd-detail-priority .up-todo-priority').innerText(),({P0:'紧急',P1:'重要',P2:'一般'})[row.priority],'抽屉与表格优先级一致');
  const tones=await detail.locator('.gd-text-section').nth(1).evaluate(el=>({label:getComputedStyle(el.querySelector('h5')).color,value:getComputedStyle(el.querySelector('p')).color}));
  assert.notEqual(tones.label,tones.value,'字段名与字段值使用不同颜色层级');
  assert.match(await page.locator('#dialogtitle').innerText(),/^查看依据/);
  assert.equal(await page.locator('.up-todo-dialog[open]').count(),0);
  assert.equal(await detail.locator('[data-todo-action],[data-todo-field-edit],input,textarea,select').count(),0);
  assert.deepEqual(await detail.locator('.gd-detail-section > .gd-analysis-sources [data-analysis-source]').evaluateAll(es=>es.map(e=>e.dataset.analysisSource)),row.sources.map(s=>s.id));
  assert.match(await detail.innerText(),/优先级.*问题描述.*行动建议.*涉及人员.*来源依据/s);
  assert.doesNotMatch(await detail.innerText(),/建议整改期限|实际完成日期|任务状态|确认下发|删除任务/);
  await page.locator('#close').click();
 }

 await root.locator('[data-gd-tab="blocker"]').click();
 for(const row of proactive){
  const item=root.locator('[data-gd-deviation="'+row.id+'"]');assert(await item.isVisible());
  assert((await item.locator('[data-label="行动建议"]').innerText()).includes('确认'),'列表显示具体配合事项');
  await item.locator('[data-gd-action="analysis"]').click();
  const detail=page.locator('.gd-deviation-dialog');assert(await detail.isVisible());
  assert.deepEqual(await detail.locator('.gd-detail-section > .gd-analysis-sources [data-analysis-source]').evaluateAll(es=>es.map(e=>e.dataset.analysisSource)),row.sources.map(source=>source.id));
  assert.deepEqual(await detail.locator('.gd-person-name').allTextContents(),row.participants.map(person=>person.assignee));
  assert.equal(await detail.locator('input,textarea,select,[data-todo-action]').count(),0,'主动协同依据仍只读');
  await page.locator('#close').click();
 }
 await root.locator('[data-gd-search]').fill('不存在的事项');assert(await root.locator('.gd-empty').isVisible());
 await root.locator('[data-gd-search]').fill('');await root.locator('#refreshai').click();
 assert.equal(JSON.stringify(await store()),tasksBefore,'查看、搜索、刷新偏差诊断不生成或修改执行单');
 await root.locator('[data-gd-part="execution"]').click();
 assert.deepEqual(await root.locator('[data-gd-tab]').evaluateAll(es=>es.map(e=>e.dataset.gdTab)),['quality','missing']);
 assert.equal(await root.locator('[data-gd-tab="quality"]').getAttribute('aria-selected'),'true');
 assert(initial.reports.some(r=>!r.missing&&r.findings.length));
 await root.locator('[data-gd-tab="missing"]').click();assert(await root.locator('[data-report-row]').count()>0);
 assert.equal(await root.locator('[data-gd-part="closure"],[data-gd-improvement]').count(),0,'改善建议入口及内容已撤下');
 assert.equal((await audit()).improvements.length,0,'不再生成已撤下模块的数据');
 assert(!(await audit()).classifications.some(row=>row.module==='closure'));
 assert.equal(initial.deviations.filter(row=>row.kind==='focus-shift').length,2,'明确分工与实际工作对照归入资源错配');
 for(const row of initial.deviations.filter(row=>row.kind==='focus-shift')){
  assert(row.sources.some(s=>s.type==='会议纪要')&&row.sources.some(s=>s.type!=='会议纪要'),'偏移保留分工和实际记录两侧依据');
 }
 // 窄屏不撑开页面；各表操作列仍固定，长内容保留展开。
 for(const width of [2880,1920,1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const part of ['coordination','resource','execution']){
   await root.locator('[data-gd-part="'+part+'"]').click();
   if(part==='coordination'){
    await root.locator('[data-gd-tab="high-risk"]').click();
    await root.locator('[data-gd-search]').fill('');
    const advice=root.locator('[data-label="行动建议"] .gd-task-cell').first(),toggle=advice.locator('[data-gd-cell-more]');
    const preview=advice.locator('.gd-task-preview'),original=await preview.innerText();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    if(await toggle.isVisible()){
     await toggle.click();await assertPreviewButtonClear(preview);
     assert.equal(await preview.innerText(),original);
     await toggle.click();await page.waitForFunction(()=>!document.querySelector('.gd-task-cell.is-transitioning'));
     assert.equal(await preview.evaluate(el=>el.clientHeight),66);
    }else assert(await preview.evaluate(el=>el.scrollHeight<=el.clientHeight+1),'完整三行内容不显示多余的展开按钮');
    await root.locator('[data-gd-tab="project"]').click();
    await root.locator('[data-gd-search]').fill('');
    for(const key of ['project','high-risk']){
     const box=await root.locator('[data-gd-key-help="'+key+'"]').boundingBox();
     assert(box&&box.x>=0&&box.x+box.width<=width+1,'每个Tab的问号在窄屏可见');
    }
   }
   const host=root.locator('.gd-table-scroll');await host.evaluate(el=>el.scrollLeft=el.scrollWidth);
   if(part==='resource'){
    for(const key of ['omission','blocker','solution','focus-shift']){
     const box=await root.locator('[data-gd-deviation-help="'+key+'"]').boundingBox();
     assert(box&&box.x>=0&&box.x+box.width<=width+1,'偏差Tab问号在窄屏保持可见');
    }
    for(const item of await root.locator('[data-label="行动建议"] .gd-action-content').all()){
     const style=await item.evaluate(el=>({line:getComputedStyle(el).lineHeight,gap:getComputedStyle(el).marginTop,summary:el.querySelector('strong').textContent,detail:el.querySelector('.gd-action-detail')?.textContent||''}));
     assert.equal(style.line,'22px');assert.equal(style.gap,'0px');
     const clean=text=>text.replace(/[【】\s，。；：、,.!?;:]/g,'');
     if(style.detail)assert(!clean(style.detail).startsWith(clean(style.summary)),'摘要不重复出现在正文前缀');
    }
    const more=root.locator('[data-label="行动建议"] [data-gd-cell-more]:visible').first();
    if(await more.count()){
     const cell=more.locator('..'),preview=cell.locator('.gd-task-preview');
     assert.equal(await preview.evaluate(el=>el.clientHeight),66);
     await more.click();assert.equal(await more.getAttribute('aria-expanded'),'true');
     await assertPreviewButtonClear(preview);
     assert(await preview.evaluate(el=>el.clientHeight>=el.scrollHeight-1));
     await more.click();assert.equal(await more.getAttribute('aria-expanded'),'false');
     assert.equal(await preview.evaluate(el=>el.clientHeight),66);
    }
   }

   const position=await host.locator('thead th:last-child').evaluate(e=>getComputedStyle(e).position);
   if(part==='execution')assert.notEqual(position,'sticky');else assert.equal(position,'sticky');
   assert(await root.evaluate(e=>{const box=e.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth+1}),'AI 模块保持在可见宽度内');
  }
 }
}
