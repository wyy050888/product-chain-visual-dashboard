import {verifyProjectQuoteSamples} from './project-quote-samples.mjs';
import {verifyProjectLightDistribution} from './project-light-distribution.mjs';
import {verifyProjectChartHeaders} from './project-chart-headers.mjs';
import {businessRuleContext} from './business-rules-context.mjs';
import {verifyProjectChartDimensions} from './project-chart-dimensions.mjs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import vm from 'node:vm';
export async function projectPanorama(page){
 // 固定样例截止日，避免历史预期受运行日期漂移影响。
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 const ctx=businessRuleContext({});ctx.window||={};vm.runInContext(fs.readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),ctx);vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/01-model.js',import.meta.url),'utf8'),ctx);
 const crossRisk={ledger:[{department:'产品中心',light:'红灯'},{department:'采购部',light:'黄灯'},{department:'采购部',light:'红灯',status:'已闭环'},{department:'研发中心',light:'绿灯'}]};
 assert.equal(ctx.ppMatchesRisk(crossRisk,{department:['采购部'],riskLight:['红灯']}),false,'部门和灯色不能跨风险单匹配，也不能命中已闭环记录');
 assert.equal(ctx.ppMatchesRisk(crossRisk,{department:['产品中心'],riskLight:['红灯']}),true);
 assert.equal(ctx.ppMatchesRisk(crossRisk,{department:['采购部'],riskLight:['黄灯']}),true);
 assert.deepEqual(Array.from(ctx.ppSelectedRisks(crossRisk,{department:['采购部'],riskLight:['黄灯']}),r=>r.light),['黄灯']);
 assert.equal(ctx.ppSelectedRisks(crossRisk,{department:[],riskLight:[]}).length,3,'全部仅展示红黄灯风险，原始台账仍保留绿灯');
 assert.equal(ctx.ppSelectedRisks(crossRisk,{department:['研发中心'],riskLight:[]}).length,0);
 assert.equal(crossRisk.ledger.length,4,'隐藏绿灯不删除原始记录');

 await page.locator('a[href="#projects"]').click();
 await verifyProjectChartDimensions(page);
 await verifyProjectChartHeaders(page);
 await verifyProjectLightDistribution(page);
 const snapshot=()=>page.evaluate(()=>window.projectPanoramaAudit());
 const initial=await snapshot();assert(initial.scope.length>0);const detailScope=initial.scope.filter(p=>['红灯','黄灯'].includes(p.status));assert.deepEqual(initial.filtered.map(p=>p.id).sort((a,b)=>a-b),detailScope.map(p=>p.id).sort((a,b)=>a-b));assert.equal(await page.locator('[data-pp-light-tab="绿灯"]').count(),0);const allProjects=page.getByRole('button',{name:'查看全部项目',exact:true});await allProjects.click();await page.locator('#toast').waitFor({state:'visible'});assert.equal(await page.locator('#toast').innerText(),'跳转项目总览');assert(await page.locator('#metric-tooltip').isHidden());
 await verifyProjectQuoteSamples(page,ctx);
 const selectedScope=async dimension=>page.locator('#pp-'+dimension+'-tabs [aria-pressed="true"]').evaluateAll((es,key)=>es.map(e=>e.getAttribute('data-pp-'+key+'-tab')),dimension);
 assert.equal(await page.locator('#projects>.sectionhead #pp-filter-category,#pp-scope').count(),0);
 assert.equal(await page.locator('#pp-overview-title,.pp-main-table .pp-scope-tabs').count(),0);
 assert.equal(await page.locator('.pp-overview-section>.pp-scope-tabs+#pp-overview').count(),1);
 assert.equal(await page.locator('#pp-overview .pp-chart-columns').count(),2,'两张条形图显示与数值对齐的列头');
 assert.equal(await page.locator('.pp-main-table>.pp-details-heading+#pp-light-tabs+#pp-light-distribution+#pp-filters').count(),1,'项目明细标题、灯色卡、筛选区按箭头顺序排列');
 for(const width of [390,900,1440,1920]){
  await page.setViewportSize({width,height:1080});
  const order=await page.evaluate(()=>{const rect=id=>document.querySelector(id).getBoundingClientRect(),type=rect('#pp-type-tabs'),charts=rect('#pp-overview'),heading=rect('.pp-details-heading'),cards=rect('#pp-light-tabs'),filters=rect('#pp-filters');return type.bottom<=charts.top&&charts.bottom<=heading.top&&heading.bottom<=cards.top&&cards.bottom<=filters.top});
  assert(order,`${width}px下类型筛选在图表上方，项目明细标题在指标卡上方`);
  const chartRows=await page.locator('#pp-overview .pp-bars>.pp-link').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
  assert.equal(chartRows.length,10);assert(chartRows.every(height=>Math.abs(height-40)<1),'两图数据行统一40px '+width);
  const chartBodies=await page.locator('#pp-overview .pp-chart-body').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
  assert(chartBodies.every(height=>Math.abs(height-232)<2),'恢复列头后两图数据区高度一致 '+width);

 }
 const categoryTabs=page.locator('#pp-category-tabs'),categoryTab=value=>categoryTabs.locator('[data-pp-category-tab="'+value+'"]');
 assert.equal(await page.locator('#pp-filter-category').count(),0,'移除类目下拉入口');
 assert.equal(await page.locator('#pp-type-tabs button').count(),6,'类型移到上方分组Tab');
 await categoryTab('清洁').click();
 assert((await snapshot()).scope.every(p=>p.category==='清洁'));
 await categoryTab('环境').click();assert.deepEqual((await snapshot()).state.category,['清洁','环境']);
 assert((await snapshot()).scope.every(p=>['清洁','环境'].includes(p.category)));
 for(const button of await categoryTabs.locator('button').all()){
  const value=await button.getAttribute('data-pp-category-tab');assert.equal(await button.locator('span').innerText(),String(value==='all'?detailScope.length:detailScope.filter(p=>p.category===value).length),'类目计数忽略自身多选');
 }
 await page.locator('[data-pp-type-tab="自研开发"]').click();assert((await snapshot()).scope.every(p=>p.type==='自研开发'&&['清洁','环境'].includes(p.category)));
 const selectedCategories=(await snapshot()).state.category;await categoryTab('all').focus();await page.keyboard.press('ArrowRight');assert.deepEqual((await snapshot()).state.category,selectedCategories,'类目方向键只移动焦点');
 await page.locator('[data-pp-reset]').click();assert.deepEqual((await snapshot()).state.category,[]);assert.equal(await categoryTab('all').getAttribute('aria-pressed'),'true');

 // 首屏演示由固定排期产生，仍按有效计划日期排序，不能靠错配灯色凑展示。
 const demo=initial.filtered.slice(0,10),light=p=>p.status==='红灯'&&p.delay>15?'高危':p.status;
 assert.deepEqual([...new Set(initial.filtered.map(light))].sort(),['高危','红灯','黄灯'].sort());
 assert([1,3,6,9,16,20].every(days=>demo.some(p=>p.delay===days)));
 assert(demo.some(p=>p.revisedPlan)&&demo.some(p=>!p.revisedPlan));
 assert(demo.every(p=>p.delay===Math.max(0,Math.round((Date.parse(initial.cutoff)-Date.parse(p.plan))/86400000))));
 assert(demo.every((p,i)=>!i||[demo[i-1].plan,demo[i-1].revisedPlan].filter(Boolean).sort().at(-1)<=[p.plan,p.revisedPlan].filter(Boolean).sort().at(-1)));

 assert.deepEqual(initial.state.projectState,['进行中']);assert(initial.scope.every(p=>p.projectState==='进行中'));
 assert(initial.scope.every(p=>['红灯','黄灯','绿灯'].includes(p.status)),'项目采用当前有效灯色，不由延期强制覆盖人工修正');
 assert.equal(await page.locator('#pp-filter-projectState,[data-pp-filter="projectState"]').count(),0);
 assert.deepEqual((await snapshot()).state.projectState,['进行中']);
 assert.equal(await page.locator('.pp-table thead th').nth(2).innerText(),'计划上市日期');
 assert.equal(await page.locator('.pp-table td[data-label="项目状态"]').count(),0);
 assert.equal(await page.locator('.pp-table>thead th').count(),12,'按当前已移除两列后的表头验证');
 assert.equal(await page.locator('[aria-controls="pp-actual-panel"],.pp-table [data-label="实际上市日期"]').count(),0);
 assert.equal(await page.locator('[data-pp-row]').count(),10);
 assert.equal(await page.locator('.pp-table>thead th').last().innerText(),'操作');
 await page.locator('[data-pp-view]').first().click();
 assert.equal(await page.locator('#toast').innerText(),'跳转项目详情');
 assert(await page.locator('#toast').isVisible());
 assert(await page.locator('#overlay').isHidden());
 await page.locator('[data-pp-project]').first().click();
 assert.equal(await page.locator('#toast').innerText(),'跳转项目详情');
 assert(await page.locator('#overlay').isHidden(),'项目名称不再打开详情抽屉');
 assert.deepEqual([...new Set(initial.scope.map(p=>p.type))].sort(),['产品迭代','品质整改','研发创新','自研开发','自选开发'].sort());
 // 明确标识固定编码关联的演示台账；未提供台账的项目保持缺失。
 const sampleRows=initial.scope.filter(p=>p.ledger.some(r=>r.sample));
 assert.equal(sampleRows.length,initial.scope.length);assert(sampleRows.flatMap(p=>p.ledger).length>12);
 assert(initial.scope.filter(p=>!p.ledger.length).every(p=>!p.responsible.length&&!p.departments.length));
 assert.equal(await page.locator('[data-pp-distribution="stage"]').count(),0);
 assert.equal(await page.locator('[data-pp-distribution]').count(),2);
 assert.equal(await page.locator('#pp-ai [role=tab]').count(),4);assert.equal(await page.locator('#pp-ai .pp-analysis-card').count(),1);
 // 四张卡片合并原灯色Tab及率卡；进行中项目包含绿灯，明细仍限红黄灯。
 const lights=page.locator('#pp-light-tabs'),tab=value=>lights.locator(`[data-pp-light-tab="${value}"]`);
 let current;
 assert.equal(await page.locator('.pp-rate,#pp-filter-light').count(),0);
 assert.equal(await lights.locator('button').count(),4);
 assert.deepEqual(await lights.locator('.pp-summary-label').allTextContents(),['进行中项目','高危红灯项目','红灯项目','黄灯项目']);
 assert(await lights.evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('#pp-overview').getBoundingClientRect().bottom));
 const assertCounts=async rows=>{
  const red=rows.filter(p=>p.status==='红灯').length,yellow=rows.filter(p=>p.status==='黄灯').length;
  for(const value of ['all','高危红灯','红灯','黄灯']){
   const count=value==='all'?rows.length:rows.filter(p=>value==='高危红灯'?p.status==='红灯'&&p.delay>15:p.status===value).length;
   assert.equal(await tab(value).locator('[data-pp-card-count]').innerText(),String(count));
   const numerator=value==='all'?red+yellow:count;
   assert.equal(await tab(value).locator('[data-pp-card-rate]').innerText(),rows.length?(numerator/rows.length*100).toFixed(1)+'%':'—');
  }
 };
 await assertCounts(initial.scope);
 for(const value of ['高危红灯','红灯','黄灯']){
  await tab(value).click();current=await snapshot();
  assert.deepEqual(current.state.light,[value]);assert.equal(current.state.link,null);assert.equal(current.state.page,1);
  const expected=detailScope.filter(p=>value==='高危红灯'?p.status==='红灯'&&p.delay>15:p.status===value);
  assert.deepEqual(current.filtered.map(p=>p.id).sort((a,b)=>a-b),expected.map(p=>p.id).sort((a,b)=>a-b));
  assert.equal(await tab(value).getAttribute('aria-pressed'),'true');await assertCounts(initial.scope);
  await tab(value).click();assert.deepEqual((await snapshot()).state.light,[]);assert.equal(await tab('all').getAttribute('aria-pressed'),'true');
 }
 await tab('高危红灯').click();
 const severe=(await snapshot()).filtered;
 assert((await page.locator('.pp-table tbody td:nth-child(2) [data-light]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))).every(value=>value==='高危红灯'));
 assert.equal(await page.locator('.pp-table tbody td[data-label="延期天数"] .pp-delay-high').count(),Math.min(10,severe.length));
 await page.keyboard.press('End');assert.deepEqual((await snapshot()).state.light,['黄灯']);
 await page.keyboard.press('ArrowLeft');assert.deepEqual((await snapshot()).state.light,['红灯']);
 await page.keyboard.press('Home');assert.deepEqual((await snapshot()).state.light,[]);
 assert.equal((await snapshot()).filtered.length,detailScope.length);assert.equal(await tab('all').locator('[data-pp-card-count]').innerText(),String(initial.scope.length));
 await page.locator('[data-pp-search]').fill(detailScope[0].name);
 const searched=(await snapshot()).filtered;await assertCounts(searched);
 await tab('红灯').click();await assertCounts(searched);
 await page.locator('[data-pp-search]').fill('没有匹配的项目');await assertCounts([]);
 await page.locator('[data-pp-reset]').click();assert.deepEqual((await snapshot()).state.light,[]);await assertCounts(initial.scope);
 // 高危红灯从红灯中拆分，四段互斥且总计100%；分组包含绿灯项目。
 assert.equal(await page.locator('.pp-distribution h3').innerText(),'进行中项目分布');
 for(const dimension of ['category','type']){
  await page.locator(`[data-pp-distribution="${dimension}"]`).click();
  const groups=page.locator(`.pp-distribution [data-pp-link="${dimension}"]`);
  for(let i=0;i<await groups.count();i++){
   const group=groups.nth(i),value=await group.getAttribute('data-value');
   const rows=initial.scope.filter(p=>p[dimension]===value);
   const high=rows.filter(p=>p.status==='红灯'&&p.delay>15).length;
   const counts=[high,rows.filter(p=>p.status==='红灯').length-high,...['黄灯','绿灯'].map(status=>rows.filter(p=>p.status===status).length)];
   assert.deepEqual(await group.locator('.pp-bar-line b').allTextContents(),counts.map(String));
   assert.equal(await group.locator('.pp-green').count(),1);
   const widths=await group.locator('.pp-track i').evaluateAll(els=>els.map(el=>parseFloat(el.style.width)));
   const total=counts.reduce((a,b)=>a+b,0);
   assert(Math.abs(widths.reduce((a,b)=>a+b,0)-(total?100:0))<0.001);
   widths.forEach((width,index)=>assert(Math.abs(width-(total?counts[index]/total*100:0))<0.001));
  }
  const greenProject=initial.scope.find(p=>p.status==='绿灯');assert(greenProject);
  const group=groups.filter({has:page.locator('.pp-bar-label',{hasText:greenProject[dimension]})});
  await group.click();current=await snapshot();assert.deepEqual(current.state[dimension],[greenProject[dimension]]);assert.deepEqual(await selectedScope(dimension),[greenProject[dimension]]);assert.equal(await group.getAttribute('aria-pressed'),'true');
  assert.equal(current.filtered.length,detailScope.filter(p=>p[dimension]===greenProject[dimension]&&['红灯','黄灯','绿灯'].includes(p.status)).length);
  assert(!current.filtered.some(p=>p.id===greenProject.id),'概览保留绿灯统计，分组下钻仍只列红黄灯项目');await group.click();
  current=await snapshot();assert.deepEqual(current.state[dimension],[],'再次点击当前单选项取消选择');
  assert.equal(current.filtered.length,detailScope.length,'取消后恢复该维度全部项目');
  assert.deepEqual(await selectedScope(dimension),['all']);
  assert.equal(await group.getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('.pp-distribution [data-pp-link][aria-pressed="true"]').count(),0);
  await group.click();assert.deepEqual((await snapshot()).state[dimension],[greenProject[dimension]]);
  const other=initial.scope.find(p=>p[dimension]!==greenProject[dimension])[dimension];
  await page.locator(`.pp-distribution [data-pp-link="${dimension}"][data-value="${other}"]`).click();
  current=await snapshot();assert.deepEqual(current.state[dimension],[other],'点击其他项替换当前项，不累加');
  assert(current.scope.every(p=>p[dimension]===other));
  assert.deepEqual(await selectedScope(dimension),[other]);
  assert.equal(await page.locator('.pp-distribution [data-pp-link][aria-pressed="true"]').count(),1);
  await page.locator('#pp-'+dimension+'-tabs [data-pp-'+dimension+'-tab="all"]').click();
 }
 assert.equal(await page.locator('.pp-stage-cascader').count(),0);
 const typeTabs=page.locator('#pp-type-tabs');
 await page.locator('[data-pp-distribution="type"]').click();
 await typeTabs.locator('[data-pp-type-tab="自研开发"]').click();await typeTabs.locator('[data-pp-type-tab="自选开发"]').click();
 assert((await snapshot()).scope.every(p=>['自研开发','自选开发'].includes(p.type)));
 assert.equal(await page.locator('[data-pp-distribution="type"]').getAttribute('aria-pressed'),'true');
 assert.deepEqual(await page.locator('.pp-distribution [aria-pressed="true"][data-pp-link]').evaluateAll(els=>els.map(el=>el.dataset.value)),['自研开发','自选开发']);
 for(const value of ['all','自研开发','自选开发','品质整改','产品迭代','研发创新'])assert.equal(await typeTabs.locator('[data-pp-type-tab="'+value+'"]>span').innerText(),String(value==='all'?detailScope.length:detailScope.filter(p=>p.type===value).length),'类型计数忽略自身多选');
 await page.locator('[data-pp-light-tab="红灯"]').click();
 const redCandidates=initial.scope.filter(p=>p.status==='红灯');
 for(const value of ['all','自研开发','自选开发','品质整改','产品迭代','研发创新'])assert.equal(await typeTabs.locator('[data-pp-type-tab="'+value+'"]>span').innerText(),String(value==='all'?redCandidates.length:redCandidates.filter(p=>p.type===value).length),'类型计数保留灯色条件');
 const selectedBefore=(await snapshot()).state.type;await typeTabs.locator('[data-pp-type-tab="all"]').focus();await page.keyboard.press('ArrowRight');assert.deepEqual((await snapshot()).state.type,selectedBefore,'多选类型方向键只移动焦点');
 await page.keyboard.press('Enter');assert.deepEqual((await snapshot()).state.type,['自选开发'],'Enter可取消当前类型');
 await typeTabs.locator('[data-pp-type-tab="all"]').click();await page.locator('[data-pp-light-tab="all"]').click();await page.keyboard.press('Escape');
 await page.locator('[data-pp-distribution="category"]').click();
 assert(await page.locator('[data-pp-link="category"]').count()>0);
 await page.locator('[data-pp-distribution="type"]').click();
 const riskMenu=page.locator('#pp-filters .pf-multi').filter({has:page.locator('#pp-filter-riskLight')});
 assert.equal(await riskMenu.locator('.unified-field-name').innerText(),'风险单红绿灯');assert.equal(await riskMenu.locator('.pf-multi-value').innerText(),'全部');
 assert.deepEqual(await page.locator('#pp-filter-riskLight option').allTextContents(),['全部','红灯','黄灯']);
 const riskMatch=(p,department,lights)=>p.ledger.some(r=>r.status!=='已闭环'&&lights.includes(r.light)&&(Array.isArray(r.department)?r.department:[r.department]).includes(department));
 for(const dimension of ['type','category']){
  await page.locator('[data-pp-reset]').click();await page.locator(`[data-pp-dept-dimension="${dimension}"]`).click();await page.locator('[data-pp-risk-department="产品中心"]').click();
  const keys=[...new Set(initial.scope.map(p=>p[dimension]))],key=keys.find(key=>['红灯','黄灯'].every(light=>initial.scope.some(p=>p[dimension]===key&&riskMatch(p,'产品中心',[light]))));assert(key);
  const row=page.locator('.pp-dept-risk-row').filter({has:page.locator(`.pp-bar-label[data-value="${key}"]`)});
  for(const light of ['红灯','黄灯']){
   await row.locator(`.pp-risk-segment[data-pp-risk-light="${light}"]`).click();current=await snapshot();
   assert.deepEqual(current.state.riskLight,[light]);assert.deepEqual(current.state.department,['产品中心']);assert.deepEqual(current.state[dimension],[key]);assert.equal(current.state.link,null);assert.equal(current.state.page,1);
   const expected=detailScope.filter(p=>p[dimension]===key&&riskMatch(p,'产品中心',[light]));assert(expected.length>0);assert.deepEqual(current.filtered.map(p=>p.id).sort((a,b)=>a-b),expected.map(p=>p.id).sort((a,b)=>a-b));
   assert.equal(await riskMenu.locator('.pf-multi-value').innerText(),light);
   for(const tableRow of await page.locator('[data-pp-row]').all()){
    const id=Number(await tableRow.getAttribute('data-pp-row')),project=current.filtered.find(p=>p.id===id);
    const records=project.ledger.filter(r=>r.status!=='已闭环'&&r.light===light&&(Array.isArray(r.department)?r.department:[r.department]).includes('产品中心'));
    assert.equal(await tableRow.locator('[data-pp-ledger] small').innerText(),'共 '+records.length+' 条 · 查看更多');
   }
   assert.equal(await row.locator(`.pp-risk-counts [data-pp-risk-light="${light}"]`).getAttribute('aria-pressed'),'true');
   await row.locator(`.pp-risk-counts [data-pp-risk-light="${light}"]`).click();current=await snapshot();
   assert.deepEqual(current.state.riskLight,[]);assert.deepEqual(current.state.department,[]);assert.deepEqual(current.state[dimension],[]);
   assert.equal(current.filtered.length,detailScope.length,'二次点击数字取消同色柱段选择，恢复该维度全部项目');
   assert.equal(await riskMenu.locator('.pf-multi-value').innerText(),'全部');
   assert.equal(await row.locator(`.pp-risk-counts [data-pp-risk-light="${light}"]`).getAttribute('aria-pressed'),'false');
   await row.locator(`.pp-risk-counts [data-pp-risk-light="${light}"]`).click();assert.deepEqual((await snapshot()).state.riskLight,[light]);
   await row.locator(`.pp-risk-segment[data-pp-risk-light="${light}"]`).click();assert.deepEqual((await snapshot()).state.riskLight,[],'再次点击柱段也可取消');
  }
  await row.locator('.pp-bar-label').click();current=await snapshot();assert.deepEqual(current.state.riskLight,['红灯','黄灯']);assert(current.filtered.every(p=>riskMatch(p,'产品中心',['红灯','黄灯'])));
  await row.locator('.pp-bar-label').click();current=await snapshot();assert.deepEqual(current.state.riskLight,[]);
  assert.deepEqual(current.state[dimension],[]);assert.deepEqual(current.state.department,[]);assert.equal(current.filtered.length,detailScope.length);
  assert.equal(await page.locator('.pp-departments .pp-dept-risk-row.selected').count(),0);
 }
 await page.locator('[data-pp-reset]').click();assert.deepEqual((await snapshot()).state.riskLight,[]);assert.deepEqual((await snapshot()).state.department,[]);assert.equal((await snapshot()).state.riskDepartment,'全部');
 await riskMenu.locator('summary').click();assert.equal(await riskMenu.locator('input[value="绿灯"]').count(),0);await page.keyboard.press('Escape');

 // 截图回归：3条黄灯属于2个项目，不得把其他灯色及已闭环记录计入条数。
 await page.locator('[data-pp-reset]').click();
 await page.locator('[data-pp-distribution="type"]').click();
 await page.locator('.pp-distribution [data-pp-link="type"][data-value="自研开发"]').click();
 await page.locator('[data-pp-dept-dimension="type"]').click();
 const yellowCount=page.locator('.pp-departments .pp-risk-counts [data-value="自研开发"][data-pp-risk-light="黄灯"]');
 const selectedCount=Number(await yellowCount.innerText());await yellowCount.click();current=await snapshot();
 assert.equal(selectedCount,3);assert.equal(current.filtered.length,2);
 let riskTotal=0;
 for(const tableRow of await page.locator('[data-pp-row]').all()){
  const id=Number(await tableRow.getAttribute('data-pp-row')),project=current.filtered.find(p=>p.id===id);
  const records=project.ledger.filter(r=>r.status!=='已闭环'&&r.light==='黄灯');riskTotal+=records.length;
  const trigger=tableRow.locator('[data-pp-ledger]');assert.equal(await trigger.locator('small').innerText(),'共 '+records.length+' 条 · 查看更多');
  assert.equal(await trigger.locator('.pp-wrap').innerText(),[...new Set(records.map(r=>r.rootCause||r.description).filter(Boolean))].join('；'));
  await trigger.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));await trigger.click();
  const popup=page.locator('#pp-ledger-popover');await popup.waitFor({state:'visible'});
  assert.equal(await popup.locator('tbody tr').count(),records.length);
  assert((await popup.locator('tbody td:nth-child(3) [data-light]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))).every(value=>value==='黄灯'));
  await page.keyboard.press('Escape');
 }
 assert.equal(riskTotal,selectedCount);
 await page.locator('[data-pp-reset]').click();
 const query=detailScope[0].name;await page.locator('[data-pp-search]').fill(query);
 assert((await snapshot()).filtered.every(p=>p.name.includes(query)));await page.locator('[data-pp-reset]').click();
 const search=page.getByRole('searchbox',{name:'搜索项目名称/根因分析/责任链主',exact:true});
 assert.equal(await page.locator('#pp-filters input[type="search"]').count(),1);
 assert.equal(await page.locator('#projects>.sectionhead [data-pp-filter]').count(),0);
 assert.equal(await page.locator('#pp-filters #pp-filter-type').count(),0);assert.equal(await page.locator('#pp-type-tabs button').count(),6);
 const visibleRisks=p=>p.ledger.filter(r=>['红灯','黄灯'].includes(r.light));
 const searchSample=detailScope.find(p=>visibleRisks(p).some(r=>r.owner&&r.rootCause)),searchRisk=visibleRisks(searchSample).find(r=>r.owner&&r.rootCause);
 for(const term of [searchSample.name,searchRisk.rootCause,searchRisk.owner]){
  await search.fill(' '+term.toLowerCase()+' ');current=await snapshot();
  const expected=detailScope.filter(p=>[p.name,...visibleRisks(p).flatMap(r=>[r.rootCause||r.description,r.owner])].some(v=>String(v||'').toLowerCase().includes(term.toLowerCase())));
  assert(expected.length>0);assert.deepEqual(current.filtered.map(p=>p.id).sort((a,b)=>a-b),expected.map(p=>p.id).sort((a,b)=>a-b));
  assert.equal(current.state.page,1);
 }
 await search.fill('没有匹配的综合查询');assert.equal((await snapshot()).filtered.length,0);
 await page.locator('[data-pp-reset]').click();assert.equal(await search.inputValue(),'');
 assert.equal((await snapshot()).filtered.length,detailScope.length);
 await page.getByRole('button',{name:'计划上市日期筛选',exact:true}).click();
 await page.locator('[data-pp-plan-mode="quarter"]').click();await page.locator('[data-pp-plan-value="3"]').click();
 current=await snapshot();assert.equal(current.state.plan.value,3);
 assert(current.filtered.every(p=>p.plan>=current.state.plan.year+'-07-01'&&p.plan<=current.state.plan.year+'-09-30'));
 await page.locator('[data-pp-plan-clear="plan"]').click();
 // 立项日期与计划日期独立保存，并共同限定结果。
 const startedSample=detailScope.find(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.started));
 const [startedYear,startedMonth]=startedSample.started.split('-').map(Number);
 for(const [mode,value] of [['year',startedYear],['quarter',Math.ceil(startedMonth/3)],['month',startedMonth]]){
  await page.getByRole('button',{name:'立项日期筛选',exact:true}).click();
  const panel=page.locator('#pp-started-panel');
  await panel.locator(`[data-pp-plan-mode="${mode}"]`).click();
  await panel.locator(`[data-pp-plan-value="${value}"]`).click();
  current=await snapshot();assert.equal(current.state.started.mode,mode);
  const matches=p=>{if(!p.started)return false;const [y,m]=p.started.split('-').map(Number);return y===startedYear&&(mode==='year'||(mode==='quarter'?Math.ceil(m/3)===value:m===value))};
  assert.deepEqual(current.filtered.map(p=>p.id).sort((a,b)=>a-b),detailScope.filter(matches).map(p=>p.id).sort((a,b)=>a-b));
  assert(current.filtered.length>0);assert.equal(current.state.plan,null);
 }
 await page.getByRole('button',{name:'计划上市日期筛选',exact:true}).click();
 await page.locator('#pp-plan-panel [data-pp-plan-mode="quarter"]').click();
 await page.locator('#pp-plan-panel [data-pp-plan-value="3"]').click();
 current=await snapshot();const savedPlan=current.state.plan;
 const startedPrefix=startedYear+'-'+String(startedMonth).padStart(2,'0');
 assert.equal(current.filtered.length,detailScope.filter(p=>p.started?.startsWith(startedPrefix)&&p.plan>=savedPlan.year+'-07-01'&&p.plan<=savedPlan.year+'-09-30').length);
 await page.getByRole('button',{name:'清空立项日期',exact:true}).click();
 current=await snapshot();assert.equal(current.state.started,null);assert.deepEqual(current.state.plan,savedPlan);
 await page.getByRole('button',{name:'立项日期筛选',exact:true}).click();
 await page.locator('#pp-started-panel [data-pp-plan-value="'+startedYear+'"]').click();
 await page.locator('[data-pp-reset]').click();
 current=await snapshot();assert.equal(current.state.plan,null);assert.equal(current.state.started,null);assert.equal(current.filtered.length,detailScope.length);
 // 搜索仅匹配名称，编码不可命中；项目类型展示在名称下方。
 await page.locator('[data-pp-search]').fill('XM-010');assert.equal((await snapshot()).filtered.length,0);
 const sample=initial.scope.find(p=>p.sourceKey==='XM-010');
 await page.locator('[data-pp-search]').fill(sample.name);
 assert.equal(await page.locator('.pp-product small').first().innerText(),sample.type);
 const trigger=page.locator('[data-pp-ledger]').first(),popover=page.locator('#pp-ledger-popover');
 await trigger.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));
 await page.mouse.move(0,0);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await trigger.hover();await popover.waitFor({state:'visible'});
 assert.equal(await popover.locator('th').count(),9);
 assert.equal(await popover.locator('th').nth(5).innerText(),'根因分析');
 assert.equal(await popover.locator('th').nth(1).innerText(),'任务名称');
 assert.deepEqual(await popover.locator('tbody tr').first().locator('.pp-task-name').allTextContents(),['产品预估报价','产品供应商确认落地']);
 assert(sample.ledger.every(r=>Array.isArray(r.taskNames)&&r.taskNames.length));
 assert.doesNotMatch(await popover.innerText(),/演示台账/);
 assert.match(await popover.innerText(),/首批订单报价尚未确认/);
 assert.equal(await popover.locator('tbody tr').count(),visibleRisks(sample).length);
 assert.equal(await popover.locator('th').nth(2).innerText(),'风险单红绿灯');
 assert.deepEqual(await popover.locator('tbody tr td:nth-child(3) [data-light]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label'))),visibleRisks(sample).map(r=>r.light));
 assert.equal(await page.locator('.pp-ledger-row').count(),0);
 await popover.locator('h4').hover();assert(await popover.isVisible());
 const box=await popover.boundingBox(),viewport=await page.evaluate(()=>({width:document.documentElement.clientWidth,height:document.documentElement.clientHeight}));assert(box.x>=12&&box.x+box.width<=viewport.width-11&&box.y>=12&&box.y+box.height<=viewport.height-11,'台账悬浮层完整位于可见区域内（扣除页面滚动条）');
 await page.keyboard.press('Escape');await popover.waitFor({state:'hidden'});
 await trigger.focus();await popover.waitFor({state:'visible'});
 await page.keyboard.press('Escape');await popover.waitFor({state:'hidden'});
 await page.locator('[data-pp-reset]').click();
 const first=await page.locator('[data-pp-row]').first().getAttribute('data-pp-row');
 await page.locator('[data-pp-page="2"]').first().click();assert.notEqual(await page.locator('[data-pp-row]').first().getAttribute('data-pp-row'),first);
 await page.locator('[data-pp-reset]').click();
 const alignment=await page.locator('#pp-layout').evaluate(el=>{const cards=[...el.querySelectorAll('#pp-overview>.pp-card')].map(e=>e.getBoundingClientRect()),list=el.querySelector('.pp-main-table').getBoundingClientRect(),overview=el.querySelector('#pp-overview').getBoundingClientRect();return {aligned:cards.length===2&&cards.every(r=>Math.abs(r.top-cards[0].top)<2&&Math.abs(r.bottom-cards[0].bottom)<2&&Math.abs(r.width-cards[0].width)<2),below:list.top>=overview.bottom,full:Math.abs(list.width-overview.width)<2}});assert(alignment.aligned&&alignment.below&&alignment.full,'概览两图各占一半且等高、主表在下方全宽展示');
 await page.locator('#pp-table-scroll').evaluate(el=>el.scrollLeft=0);await page.locator('a[href="#projects"]').click();
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/project-panorama-desktop.png',import.meta.url))});
 for(const width of [1280,900,600,390]){await page.setViewportSize({width,height:1000});assert(await page.locator('#pp-layout').evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1),'项目布局不溢出屏幕');assert(await page.locator('.pp-departments').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'责任部门风险柱图不溢出卡片');}
 // 首屏只露出六行半，其余行在表内滚动；表头在内部滚动时固定。
 for(const width of [1920,1280,900,390]){
  await page.setViewportSize({width,height:1080});
  const host=page.locator('#pp-table-scroll');await host.evaluate(el=>el.scrollTop=0);
  await page.waitForFunction(()=>{const host=document.querySelector('#pp-table-scroll'),row=host.querySelector('tbody tr:nth-child(7)');if(!row)return false;const r=row.getBoundingClientRect(),h=host.getBoundingClientRect();return Math.abs((h.top+host.clientTop+host.clientHeight-r.top)/r.height-.5)<.03});
  assert(await host.evaluate(el=>el.scrollHeight>el.clientHeight),'主表存在内部纵向滚动');
  await host.evaluate(el=>el.scrollTop=el.scrollHeight);
  assert(await host.evaluate(el=>Math.abs(el.querySelector('thead').getBoundingClientRect().top-el.getBoundingClientRect().top-el.clientTop)<2),'主表表头固定');
  await host.evaluate(el=>el.scrollTop=0);
 }
 await page.setViewportSize({width:1920,height:1080});
 // 同源采购组件使用独立克隆，不能带入主管看板的筛选及新版DOM。
 await page.locator('#chain-menu-trigger').click();await page.locator('#chain-menu').getByRole('menuitem',{name:'采购部',exact:true}).click();
 assert.equal(await page.locator('#pb-projects .pp-layout').count(),0);
 assert(await page.locator('#pdp-projecttable tbody tr').count()>0);
 await page.locator('#chain-menu-trigger').click();await page.locator('#chain-menu').getByRole('menuitem',{name:'总看板',exact:true}).click();
 await page.locator('#projects #pp-layout').waitFor({state:'attached',timeout:30000});
 assert.equal(await page.locator('#projects #pp-layout').count(),1);
 assert.equal((await snapshot()).filtered.length,detailScope.length);
}
