
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
export function verifyAutoDates(){
 const box={upSpus:new Map(),gdMeetingReference:()=>null,aiAssignees:[['林悦','清洁链链主'],['唐琪','采购部']],aiToday:()=> '2026-10-21',DATA_CUTOFF:'2026-10-21',localStorage:{getItem:()=>null,setItem:()=>{}},document:{dispatchEvent:()=>{}},CustomEvent:class{},shiftDate:(date,days)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)},gdActionRecipe:row=>({problem:row.problem}),gdActionImpact:row=>row.impact||''};vm.createContext(box);box.window||={};vm.runInContext(fs.readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),box);
 for(const file of ['shared-classification/02-diagnosis-catalog.js','unified-product/07-todo-collaboration-model.js','unified-product/07-todo-origin.js','unified-product/07-todo-model.js','global-diagnosis/05-source-location.js','global-diagnosis/05-todo-basis.js','global-diagnosis/02-action-copy.js','global-diagnosis/03-auto-tasks.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),box);
 vm.runInContext('function gdProposal(row){return upTodos[row.task.id]||row.task}',box);
 for(const [input,expected] of [['red','P1'],['yellow','P2'],['green','P3'],['P0','P0'],['P1','P1'],['P2','P2'],['P3','P3'],['unknown','P2'],['__proto__','P2']]){box.inputPriority=input;assert.equal(vm.runInContext('upTodoPriorityKey(inputPriority)',box),expected)}
 assert.deepEqual(Array.from(vm.runInContext("['P3','P1','P0','P2'].sort((a,b)=>upTodoPriorityRank(a)-upTodoPriorityRank(b))",box)),['P0','P1','P2','P3']);
 const historical={id:'old',priority:'red',status:'done',logs:[],description:'保留人工描述',plan:'保留人工计划',completedAt:'2026-10-20T08:00:00Z',assignee:'唐琪'};box.historical=historical;const migrated=vm.runInContext('upNormalizeTodo(historical)',box);assert.equal(migrated.priority,'P1');assert.equal(migrated.completedAt,historical.completedAt);assert.equal(migrated.description,historical.description);assert.equal(migrated.plan,historical.plan);

 const task={id:'expired-suggestion',spuId:'SPU',title:'核对供方材料',description:'准入材料缺失',plan:'补齐资料',assignee:'唐琪',department:'采购部',priority:'red',taskType:'supply-optimization',status:'suggested',due:'2026-10-01',source:'global-diagnosis',gdIssue:'sample',logs:[]};
 box.rows=[{title:task.title,problem:task.description,priority:'red',due:'2026-10-01',task}];vm.runInContext('gdAutoAssign(rows)',box);assert.equal(vm.runInContext('upTodos[rows[0].task.id].due',box),'2026-10-22');assert.equal(vm.runInContext('upTodos[rows[0].task.id].assignedBy',box),'AI');
 vm.runInContext('gdAutoAssign(rows)',box);assert.equal(vm.runInContext('upTodos[rows[0].task.id].logs.length',box),1,'重复识别只派发一次');
 vm.runInContext('upTodos[rows[0].task.id].due="2026-10-20";gdAutoAssign(rows)',box);assert.equal(vm.runInContext('upTodos[rows[0].task.id].due',box),'2026-10-20','已派发的逾期承诺节点保留');
 box.rows=[{title:task.title,problem:task.description,priority:'red',due:'2026-11-01',task:{...task,id:'planned',due:''}}];vm.runInContext('gdAutoAssign(rows)',box);assert.equal(vm.runInContext('upTodos.planned.due',box),'2026-11-01');assert.equal(vm.runInContext('upTodos.planned.gdDueSource',box),'business-plan');
 box.rows=[{title:task.title,problem:task.description,priority:'red',task:{...task,id:'unknown',assignee:'未知人员'}}];assert.throws(()=>vm.runInContext('gdAutoAssign(rows)',box),/业务责任人未匹配/);assert.equal(vm.runInContext('upTodos.unknown',box),undefined,'不能随机指派缺失负责人');
 // 口语版自动行动同样升级，幂等且不改办理数据。
 const colloquial={responsibilities:[{id:'log',action:'去钉钉确认日志交了没有；没交就补交，再把日志链接贴到待办里。',status:'done',feedback:'已补交',completedAt:'2026-10-20T08:00:00Z'}],plan:'人工确认的办理安排',priority:'red',due:'2027-01-03'};
 box.colloquial=colloquial;const concise=vm.runInContext('gdRefreshActionCopy(colloquial)',box);
 assert.equal(concise.responsibilities[0].action,'核实日志提交状态，补齐缺失日志及链接。');assert.equal(concise.plan,colloquial.plan);assert.equal(concise.responsibilities[0].feedback,'已补交');assert.equal(concise.responsibilities[0].completedAt,colloquial.responsibilities[0].completedAt);assert.equal(concise.due,colloquial.due);
 box.concise=concise;assert.equal(vm.runInContext('gdRefreshActionCopy(concise)',box),concise,'重复刷新不反复改写');
 // 旧自动文案同步到原待办；人工行动、反馈、截止日期及状态不能被文案升级覆盖。
 box.legacy={...task,id:'old-copy',gdAutomatic:true,status:'working',due:'2027-01-03',description:'产品利润偏低，报价优化与结构调整路径尚待确定。',responsibilities:[{id:'purchase',assignee:'唐琪',department:'采购部',action:'提交适用SKU的最新报价、采购条件和单台降本测算。',completionCriteria:'报价列明适用SKU、采购条件、生效日期及单台降本金额。',status:'done',feedback:'报价已收到',completedAt:'2026-10-20T08:00:00Z'},{id:'manual',assignee:'林悦',department:'产品中心',action:'人工约定：周五确认报价',completionCriteria:'人工约定：会上确认',status:'working',feedback:'已约好会议'}]};
 box.legacy.plan=box.legacy.responsibilities.map(r=>r.assignee+'：'+r.action).join('\n');box.rows=[{task:box.legacy,problem:'这款产品利润低，还没确定是重新谈价格，还是调整产品结构。'}];
 vm.runInContext('upTodos[legacy.id]=legacy;gdAutoAssign(rows)',box);const updated=vm.runInContext('upTodos[legacy.id]',box);
 assert.equal(updated.responsibilities[0].action,'提交适用型号报价、采购条件、生效日期及单台降本测算。');assert.match(updated.responsibilities[0].completionCriteria,/每台省多少钱/);assert.match(updated.plan,/单台降本测算/);
 assert.equal(updated.responsibilities[0].feedback,'报价已收到');assert.equal(updated.responsibilities[0].status,'done');assert.equal(updated.due,box.legacy.due);assert.equal(updated.status,'working');assert.deepEqual(JSON.parse(JSON.stringify(updated.responsibilities[1])),{...box.legacy.responsibilities[1],completedAt:''});
 vm.runInContext('upTodos[legacy.id].plan="人工确认的新安排";gdAutoAssign(rows)',box);assert.equal(vm.runInContext('upTodos[legacy.id].plan',box),'人工确认的新安排');
}
