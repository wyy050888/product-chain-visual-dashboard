import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import vm from 'node:vm';
export async function projectAnalysis(page){
 const ctx=vm.createContext({});ctx.window||={};vm.runInContext(fs.readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),ctx);for(const file of ['01-model','08-analysis-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/'+file+'.js',import.meta.url),'utf8'),ctx);
 const fixture=[{id:1,status:'绿灯',ledger:[{id:'a',light:'红灯',department:['产品中心','研发中心']},{id:'a',light:'红灯',department:['产品中心','研发中心']},{id:'b',light:'黄灯',department:'产品中心'},{id:'c',light:'红灯',department:'产品中心',status:'已闭环'},{id:'d',light:'红灯',department:'采购部'}]}];
 const share=ctx.ppAnalysisRiskShare(fixture,'产品中心');assert.equal(share.count,1);assert.equal(share.total,2);assert.equal(share.rate,'50.0%');assert.equal(ctx.ppAnalysisRiskShare([],'产品中心').rate,'—');
 const greenProject={id:2,status:'红灯',ledger:[{id:'green',light:'绿灯',department:'产品中心',status:'整改中'}]};
 assert.equal(ctx.ppSelectedRisks(greenProject,{riskLight:[],department:[]}).length,0,'上方项目明细继续隐藏绿灯风险');
 assert.equal(ctx.ppDepartmentFacts([greenProject],'产品中心',['红灯','黄灯','绿灯']).records.length,1,'下方部门台账恢复绿灯风险');
 const oldRisk={id:'legacy',department:['产品部','产品中心','研发部'],light:'红灯',status:'待整改'},oldProject={id:3,status:'红灯',ledger:[oldRisk]};
 assert.equal(ctx.ppSelectedRisks(oldProject,{department:['产品中心'],riskLight:['红灯']}).length,1,'旧名称映射后仍命中同一风险单');
 assert.equal(ctx.ppDepartmentFacts([oldProject],'产品中心').records.length,1,'别名与正式名称共存不重复计数');
 assert.equal(ctx.ppAnalysisRiskShare([oldProject],'研发中心').count,1,'跨部门旧名称兼容');
 assert.deepEqual(oldRisk.department,['产品部','产品中心','研发部'],'归一不改写原始台账');
 assert.equal(ctx.ppDepartmentFacts([{id:4,ledger:[{department:'项目部',light:'黄灯'}]}],'项目部').yellow.length,1,'项目部使用明确台账归属');
 // TOP3取部门全部台账：闭环、非红项目、多任务重复均覆盖。
 ctx.brcMatch=(_,delay)=>delay>15;
 const full=[
  {id:10,status:'绿灯',ledger:[{id:'closed',light:'绿灯',department:'产品中心',status:'已闭环',rootCause:'测试资源排期冲突'},{id:'closed',light:'绿灯',department:'产品中心',status:'已闭环',rootCause:'测试资源排期冲突'}]},
  {id:11,status:'黄灯',ledger:[{id:'yellow',light:'黄灯',department:'产品中心',status:'整改中',rootCause:'测试资源排期冲突'}]},
  {id:12,status:'红灯',delay:20,ledger:[{id:'red',light:'红灯',department:'产品中心',status:'整改中',rootCause:'测试资源排期冲突'},{id:'other',light:'红灯',department:'采购部',status:'整改中',rootCause:'测试资源排期冲突'}]}
 ];
 const allFacts=ctx.ppAnalysisDepartment(full,'产品中心');
 assert.equal(allFacts.records.length,3,'全部台账含已闭环、绿灯项目，并按项目+风险ID去重');
 assert.equal(allFacts.top[0].records.length,3);assert.equal(allFacts.top[0].projects.size,3);
 assert.equal(allFacts.red.length,1);assert.equal(allFacts.high.length,1,'高危/红灯指标仍按原口径');
 full[2].status='绿灯';full[2].ledger[0].status='已闭环';
 assert.equal(ctx.ppAnalysisDepartment(full,'产品中心').top[0].records.length,3,'闭环或项目转绿不移出根因候选');
 assert.equal(ctx.ppSelectedRisks(full[0],{department:['产品中心'],riskLight:[],allowedRiskLights:['红灯','黄灯','绿灯'],includeClosedRisks:true}).length,2,'部门分析搜索/筛选不漏掉闭环风险');
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('a[href="#projects"]').click();await page.locator('[data-pp-reset]').click();
 const audit=await page.evaluate(()=>projectPanoramaAudit()),rows=audit.scope;
 const cards=page.locator('#pp-ai .pp-analysis-card');assert.equal(await cards.count(),1);assert.deepEqual(await page.locator('#pp-ai [role=tab]').allTextContents(),['产品中心','项目部','品质中心','研发中心','采购部']);
 await page.locator('[data-pp-analysis-department="产品中心"]').press('End');assert.equal((await page.evaluate(()=>projectAnalysisAudit())).state.department,'采购部');
 await page.locator('[data-pp-analysis-department="采购部"]').press('ArrowRight');assert.equal((await page.evaluate(()=>projectAnalysisAudit())).state.department,'产品中心');
 await page.locator('[data-pp-analysis-department="产品中心"]').press('ArrowRight');assert.equal((await page.evaluate(()=>projectAnalysisAudit())).state.department,'项目部');
 await page.locator('[data-pp-analysis-department="项目部"]').press('Home');
 const help=page.locator('#pp-ai .pp-ai-heading .metric-help');assert.equal(await help.count(),1);
 await help.scrollIntoViewIfNeeded();await help.hover();await page.locator('#metric-tooltip').waitFor({state:'visible'});
 assert.match(await page.locator('#metric-tooltip').innerText(),/红灯项目[\s\S]*高危项目[\s\S]*＞15天[\s\S]*红灯风险占比[\s\S]*红灯风险单总数/);
 assert.equal(await page.locator('#metric-tooltip .pp-analysis-tip-metric').count(),3);
 assert.doesNotMatch(await page.locator('#metric-tooltip').innerText(),/按项目去重/);
 assert.deepEqual(await page.locator('#metric-tooltip .pp-analysis-tip-fraction>span').allTextContents(),['该部门红灯风险单数','红灯风险单总数']);
 assert.match(await page.locator('#metric-tooltip .pp-analysis-tip-formula').innerText(),/× 100%/);
 assert.equal(await page.locator('#metric-tooltip').evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');
 assert.doesNotMatch(await page.locator('#metric-tooltip').innerText(),/产品中心/);await page.keyboard.press('Escape');
 await help.focus();assert(await page.locator('#metric-tooltip').isVisible());await page.keyboard.press('Escape');await help.evaluate(e=>e.blur());
 assert.doesNotMatch(await page.locator('#pp-ai').innerText(),/演示|原型|规则汇总|未调用|样例/);
 const highTone=await page.locator('#pp-overview .pp-high').first().evaluate(el=>getComputedStyle(el).backgroundColor);
 for(const department of ['产品中心','项目部','品质中心','研发中心','采购部']){
  await page.locator(`[data-pp-analysis-department="${department}"]`).click();
  const card=page.locator(`[data-analysis-department="${department}"]`);
  assert.equal(await page.locator('#pp-ai [aria-selected=true]').innerText(),department);
  const visible=r=>['红灯','黄灯','绿灯'].includes(r.light)&&r.status!=='已闭环'&&(Array.isArray(r.department)?r.department:[r.department]).includes(department);
  const red=rows.filter(p=>p.status==='红灯'&&p.ledger.some(visible)),high=red.filter(p=>p.delay>15);
  const evidence=red.flatMap(p=>p.ledger.filter(visible)),allEvidence=rows.flatMap(p=>p.ledger.filter(r=>(Array.isArray(r.department)?r.department:[r.department]).includes(department)));
  assert.deepEqual(await card.locator('.pp-analysis-metrics strong').allTextContents(),[String(high.length),String(red.length),ctx.ppAnalysisRiskShare(rows,department).rate]);
  assert.deepEqual(await card.locator('.pp-analysis-metrics>button span').allTextContents(),['高危项目','红灯项目']);
  assert.equal(await card.locator('[data-mode="high"] strong').evaluate(el=>getComputedStyle(el).color),highTone,'高危指标与图表使用同一主题色');
  assert.equal(await card.locator('[data-mode="red"] strong').evaluate(el=>getComputedStyle(el).color),'rgb(240, 84, 110)');
  assert.doesNotMatch(await card.innerText(),/负责 \d+ 个项目|红灯项目占比/);
  for(const [mode,expected] of [['red',evidence.length],['high',evidence.filter(r=>high.some(p=>p.ledger.some(x=>x.id===r.id))).length],['all',allEvidence.length]]){
   await card.locator(`[data-mode="${mode}"]`).click();
   assert.equal((await page.evaluate(()=>projectAnalysisAudit())).records.length,expected);
   assert.equal(await page.locator('#pp-analysis-ledger-results tbody tr[data-risk-id]').count(),Math.min(expected,20));
   assert(await page.locator('#overlay').isHidden(),'切换范围直接联动内嵌台账');
   const table=page.locator('#pp-analysis-ledger-results');
   assert.equal(await table.locator('th').count(),20);
   if(mode==='all'&&expected){assert((await table.locator('th').allTextContents()).includes('项目任务'));assert.equal(await table.locator('.pp-task-name').count(),await page.evaluate(()=>projectAnalysisAudit().filteredRecords.slice(0,20).reduce((n,e)=>n+e.risk.taskNames.length,0)),'多个任务不增加风险单行数');}
   if(mode==='high'&&expected){const delays=await table.locator('tbody tr td[data-field=delay]').allTextContents();assert(delays.every(d=>parseInt(d)>15));}

  }
  const rootButtons=card.locator('.pp-root-item');assert((await rootButtons.count())<=3);
  let last=Infinity;
  for(let i=0;i<await rootButtons.count();i++){
   const button=rootButtons.nth(i),label=await button.locator('small').innerText(),count=Number(label.match(/(\d+) 条风险/)[1]);assert(count<=last);last=count;
   await button.click();assert.equal((await page.evaluate(()=>projectAnalysisAudit())).records.length,count);
   assert.equal(await page.locator('#pp-analysis-ledger-results tbody tr[data-risk-id]').count(),Math.min(count,20));
   assert(await page.locator('#overlay').isHidden(),'根因直接在右侧展示全部字段');
   assert.equal(await page.locator('#pp-ai .pp-analysis-ledger-head h4').innerText(),'风险台账 · '+await button.locator('b').innerText());
   assert.equal(await page.locator('#pp-ai .pp-analysis-conclusion').count(),0);
   if(await button.getAttribute('data-mode')==='decision'){
    const roots=await page.evaluate(()=>projectAnalysisAudit().records.map(entry=>entry.risk.rootCause));assert(roots.length>0);assert(roots.every(root=>['关键需求尚未达成一致','需求确认节点滞后'].includes(root)),'整组风险均来自该共性根因，不要求第一页包含所有原始措辞');
   }

  }
 }
 await cards.first().locator('[data-mode="red"]').click();
 assert.equal(await page.locator('[data-pp-analysis-full]').count(),0,'移除完整台账抽屉入口');
 const contents=await page.locator('#pp-analysis-ledger-results').innerText();
 await page.locator('#pp-analysis-ledger-results [data-pp-analysis-view]').first().click();
 assert.equal(await page.locator('#toast').innerText(),'点击跳转项目详情页-风险管理');
 assert.equal(await page.locator('#pp-analysis-ledger-results').innerText(),contents);
 assert(await page.locator('#overlay').isHidden(),'查看不再打开台账抽屉');
 const before=await cards.locator('.pp-analysis-metrics').allTextContents();
 await page.locator('[data-pp-light-tab="红灯"]').click();assert.deepEqual(await cards.locator('.pp-analysis-metrics').allTextContents(),before);
 await page.locator('[data-pp-reset]').click();
 await page.locator('[data-pp-search]').fill('没有匹配的项目');assert.equal(await page.locator('#pp-ai .pp-analysis-empty').count(),2);
 assert((await cards.locator('.pp-analysis-metrics strong').allTextContents()).every(v=>['0','—'].includes(v)));
 await cards.first().locator('[data-mode="all"]').click();assert.match(await page.locator('#pp-analysis-ledger-results').innerText(),/暂无相关记录/);
 await page.locator('[data-pp-reset]').click();
 // 台账翻页/排序/明细与既有记录一致；切部门回第1页，键盘可直接切换。
 await page.locator('[data-pp-analysis-department="产品中心"]').click();
 const ids=async()=>page.locator('#pp-analysis-ledger-results tr[data-risk-id]').evaluateAll(es=>es.map(e=>e.dataset.riskId));
 const verifyInline=async()=>{const data=await page.evaluate(()=>projectAnalysisAudit()),sorted=data.records.map((entry,index)=>({entry,index})).sort((a,b)=>{const av=a.entry.risk.deadline,bv=b.entry.risk.deadline;if(!av||!bv)return !av&&!bv?a.index-b.index:!av?1:-1;return av.localeCompare(bv)*(data.state.sort.direction==='asc'?1:-1)||a.index-b.index}).map(x=>x.entry);assert.deepEqual(await ids(),sorted.slice((data.state.page-1)*20,data.state.page*20).map(e=>String(e.risk.id)));};
 await verifyInline();
 await page.locator('[data-pp-analysis-sort="deadline"]').click();await verifyInline();
 await page.locator('.pp-analysis-pages [aria-label="下一页"]').click();assert.equal((await page.evaluate(()=>projectAnalysisAudit())).state.page,2);await verifyInline();assert(await page.locator('.pp-analysis-pages [aria-current="page"]').evaluate(el=>el===document.activeElement),'翻页后焦点跟随当前页');
 await page.locator('[data-pp-analysis-department="研发中心"]').click();assert.equal((await page.evaluate(()=>projectAnalysisAudit())).state.page,1);
 await page.locator('[data-pp-analysis-department="研发中心"]').press('ArrowRight');assert.equal((await page.evaluate(()=>projectAnalysisAudit())).state.department,'采购部');
 // 内嵌筛选作用于左侧已选范围；保持菜单/焦点，不改变部门事实。
 const form=page.locator('#pp-analysis-filters'),search=form.locator('input[type="search"]');
 const source=(await page.evaluate(()=>projectAnalysisAudit())).records,example=source[0];
 await search.fill(example.project.name);
 assert((await page.evaluate(()=>projectAnalysisAudit())).filteredRecords.every(e=>e.project.name.includes(example.project.name)));
 await search.fill('不存在的风险台账关键词');assert.equal((await page.evaluate(()=>projectAnalysisAudit())).filteredRecords.length,0);assert.match(await page.locator('#pp-analysis-ledger-results').innerText(),/暂无符合条件/);
 await form.locator('[data-pp-analysis-reset]').click();assert.equal((await page.evaluate(()=>projectAnalysisAudit())).filteredRecords.length,source.length);
 for(const key of ['light','rectificationStatus','verificationStatus']){
  const value=example.risk[key],menu=form.locator('.pf-multi').filter({has:page.locator('[name="'+key+'"]')});
  await menu.locator('summary').click();await menu.locator('input[value="'+value+'"]').check();
  assert.equal(await menu.getAttribute('open'),'');await page.keyboard.press('Escape');
  assert((await page.evaluate(()=>projectAnalysisAudit())).filteredRecords.every(e=>e.risk[key]===value));
 }
 await form.locator('[data-pp-analysis-reset]').click();
 assert.equal((await page.evaluate(()=>projectAnalysisAudit())).filteredRecords.length,source.length);
 const lightMenu=form.locator('.pf-multi').filter({has:page.locator('[name="light"]')});
 assert.equal(await lightMenu.locator('option[value="绿灯"]').count(),1);
 assert.equal(await page.locator('#pp-filters option[value="绿灯"]').count(),0,'上方风险筛选不增加绿灯');
 const expectedGreen=source.filter(entry=>entry.risk.light==='绿灯');
 await lightMenu.locator('summary').click();await lightMenu.locator('input[value="绿灯"]').check();await page.keyboard.press('Escape');
 const greenSelection=await page.evaluate(()=>projectAnalysisAudit());
 assert.equal(greenSelection.filteredRecords.length,expectedGreen.length,'绿灯筛选按实际台账计数，无记录时保持空态');assert(greenSelection.filteredRecords.every(entry=>entry.risk.light==='绿灯'));
 assert.equal(await page.locator('#pp-analysis-ledger-results tbody td[data-field="light"] [data-light="绿灯"]').count(),Math.min(20,greenSelection.filteredRecords.length));
 await form.locator('[data-pp-analysis-reset]').click();assert.equal((await page.evaluate(()=>projectAnalysisAudit())).filteredRecords.length,source.length);
 assert(await page.locator('#overlay').isHidden());

 for(const width of [1920,1440,900,600,390]){
  await page.setViewportSize({width,height:1080});
  assert(await cards.evaluateAll(els=>els.every(e=>e.scrollWidth<=e.clientWidth+1)));
  assert(await page.locator('#pp-ai').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1));
  const checkAlignment=async()=>{
   const geometry=await page.locator('#pp-analysis-panel').evaluate(el=>{const rect=s=>{const r=el.querySelector(s).getBoundingClientRect();return {left:r.left,bottom:r.bottom,top:r.top,height:r.height}};return {card:rect('.pp-analysis-card'),table:rect('.pp-analysis-ledger-scroll'),pages:rect('.pp-analysis-pages')}});
   if(width>850){assert(Math.abs(geometry.card.bottom-geometry.table.bottom)<2,`表格与左卡底部对齐：${JSON.stringify(geometry)}`);assert(geometry.pages.top-geometry.table.bottom>=14,'分页与表格间隔至少14px');assert(Math.abs(geometry.pages.left-geometry.table.left)<2,'分页留在右栏下方')}
   else assert(geometry.pages.top>=geometry.table.bottom,'单列分页排在表格下方');
  };
  await checkAlignment();
  if(width>850){
   await page.locator('.pp-root-item').first().click();await checkAlignment();
   await page.locator('#pp-analysis-filters input[type="search"]').fill('不存在的台账');await checkAlignment();
   await page.locator('[data-pp-analysis-reset]').click();
   await page.locator('.pp-analysis-all').click();
  }
  await help.scrollIntoViewIfNeeded();await help.click();await page.locator('#metric-tooltip').waitFor({state:'visible'});
  assert(await page.locator('#metric-tooltip').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=8&&r.right<=innerWidth-8&&r.top>=8&&r.bottom<=innerHeight-8&&e.scrollWidth<=e.clientWidth}));
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('#pp-ai').scrollIntoViewIfNeeded();
 await help.click();await page.locator('#metric-tooltip').waitFor({state:'visible'});
 await page.locator('#metric-tooltip').screenshot({path:fileURLToPath(new URL('../../outputs/project-analysis-tip-styled.png',import.meta.url))});
 await page.keyboard.press('Escape');
 const ordinaryHelp=page.locator('#projects .metric-help:not(.pp-analysis-help):visible').first();
 await ordinaryHelp.click();assert.equal(await page.locator('#metric-tooltip.metric-tooltip-project-analysis').count(),0);await page.keyboard.press('Escape');
 await page.locator('#pp-ai').screenshot({path:fileURLToPath(new URL('../../outputs/project-analysis.png',import.meta.url))});
}
