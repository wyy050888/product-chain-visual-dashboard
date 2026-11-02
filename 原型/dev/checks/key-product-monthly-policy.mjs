import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';
import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import {verifyKeyProductChart} from './key-products-chart.mjs';
function verifyMonthlyPolicy(){
 const context=businessRuleContext({window:{}});
 const examples=[[601,12.1,'S'],[600,12.1,null],[601,12,null],[600,11.9,'A'],[300.1,11.9,'A'],[300,11.9,null],[300,15.1,'B'],[60,15.1,'B'],[59.99,15.1,null],[100,15,null],[59.99,11.9,'C'],[59.99,12,null],[500,20,null],[100,10,null],[50,20,null]];
 for(const [mode,factor] of [['recent30',1],['month',1],['quarter',3],['year',12]])for(const [gsv,margin,expected] of examples)assert.equal(context.brcProductGrade(gsv*factor,margin,mode),expected,mode+' '+gsv+'/'+margin);
 for(const [gsv,margin] of [[null,12],[600,null],[NaN,15],[Infinity,20]])assert.equal(context.brcProductGrade(gsv,margin,'month'),null,'缺失事实不评级');
 // 旧季度配置只升级分级规则；原缓存和其他业务配置保持。
 const memory=new Map(),localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
 const stored=businessRuleContext({window:{},localStorage});
 const defaults=JSON.parse(vm.runInContext('JSON.stringify(brcDefaults)',stored));defaults['quality.orders']=333;
 const conditions=stored.brcDefaultConditions(defaults);conditions['grades.B.salesAbove']={op:'all',conditions:[{op:'gt',a:60},{op:'lt',a:300}]};
 const legacy=JSON.stringify({version:3,revision:7,returnRuleRevision:1,values:defaults,conditions});memory.set('dashboard-business-rules-v3',legacy);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/01-store.js',import.meta.url),'utf8'),stored);
 assert.equal(stored.brcNumber('quality.orders'),333);assert.equal(stored.brcRead().gradeRuleRevision,1);assert.equal(memory.get('dashboard-business-rules-v3'),legacy);
 assert.equal(stored.brcProductGrade(60,16,'month'),'B');assert.equal(stored.brcProductGrade(300,16,'month'),'B');
 const draft=stored.brcCopyConditions(stored.brcRead().conditions);draft['grades.S.salesAbove']={op:'gte',a:650};
 stored.brcCommit('new',stored.brcRead().values,draft);assert.equal(stored.brcRead().conditions['grades.S.salesAbove'].a,650);assert.equal(stored.brcRead().gradeRuleRevision,1);assert.equal(stored.brcNumber('quality.orders'),333);
}
export async function keyProductMonthlyPolicy(page){
 verifyMonthlyPolicy();
 await page.locator('a[href="#matrix"]').click();await clearKeyProductFilters(page);
 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>dashboardKeyProductsSnapshot());
 const initial=await snapshot(),cards=root.locator('.kpm-structure-item');
 assert.deepEqual(await cards.locator('.kpm-structure-title').allTextContents(),['等级上升','等级下降','S级产品','A级产品','B级产品','C级产品']);
 assert.equal(await root.locator('[data-kpm-summary-change] .kpm-structure-caption,[data-kpm-summary-change] .kpm-change-symbol').count(),0);
 assert.equal(await root.locator('[data-kpm-management-section=changes],#matrix-ai-summary,.kpm-management-rows,[data-kpm-grade=all]').count(),0);
 const ids=rows=>rows.map(p=>p.spuId).sort(),counts=await cards.locator('.kpm-structure-count').allTextContents();
 for(const grade of ['S','A','B','C']){
  const card=root.locator('[data-kpm-grade='+grade+']');assert.equal(Number(await card.locator('.kpm-structure-count').innerText()),initial.base.filter(p=>p.level===grade).length);
  await card.click();assert.deepEqual(ids((await snapshot()).visible),ids(initial.base.filter(p=>p.level===grade)));
  assert.deepEqual(await cards.locator('.kpm-structure-count').allTextContents(),counts);await card.click();
 }
 for(const key of ['up','down']){
  const card=root.locator('[data-kpm-summary-change='+key+']'),expected=initial.base.filter(p=>p.assessment.change===key);
  assert.equal(Number(await card.locator('.kpm-structure-count').innerText()),expected.length);
  await card.click();assert.deepEqual(ids((await snapshot()).visible),ids(expected));assert.equal((await snapshot()).grade,'all');assert.equal(await card.getAttribute('aria-pressed'),'true');
  await card.click();assert.equal((await snapshot()).change,'all');
 }
 await root.locator('[data-kpm-grade=A]').click();await root.locator('[data-kpm-summary-change=up]').click();assert.equal((await snapshot()).grade,'all');
 await root.locator('[data-kpm-grade=C]').click();assert.equal((await snapshot()).change,'all');await clearKeyProductFilters(page);
 await verifyKeyProductChart(page);
 const gray=initial.base.find(p=>!p.level&&p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.profitRate));assert(gray,'灰色区域有真实未命中样例');
 const grayPoint=root.locator('[data-kpm-point="'+gray.spuId+'"]');await grayPoint.focus();
 const tip=page.locator('#kpm-point-tooltip');await tip.waitFor({state:'visible'});assert.equal(await tip.locator('.kpm-point-grade').innerText(),'未分级');assert.doesNotMatch(await tip.innerText(),/undefined|null/);
 await grayPoint.press('Enter');await page.locator('.up-detail').waitFor();assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),initial.range.start);await page.locator('#close').click();
 const matrixIds=await root.locator('#matrixchart circle').evaluateAll(nodes=>nodes.map(node=>node.dataset.kpmPoint).sort());
 await root.locator('[data-kpm-expand]').click();await root.locator('.kpm-chart-zoom').waitFor();
 assert.deepEqual(await root.locator('#matrixchart circle').evaluateAll(nodes=>nodes.map(node=>node.dataset.kpmPoint).sort()),matrixIds);assert(await root.locator('.kpm-chart-zoom [data-kpm-grade-point=unrated]').count()>0);
 await root.locator('.kpm-chart-zoom [data-kpm-expand]').click();
 const ctx=businessRuleContext({window:{}});
 for(const [mode,factor] of [['month',1],['quarter',3],['year',12],['recent30',1]]){
  await root.locator('[data-time-mode='+mode+']').click();const data=await snapshot();assert.equal(data.gradeRules.S.salesAbove,600*factor);
  for(const row of data.rows)assert.equal(row.level,row.assessment.current.sales>0?ctx.brcProductGrade(row.facts.gsvCents/1000000,row.facts.profitRate,mode):null);
  await verifyKeyProductChart(page);
 }
 for(const width of [1920,1440,1280,1024,390,320]){
  await page.setViewportSize({width,height:1080});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert(await root.locator('.kpm-sidebar').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'概览不溢出 '+width);
  assert(await cards.evaluateAll(nodes=>nodes.every(e=>e.scrollWidth<=e.clientWidth+1)),'六卡不裁字 '+width);
  assert(await root.locator('#matrixchart').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'矩阵不溢出 '+width);
  if(width===1920||width===1440||width===390)await root.locator('.kpm-sidebar').screenshot({path:'outputs/key-grade-six-cards-'+width+'.png'});
 }
 await page.setViewportSize({width:1920,height:1080});await clearKeyProductFilters(page);
 console.log('通过：月销边界/周期换算/旧配置升级、六卡联动、灰色区域与产品、放大和六宽度');
}
