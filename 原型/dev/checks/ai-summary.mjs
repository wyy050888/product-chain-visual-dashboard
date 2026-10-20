import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function verifyFullContext(){
 const calls=[],product={spuId:'FULL',actualLaunch:'2026-08-15'};
 const shiftDate=(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const context=vm.createContext({boundedCache:()=>new Map(),upProduct:p=>p,upIdentity:p=>p,DATA_CUTOFF:'2026-10-10',riskDateMin:'2026-01-01',shiftDate,
  riskMonthShift:(month,n)=>{const d=new Date(month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,7)},
  qrPlatforms:['天猫','抖音'],upSummary:(p,start,end,platform)=>{calls.push({start,end,platform});return {start,end,platform}},
  upWithRange:(state,fn)=>fn(),pfCompanyStockModel:()=>({stock:{warehouse:10},stockEnd:'2026-10-10'})});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/04-ai-context.js',import.meta.url),'utf8'),context);
 const full=context.upAiFullContext(product);
 assert.equal(full.state.start,product.actualLaunch);assert.equal(full.state.end,'2026-10-10');assert.equal(full.state.platform,'all');
 assert.deepEqual(JSON.parse(JSON.stringify(full.model.company)),{start:'2026-08-15',end:'2026-10-10',platform:'all'});
 assert.equal(full.model.recent.start,'2026-09-11');assert.equal(full.model.previous.end,'2026-09-10');
 assert.deepEqual(Array.from(full.model.months,m=>m.complete),[true,true,false]);
 assert.equal(full.model.stockEnd,'2026-10-10');assert(calls.every(c=>c.end<='2026-10-10'));
 assert.equal(context.upAiFullContext({...product,start:'2026-10-01',end:'2026-10-05',platform:'天猫'}),full,'独立上下文不采用页面筛选');
}

function verifyDecisions(){
 const context=vm.createContext({
  fmt:(n,d=0)=>Number(n).toFixed(d),upPercent:n=>Number.isFinite(n)?n.toFixed(1)+'%':'—',upMoney:n=>(n/1000000).toFixed(1)+'w',
  aiToday:()=> '2026-10-15',shiftDate:(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)},
  upStockModel:()=>({rows:[{code:'DEMO-SKU01'}]}),upIdentity:()=>({sourceRow:2}),
  rpLossReturnTarget:()=>15,qrPlatforms:['天猫','抖音'],qrObservation:()=>({}),upViolationRows:()=>[],
  rpQualityChangeValue:(a,b)=>b?(a-b)/b*100:null,rpComparisonText:n=>n===null?'环比—':'环比'+n.toFixed(1)+'%',
  ccOpportunityRows:()=>[],upTodoId:(s,d)=>s.start+'|'+d,upTodos:{}
 });
 const costModel=fs.readFileSync(new URL('../../src/modules/cost-control/04-opportunity-model.js',import.meta.url),'utf8');
 vm.runInContext(costModel.split('\n').find(line=>line.startsWith('function ccAppendCostProposal(')),context);
 const todoModel=fs.readFileSync(new URL('../../src/modules/unified-product/07-todo-model.js',import.meta.url),'utf8');
 vm.runInContext(todoModel.slice(todoModel.indexOf('const upTodoTypes='),todoModel.indexOf('const upTodoPriorities=')),context);
 for(const name of ['04-ai-demo','04-ai-policy','04-ai-analysis','07-todo-diagnosis'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/'+name+'.js',import.meta.url),'utf8'),context);
 const classify=(wan,margin)=>context.upAiClassify(wan*1000000,margin);
 assert.equal(classify(700,13).grade,'S');assert.equal(classify(420,9).grade,'A');assert.equal(classify(200,16).grade,'B');assert.equal(classify(50,9).grade,'C');
 for(const [wan,margin]of [[600,13],[300,16],[60,16],[420,16],[50,20],[700,12],[200,15]])assert.equal(classify(wan,margin).grade,null,'不可补评级边界');
 const state={start:'2026-01-01',end:'2026-10-10',platform:'all',spuId:'DEMO'};
 const assess=(wan,margin,returnRate=10,staleUnits=0)=>{
  const company={gsvCents:wan*1000000,sales:wan?3000:0,returned:wan?300:0,profitRate:wan?margin:null,feeRate:5};
  company.profitCents=Math.round(company.gsvCents*margin/100);company.costCents=company.gsvCents-company.profitCents;
  context.upSummary=()=>company;
  const rows=['天猫','抖音'].map(platform=>({...company,platform,gsvCents:company.gsvCents/2,profitCents:company.profitCents/2,returned:wan?returnRate*15:0,returnRate}));
  const model={product:{name:'演示产品',spuId:'DEMO',spuCode:'DEMO',cohort:'old',chain:0,attribute:'四季品'},company,recent:company,previous:company,months:[],platformRows:rows,
   stock:{warehouse:1800,undelivered:1200,staleUnits,staleValueCents:1000000,totalUnits:3000},stockEnd:state.end};
  context.upAiFullContext=()=>({model,state});
  const analysis=context.upAiAnalysis(model,state),brief=context.upAiBrief(analysis),text=analysis.summary+Object.values(brief).join('');
  assert(text.length<=600,'摘要长度：'+text.length);
  assert(!/净利润率|批次|未接入|PR1015|甲厂/.test(text),'仅用已标识模拟资料和页面利润率：'+text);
  const d=analysis.demo,c=d.cost;
  assert.equal(c.factory,c.base+c.mold);assert.equal(c.brandSupply,c.factory+c.brand);assert.equal(c.companySupply,c.brandSupply+c.refurb);assert.equal(c.channel,c.companySupply+c.management);
  if(wan)assert(Math.abs(c.projectedMargin-(margin+c.discount*(company.sales-company.returned)/company.gsvCents*100))<1e-8);
  const todos=context.upDiagnoseTodos(model,state);
  assert.equal(new Set(todos.map(t=>t.id)).size,todos.length);
  for(const t of todos){assert(t.plan.includes('DEMO-SKU01'));assert(t.description.includes('方案演示'));assert(!/问题批次|按批次|产品中心先决定价格|决定底价/.test(t.plan+t.description));}
  return {analysis,brief,todos,text};
 };
 const a=assess(420,9,25,300);assert.equal(a.analysis.assessment.grade,'A');assert.equal(a.analysis.direction.overallLoss,false,'页面利润9%不能按净利估算判亏');
 assert(a.brief.problems.includes('渠道供价'));assert(a.brief.actions.includes('同款补货请购'));
 assert(!/(?:QC|T|PO|PR|CF|RB|MT|PP|R)-\d/.test(a.brief.actions),'经营摘要使用业务名称，不堆叠内部编号');
 assert(a.brief.actions.includes('\n'),'部门行动按事项分行');
 assert(a.todos.some(t=>t.plan.includes('PR-')&&t.plan.includes('PO-')),'待办保留具体单据用于执行追溯');
 assert(a.todos.some(t=>t.plan.includes('四级供价')||t.plan.includes('工厂/品牌/公司/渠道供价')));
 const s=assess(700,13);assert.equal(s.analysis.assessment.grade,'S');assert(s.analysis.summary.includes('年度BOM'));
 const b=assess(200,16);assert(b.text.includes('升级规则待确认'));
 const c=assess(50,9);assert(c.text.includes('一次挽救'));assert(c.text.includes('待确认'));
 const loss=assess(420,-15,25,300);assert(loss.analysis.direction.overallLoss);assert(loss.analysis.summary.includes('恢复盈利'));
 assert.equal(loss.analysis.assessment.grade,'A','不得擅自改变已确认的A级负利润门槛');assert(loss.brief.problems.includes('不能视为经营健康'));
 const empty=assess(0,0);assert.equal(empty.analysis.assessment.grade,null);assert(empty.analysis.summary.includes('有效数据不足'));
}

export async function aiSummary(page){
 verifyFullContext();
 verifyDecisions();
 await page.locator('#riskrail [data-risk="0"]').click();
 await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
 const summary=page.locator('.up-ai-summary');
 const visibleActions=async()=>{
  const actions=summary.locator('.up-ai-actions p');
  await actions.waitFor({state:'visible'});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert(await actions.isVisible(),'部门行动必须实际可见');
  assert(!(await actions.getAttribute('class')||'').includes('presentation-suppressed'));
  assert((await actions.innerText()).includes('采购部'));
 };
 await visibleActions();
 const sample={product:await page.locator('.up-product-heading h2').innerText(),sections:await summary.locator('.up-ai-section p').allTextContents()};
 assert.deepEqual(await summary.locator('.up-ai-section>strong').allTextContents(),['经营结论','问题分析','部门行动']);
 assert(sample.sections.join('').length<=600);
 assert(!/(?:QC|T|PO|PR|CF|RB|MT|PP|R)-\d/.test(sample.sections[2]));
 assert.equal(await summary.locator('.up-ai-actions p').evaluate(e=>getComputedStyle(e).whiteSpace),'pre-line');
 const scope=await summary.locator('.up-ai-scope').innerText();assert.match(scope,/^截至\d{2}\/\d{2}\/\d{2}$/);
 await summary.locator('[data-up-ai-prompt]').click();
 const prompt=await page.locator('#up-ai-prompt pre').innerText();
 for(const word of ['产品链副总','不受页面时间或平台筛选影响','600万元','300万元','15%','5%—8%','渠道成本＝渠道供价','日周报','会议纪要','没有批次信息','运营决定','经营结论、问题分析、部门行动'])assert(prompt.includes(word),word);
 await page.keyboard.press('Escape');assert(await summary.isVisible());
 const text=await summary.locator('.up-ai-section p').allTextContents();
 await page.locator('#up-platform').evaluate(e=>{e.value='天猫';e.dispatchEvent(new Event('change',{bubbles:true}))});
 assert.deepEqual(await summary.locator('.up-ai-section p').allTextContents(),text,'保持全平台口径');
 await visibleActions();
 await page.locator('.up-detail-period [data-drawer-time-mode="month"]').click();
 const periods=[];
 for(const month of ['9','10']){
  await page.locator('.up-detail-period [data-drawer-time-value]').selectOption(month);
  periods.push(await page.locator('.up-detail').getAttribute('data-up-start'));
  assert.deepEqual(await summary.locator('.up-ai-section p').allTextContents(),text,'切换考察期间不改变全量分析');
  assert.equal(await summary.locator('.up-ai-scope').innerText(),scope);
  await visibleActions();
 }
 assert.notEqual(periods[0],periods[1],'页面期间仍须正常切换');
 await summary.locator('[data-up-ai-toggle]').click();assert(await page.locator('#up-ai-details').isHidden());
 await summary.locator('[data-up-ai-toggle]').click();assert(await page.locator('#up-ai-details').isVisible());
 await page.locator('[data-drawer-tab="handling"]').click();await page.locator('[data-todo-tab="suggestions"]').click();
 const table=page.locator('#up-todo-table');assert(await table.locator('[data-todo-open="detail"]').count()>0);
 const ids=await table.locator('[data-todo-open="detail"]').evaluateAll(es=>es.map(e=>e.dataset.todoId));
 await page.locator('[data-drawer-tab="operating"]').click();
 await page.locator('.up-detail-period [data-drawer-time-value]').selectOption('9');
 await page.locator('[data-drawer-tab="handling"]').click();await page.locator('[data-todo-tab="suggestions"]').click();
 assert.deepEqual(await table.locator('[data-todo-open="detail"]').evaluateAll(es=>es.map(e=>e.dataset.todoId)),ids,'建议不随页面日期重建');
 await visibleActions();
 await table.locator('[data-todo-open="detail"]').first().click();
 const dialog=page.locator('.up-todo-dialog'),body=await dialog.innerText();
 assert(!body.includes('方案演示'));assert(body.includes('判断理由：'));assert(body.includes('统计期间：'));
 assert(!/问题批次|按批次|PR1015|甲厂/.test(body));
 await page.keyboard.press('Escape');
 for(const tab of ['quality','stock','operating']){await page.locator('[data-drawer-tab="'+tab+'"]').click();await visibleActions();}
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);await visibleActions();
 await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 return sample;
}
