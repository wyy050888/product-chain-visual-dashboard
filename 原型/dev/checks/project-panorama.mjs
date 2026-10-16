import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import vm from 'node:vm';
export async function projectPanorama(page){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/01-model.js',import.meta.url),'utf8'),ctx);
 const crossRisk={ledger:[{department:'产品部',light:'红灯'},{department:'采购部',light:'黄灯'},{department:'采购部',light:'红灯',status:'已闭环'}]};
 assert.equal(ctx.ppMatchesRisk(crossRisk,{department:['采购部'],riskLight:['红灯']}),false,'部门和灯色不能跨风险单匹配，也不能命中已闭环记录');
 assert.equal(ctx.ppMatchesRisk(crossRisk,{department:['产品部'],riskLight:['红灯']}),true);
 assert.equal(ctx.ppMatchesRisk(crossRisk,{department:['采购部'],riskLight:['黄灯']}),true);
 assert.deepEqual(Array.from(ctx.ppSelectedRisks(crossRisk,{department:['采购部'],riskLight:['黄灯']}),r=>r.light),['黄灯']);
 assert.equal(ctx.ppSelectedRisks(crossRisk,{department:[],riskLight:[]}).length,3,'没有风险条件时保留完整台账');

 await page.locator('a[href="#projects"]').click();
 const snapshot=()=>page.evaluate(()=>window.projectPanoramaAudit());
 const initial=await snapshot();assert(initial.scope.length>0);
 assert.equal(await page.locator('#projects>.sectionhead #pp-filter-category,#pp-scope').count(),0);
 const categoryMenu=page.locator('#pp-filters .pf-multi').filter({has:page.locator('#pp-filter-category')});
 assert.equal(await categoryMenu.locator('.unified-field-name').innerText(),'类目');assert.equal(await categoryMenu.locator('.pf-multi-value').innerText(),'全部');
 assert.deepEqual(await page.locator('#pp-filters .pp-filter-row').evaluate(e=>[...e.children].slice(0,3).map(child=>child.querySelector('select')?.dataset.ppFilter||'search')),['search','category','type']);
 await categoryMenu.locator('summary').click();await categoryMenu.locator('input[value="清洁类"]').check();await page.keyboard.press('Escape');
 assert((await snapshot()).scope.every(p=>p.category==='清洁类'));
 await page.locator('[data-pp-reset]').click();assert.deepEqual((await snapshot()).state.category,[]);assert.equal(await categoryMenu.locator('.pf-multi-value').innerText(),'全部');

 // 首屏演示由固定排期产生，仍按有效计划日期排序，不能靠错配灯色凑展示。
 const demo=initial.filtered.slice(0,10),light=p=>p.status==='红灯'&&p.delay>15?'高危':p.status;
 assert.deepEqual([...new Set(demo.slice(0,4).map(light))].sort(),['高危','红灯','黄灯','绿灯'].sort());
 assert([1,3,6,9,16,20].every(days=>demo.some(p=>p.delay===days)));
 assert(demo.some(p=>p.revisedPlan)&&demo.some(p=>!p.revisedPlan));
 assert(demo.every(p=>p.delay===Math.max(0,Math.round((Date.parse(initial.cutoff)-Date.parse(p.plan))/86400000))));
 assert(demo.every((p,i)=>!i||[demo[i-1].plan,demo[i-1].revisedPlan].filter(Boolean).sort().at(-1)<=[p.plan,p.revisedPlan].filter(Boolean).sort().at(-1)));

 assert.deepEqual(initial.state.projectState,['进行中']);assert(initial.scope.every(p=>p.projectState==='进行中'));
 assert(initial.scope.filter(p=>!p.actual&&p.delay>0).every(p=>p.status==='红灯'),'未上线且延期的项目不能显示绿灯或黄灯');
 const stateMenu=page.locator('.pf-multi').filter({has:page.locator('#pp-filter-projectState')});
 assert.deepEqual(await page.locator('#pp-filter-projectState option').allTextContents(),['全部','进行中','已完成','已暂停/取消','未开始']);
 await stateMenu.locator('summary').click();await stateMenu.locator('input[value="all"]').check();
 const allStates=await snapshot();assert(allStates.scope.length>=initial.scope.length);
 assert.equal((await page.locator('.pp-distribution .pp-bar-line b').allTextContents()).reduce((n,v)=>n+Number(v),0),initial.scope.length,'选择全部状态时分布仍只统计进行中项目');
 for(const state of ['已完成','已暂停/取消','未开始']){
  await stateMenu.locator('input[value="all"]').check();await stateMenu.locator(`input[value="${state}"]`).check();
  const result=await snapshot();assert.deepEqual(result.state.projectState,[state]);
  assert.equal(result.filtered.length,allStates.scope.filter(p=>p.projectState===state).length);
  assert.equal(await page.locator('.pp-rate [data-value="高危红灯"] b').innerText(),'—','没有进行中项目时不显示虚假百分比');
 }
 await page.keyboard.press('Escape');await page.locator('[data-pp-reset]').click();
 assert.deepEqual((await snapshot()).state.projectState,['进行中']);
 assert.equal(await page.locator('.pp-table thead th').nth(2).innerText(),'项目状态');
 assert.equal(await page.locator('.pp-table tbody tr').first().locator('td').nth(2).innerText(),'进行中');
 assert.equal(await page.locator('.pp-table>thead th').count(),17);
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
 assert.equal(await page.locator('#pp-ai .pp-ai-grid>article').count(),4);
 // 各灯色率共用进行中项目分母；高危是红灯子集，卡片点击可筛选并取消。
 const highCount=initial.scope.filter(p=>p.status==='红灯'&&p.delay>15).length;
 for(const [value,count] of [['高危红灯',highCount],['红灯',initial.scope.filter(p=>p.status==='红灯').length],['黄灯',initial.scope.filter(p=>p.status==='黄灯').length]]){
  const card=page.locator(`.pp-rate [data-value="${value}"]`);
  assert.equal(await card.locator('b').innerText(),(count/initial.scope.length*100).toFixed(1)+'%');
  assert.equal(await card.locator('small').innerText(),count+' 个项目');
 }
 const highCard=page.locator('.pp-rate [data-value="高危红灯"]');
 await highCard.click();let highResult=await snapshot();
 assert.equal(highResult.filtered.length,highCount);assert(highResult.filtered.every(p=>p.status==='红灯'&&p.delay>15));
 assert.equal(highResult.scope.length,initial.scope.length);await highCard.click();
 assert.equal((await snapshot()).filtered.length,initial.scope.length);
 const combined=page.locator('[data-pp-link="light"][data-value="红黄灯"]');
 assert.equal(await combined.locator('span').first().innerText(),'红黄灯合计');
 await combined.click();let current=await snapshot();
 assert.equal(current.scope.length,initial.scope.length,'图表联动不改变概览分母');
 assert.equal(current.filtered.length,initial.scope.filter(p=>['红灯','黄灯'].includes(p.status)).length);
 await combined.click();assert.equal((await snapshot()).filtered.length,initial.scope.length);
 const red=page.locator('[data-pp-link="light"][data-value="红灯"]');await red.click();
 assert((await snapshot()).filtered.every(p=>p.status==='红灯'));await red.click();
 // 卡片与灯色下拉双向同步；多选期间菜单保持打开，概览分母不受影响。
 const lights=page.locator('.pf-multi').filter({has:page.locator('#pp-filter-light')});
 for(const [value,expected] of [['红黄灯',['高危红灯','红灯','黄灯']],['高危红灯',['高危红灯']],['红灯',['红灯']],['黄灯',['黄灯']]]){
  const card=page.locator(`[data-pp-link="light"][data-value="${value}"]`);
  await card.click();current=await snapshot();assert.deepEqual(current.state.light,expected);assert.equal(current.state.link,null);
  assert.deepEqual(await page.locator('#pp-filter-light').evaluate(el=>Array.from(el.selectedOptions,o=>o.value)),expected);
  assert.equal(await card.getAttribute('aria-pressed'),'true');assert.equal(current.scope.length,initial.scope.length);
  assert.equal(current.filtered.length,initial.scope.filter(p=>expected.some(v=>v==='高危红灯'?p.status==='红灯'&&p.delay>15:p.status===v)).length);
  await card.click();assert.deepEqual((await snapshot()).state.light,[]);
 }
 await lights.locator('summary').click();await lights.locator('input[value="红灯"]').check();
 assert.equal(await red.getAttribute('aria-pressed'),'true');
 await lights.locator('input[value="黄灯"]').check();assert.equal(await combined.getAttribute('aria-pressed'),'true');
 assert.equal(await red.getAttribute('aria-pressed'),'false');
 await lights.locator('input[value="all"]').check();assert.equal(await page.locator('.pp-rate [aria-pressed="true"]').count(),0);
 await lights.locator('input[value="绿灯"]').check();assert.equal(await page.locator('.pp-rate [aria-pressed="true"]').count(),0);
 assert((await snapshot()).filtered.every(p=>p.status==='绿灯'));
 await page.keyboard.press('Escape');await page.locator('[data-pp-reset]').click();assert.deepEqual((await snapshot()).state.light,[]);
 // 高危筛选与其他灯色取并集，不重复计数；红灯仍包含高危子集。
 await lights.locator('summary').click();await lights.locator('input[value="高危红灯"]').check();
 let severe=(await snapshot()).filtered;assert(severe.length>0);assert(severe.every(p=>p.status==='红灯'&&p.delay>15));
 assert.equal(severe.length,initial.scope.filter(p=>p.status==='红灯'&&p.delay>15).length);
 assert((await page.locator('.pp-table tbody td:nth-child(2)').allTextContents()).every(v=>v.includes('高危红灯')));
 assert.equal(await page.locator('.pp-table tbody td:nth-child(6) .pp-delay-high').count(),Math.min(10,severe.length));
 await lights.locator('input[value="黄灯"]').check();
 assert.equal((await snapshot()).filtered.length,initial.scope.filter(p=>p.status==='黄灯'||(p.status==='红灯'&&p.delay>15)).length);
 await lights.locator('input[value="红灯"]').check();
 assert.equal((await snapshot()).filtered.length,initial.scope.filter(p=>['红灯','黄灯'].includes(p.status)).length);
 await page.keyboard.press('Escape');await page.locator('[data-pp-reset]').click();
 // 高危红灯从红灯中拆分，四段互斥且总计100%；分组包含绿灯项目。
 assert.equal(await page.locator('.pp-distribution h3').innerText(),'进行中项目红绿灯分布');
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
  await group.click();current=await snapshot();assert.deepEqual(current.state[dimension],[greenProject[dimension]]);assert.deepEqual(await page.locator('#pp-filter-'+dimension).evaluate(el=>Array.from(el.selectedOptions,o=>o.value)),[greenProject[dimension]]);assert.equal(await group.getAttribute('aria-pressed'),'true');
  assert.equal(current.filtered.length,initial.scope.filter(p=>p[dimension]===greenProject[dimension]&&['红灯','黄灯','绿灯'].includes(p.status)).length);
  assert(current.filtered.some(p=>p.id===greenProject.id));await group.click();
  current=await snapshot();assert.deepEqual(current.state[dimension],[],'再次点击当前单选项取消选择');
  assert.equal(current.filtered.length,initial.scope.length,'取消后恢复该维度全部项目');
  assert.deepEqual(await page.locator('#pp-filter-'+dimension).evaluate(el=>Array.from(el.selectedOptions,o=>o.value)),['all']);
  assert.equal(await group.getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('.pp-distribution [data-pp-link][aria-pressed="true"]').count(),0);
  await group.click();assert.deepEqual((await snapshot()).state[dimension],[greenProject[dimension]]);
  const other=initial.scope.find(p=>p[dimension]!==greenProject[dimension])[dimension];
  await page.locator(`.pp-distribution [data-pp-link="${dimension}"][data-value="${other}"]`).click();
  current=await snapshot();assert.deepEqual(current.state[dimension],[other],'点击其他项替换当前项，不累加');
  assert(current.scope.every(p=>p[dimension]===other));
  assert.deepEqual(await page.locator('#pp-filter-'+dimension).evaluate(el=>Array.from(el.selectedOptions,o=>o.value)),[other]);
  assert.equal(await page.locator('.pp-distribution [data-pp-link][aria-pressed="true"]').count(),1);
  const menu=page.locator('.pf-multi').filter({has:page.locator('#pp-filter-'+dimension)});
  await menu.locator('summary').click();await menu.locator('input[value="all"]').check();await page.keyboard.press('Escape');
 }
 // 同名阶段必须同时匹配所属类型，多选后取并集。
 const stageMenu=page.locator('.pp-stage-cascader');
 await stageMenu.locator('summary').click();
 await stageMenu.locator('[data-pp-stage-branch="自研开发"]').click();
 await stageMenu.getByRole('checkbox',{name:'自研开发 / 首批上线期',exact:true}).check();
 current=await snapshot();assert(current.filtered.length>0);
 assert(current.filtered.every(p=>p.type==='自研开发'&&p.stages.includes('首批上线期')));
 await stageMenu.locator('[data-pp-stage-branch="自选开发"]').click();
 await stageMenu.getByRole('checkbox',{name:'自选开发 / 首批上线期',exact:true}).check();
 current=await snapshot();assert.equal(current.state.stage.length,2);
 assert.equal(current.filtered.length,initial.scope.filter(p=>['自研开发','自选开发'].includes(p.type)&&p.stages.includes('首批上线期')).length);
 await stageMenu.locator('[data-pp-stage-clear]').click();assert.equal((await snapshot()).filtered.length,initial.scope.length);
 await page.keyboard.press('Escape');assert.equal(await stageMenu.getAttribute('open'),null);
 const typeMenu=page.locator('#pp-filters .pf-multi').filter({has:page.locator('#pp-filter-type')});
 await typeMenu.locator('summary').click();await typeMenu.locator('input[value="自研开发"]').check();await typeMenu.locator('input[value="自选开发"]').check();
 assert((await snapshot()).scope.every(p=>['自研开发','自选开发'].includes(p.type)));
 assert.equal(await page.locator('[data-pp-distribution="type"]').getAttribute('aria-pressed'),'true');
 assert.deepEqual(await page.locator('.pp-distribution [aria-pressed="true"][data-pp-link]').evaluateAll(els=>els.map(el=>el.dataset.value)),['自研开发','自选开发']);
 assert.equal(await stageMenu.locator('[data-pp-stage-branch]').count(),2);
 await typeMenu.locator('input[value="all"]').check();await page.keyboard.press('Escape');
 await page.locator('[data-pp-distribution="category"]').click();
 assert(await page.locator('[data-pp-link="category"]').count()>0);
 await page.locator('[data-pp-distribution="type"]').click();
 const riskMenu=page.locator('#pp-filters .pf-multi').filter({has:page.locator('#pp-filter-riskLight')});
 assert.equal(await riskMenu.locator('.unified-field-name').innerText(),'风险单红绿灯');assert.equal(await riskMenu.locator('.pf-multi-value').innerText(),'全部');
 assert.deepEqual(await page.locator('#pp-filter-riskLight option').allTextContents(),['全部','红灯','黄灯','绿灯']);
 const riskMatch=(p,department,lights)=>p.ledger.some(r=>r.status!=='已闭环'&&lights.includes(r.light)&&(Array.isArray(r.department)?r.department:[r.department]).includes(department));
 for(const dimension of ['type','category']){
  await page.locator('[data-pp-reset]').click();await page.locator(`[data-pp-dept-dimension="${dimension}"]`).click();await page.locator('[data-pp-risk-department="产品部"]').click();
  const keys=[...new Set(initial.scope.map(p=>p[dimension]))],key=keys.find(key=>['红灯','黄灯'].every(light=>initial.scope.some(p=>p[dimension]===key&&riskMatch(p,'产品部',[light]))));assert(key);
  const row=page.locator('.pp-dept-risk-row').filter({has:page.locator(`.pp-bar-label[data-value="${key}"]`)});
  for(const light of ['红灯','黄灯']){
   await row.locator(`.pp-risk-segment[data-pp-risk-light="${light}"]`).click();current=await snapshot();
   assert.deepEqual(current.state.riskLight,[light]);assert.deepEqual(current.state.department,['产品部']);assert.deepEqual(current.state[dimension],[key]);assert.equal(current.state.link,null);assert.equal(current.state.page,1);
   const expected=initial.scope.filter(p=>p[dimension]===key&&riskMatch(p,'产品部',[light]));assert(expected.length>0);assert.deepEqual(current.filtered.map(p=>p.id).sort((a,b)=>a-b),expected.map(p=>p.id).sort((a,b)=>a-b));
   assert.equal(await riskMenu.locator('.pf-multi-value').innerText(),light);
   for(const tableRow of await page.locator('[data-pp-row]').all()){
    const id=Number(await tableRow.getAttribute('data-pp-row')),project=current.filtered.find(p=>p.id===id);
    const records=project.ledger.filter(r=>r.status!=='已闭环'&&r.light===light&&(Array.isArray(r.department)?r.department:[r.department]).includes('产品部'));
    assert.equal(await tableRow.locator('[data-pp-ledger] small').innerText(),'共 '+records.length+' 条 · 查看更多');
   }
   assert.equal(await row.locator(`.pp-risk-counts [data-pp-risk-light="${light}"]`).getAttribute('aria-pressed'),'true');
   await row.locator(`.pp-risk-counts [data-pp-risk-light="${light}"]`).click();current=await snapshot();
   assert.deepEqual(current.state.riskLight,[]);assert.deepEqual(current.state.department,[]);assert.deepEqual(current.state[dimension],[]);
   assert.equal(current.filtered.length,initial.scope.length,'二次点击数字取消同色柱段选择，恢复该维度全部项目');
   assert.equal(await riskMenu.locator('.pf-multi-value').innerText(),'全部');
   assert.equal(await row.locator(`.pp-risk-counts [data-pp-risk-light="${light}"]`).getAttribute('aria-pressed'),'false');
   await row.locator(`.pp-risk-counts [data-pp-risk-light="${light}"]`).click();assert.deepEqual((await snapshot()).state.riskLight,[light]);
   await row.locator(`.pp-risk-segment[data-pp-risk-light="${light}"]`).click();assert.deepEqual((await snapshot()).state.riskLight,[],'再次点击柱段也可取消');
  }
  await row.locator('.pp-bar-label').click();current=await snapshot();assert.deepEqual(current.state.riskLight,['红灯','黄灯']);assert(current.filtered.every(p=>riskMatch(p,'产品部',['红灯','黄灯'])));
  await row.locator('.pp-bar-label').click();current=await snapshot();assert.deepEqual(current.state.riskLight,[]);
  assert.deepEqual(current.state[dimension],[]);assert.deepEqual(current.state.department,[]);assert.equal(current.filtered.length,initial.scope.length);
  assert.equal(await page.locator('.pp-departments .pp-dept-risk-row.selected').count(),0);
 }
 await page.locator('[data-pp-reset]').click();assert.deepEqual((await snapshot()).state.riskLight,[]);assert.deepEqual((await snapshot()).state.department,[]);assert.equal((await snapshot()).state.riskDepartment,'全部');
 await riskMenu.locator('summary').click();await riskMenu.locator('input[value="绿灯"]').check();current=await snapshot();assert.deepEqual(current.state.light,[]);assert(current.filtered.every(p=>p.ledger.some(r=>r.status!=='已闭环'&&r.light==='绿灯')));await page.keyboard.press('Escape');

 // 截图回归：3条黄灯属于2个项目，不得把其他灯色及已闭环记录计入条数。
 await page.locator('[data-pp-reset]').click();
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
  assert((await popup.locator('tbody td:nth-child(3)').allTextContents()).every(text=>text.includes('黄灯')));
  await page.keyboard.press('Escape');
 }
 assert.equal(riskTotal,selectedCount);
 await page.locator('[data-pp-reset]').click();
 const query=initial.scope[0].name;await page.locator('[data-pp-search]').fill(query);
 assert((await snapshot()).filtered.every(p=>p.name.includes(query)));await page.locator('[data-pp-reset]').click();
 const search=page.getByRole('searchbox',{name:'搜索项目名称/根因分析/责任链主',exact:true});
 assert.equal(await page.locator('#pp-filters input[type="search"]').count(),1);
 assert.equal(await page.locator('#projects>.sectionhead [data-pp-filter]').count(),0);
 assert.equal(await page.locator('#pp-filters #pp-filter-type').count(),1);
 const searchSample=initial.scope.find(p=>p.responsible.length&&p.ledger.some(r=>r.rootCause));
 for(const term of [searchSample.name,searchSample.ledger.find(r=>r.rootCause).rootCause,searchSample.responsible[0]]){
  await search.fill(' '+term.toLowerCase()+' ');current=await snapshot();
  const expected=initial.scope.filter(p=>[p.name,...p.ledger.map(r=>r.rootCause),...p.responsible].some(v=>String(v||'').toLowerCase().includes(term.toLowerCase())));
  assert(expected.length>0);assert.deepEqual(current.filtered.map(p=>p.id).sort((a,b)=>a-b),expected.map(p=>p.id).sort((a,b)=>a-b));
  assert.equal(current.state.page,1);
 }
 await search.fill('没有匹配的综合查询');assert.equal((await snapshot()).filtered.length,0);
 await page.locator('[data-pp-reset]').click();assert.equal(await search.inputValue(),'');
 assert.equal((await snapshot()).filtered.length,initial.scope.length);
 await page.getByRole('button',{name:'计划上线日期筛选',exact:true}).click();
 await page.locator('[data-pp-plan-mode="quarter"]').click();await page.locator('[data-pp-plan-value="3"]').click();
 current=await snapshot();assert.equal(current.state.plan.value,3);
 assert(current.filtered.every(p=>p.plan>=current.state.plan.year+'-07-01'&&p.plan<=current.state.plan.year+'-09-30'));
 await page.locator('[data-pp-plan-clear="plan"]').click();
 // 立项日期与计划日期独立保存，并共同限定结果。
 const startedSample=initial.scope.find(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.started));
 const [startedYear,startedMonth]=startedSample.started.split('-').map(Number);
 for(const [mode,value] of [['year',startedYear],['quarter',Math.ceil(startedMonth/3)],['month',startedMonth]]){
  await page.getByRole('button',{name:'立项日期筛选',exact:true}).click();
  const panel=page.locator('#pp-started-panel');
  await panel.locator(`[data-pp-plan-mode="${mode}"]`).click();
  await panel.locator(`[data-pp-plan-value="${value}"]`).click();
  current=await snapshot();assert.equal(current.state.started.mode,mode);
  const matches=p=>{if(!p.started)return false;const [y,m]=p.started.split('-').map(Number);return y===startedYear&&(mode==='year'||(mode==='quarter'?Math.ceil(m/3)===value:m===value))};
  assert.deepEqual(current.filtered.map(p=>p.id).sort((a,b)=>a-b),initial.scope.filter(matches).map(p=>p.id).sort((a,b)=>a-b));
  assert(current.filtered.length>0);assert.equal(current.state.plan,null);
 }
 await page.getByRole('button',{name:'计划上线日期筛选',exact:true}).click();
 await page.locator('#pp-plan-panel [data-pp-plan-mode="quarter"]').click();
 await page.locator('#pp-plan-panel [data-pp-plan-value="3"]').click();
 current=await snapshot();const savedPlan=current.state.plan;
 const startedPrefix=startedYear+'-'+String(startedMonth).padStart(2,'0');
 assert.equal(current.filtered.length,initial.scope.filter(p=>p.started?.startsWith(startedPrefix)&&p.plan>=savedPlan.year+'-07-01'&&p.plan<=savedPlan.year+'-09-30').length);
 await page.getByRole('button',{name:'清空立项日期',exact:true}).click();
 current=await snapshot();assert.equal(current.state.started,null);assert.deepEqual(current.state.plan,savedPlan);
 await page.getByRole('button',{name:'立项日期筛选',exact:true}).click();
 await page.locator('#pp-started-panel [data-pp-plan-value="'+startedYear+'"]').click();
 await page.locator('[data-pp-reset]').click();
 current=await snapshot();assert.equal(current.state.plan,null);assert.equal(current.state.started,null);assert.equal(current.filtered.length,initial.scope.length);
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
 assert.equal(await popover.locator('tbody tr').count(),sample.ledger.length);
 assert.equal(await popover.locator('th').nth(2).innerText(),'风险单红绿灯');
 assert.deepEqual((await popover.locator('tbody tr td:nth-child(3)').allTextContents()).map(text=>text.replace('●','').trim()),sample.ledger.map(r=>r.light));
 assert.equal(await page.locator('.pp-ledger-row').count(),0);
 await popover.locator('h4').hover();assert(await popover.isVisible());
 const box=await popover.boundingBox();assert(box.x>=0&&box.x+box.width<=1920);
 await page.keyboard.press('Escape');await popover.waitFor({state:'hidden'});
 await trigger.focus();await popover.waitFor({state:'visible'});
 await page.keyboard.press('Escape');await popover.waitFor({state:'hidden'});
 await page.locator('[data-pp-reset]').click();
 const first=await page.locator('[data-pp-row]').first().getAttribute('data-pp-row');
 await page.locator('[data-pp-page="2"]').first().click();assert.notEqual(await page.locator('[data-pp-row]').first().getAttribute('data-pp-row'),first);
 await page.locator('[data-pp-reset]').click();
 const alignment=await page.locator('#pp-layout').evaluate(el=>{const first=el.querySelector('#pp-overview>.pp-card:first-child').getBoundingClientRect(),last=el.querySelector('#pp-overview>.pp-card:last-child').getBoundingClientRect(),r=el.querySelector('.pp-main-table').getBoundingClientRect();return Math.abs(last.bottom-r.bottom)+Math.abs(first.top-r.top)});assert(alignment<2,'左侧实际卡片与右侧列表顶部、分页底部对齐');
 await page.locator('#pp-table-scroll').evaluate(el=>el.scrollLeft=0);await page.locator('a[href="#projects"]').click();
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/project-panorama-desktop.png',import.meta.url))});
 for(const width of [1280,900,600,390]){await page.setViewportSize({width,height:1000});assert(await page.locator('#pp-layout').evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1),'项目布局不溢出屏幕');assert(await page.locator('.pp-departments').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'责任部门风险柱图不溢出卡片');}
 await page.setViewportSize({width:1920,height:1080});
 // 同源采购组件使用独立克隆，不能带入主管看板的筛选及新版DOM。
 await page.locator('#chain-menu-trigger').click();await page.locator('#chain-menu').getByRole('menuitem',{name:'采购部',exact:true}).click();
 assert.equal(await page.locator('#pb-projects .pp-layout').count(),0);
 assert(await page.locator('#pdp-projecttable tbody tr').count()>0);
 await page.locator('#chain-menu-trigger').click();await page.locator('#chain-menu').getByRole('menuitem',{name:'总看板',exact:true}).click();
 assert.equal(await page.locator('#projects #pp-layout').count(),1);
 assert.equal((await snapshot()).filtered.length,initial.scope.length);
}
