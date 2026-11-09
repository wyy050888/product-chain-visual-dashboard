import {businessRuleContext} from './business-rules-context.mjs';
import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export async function verifyKeyProductGrades(page,initial){
 const context=businessRuleContext({window:{}});vm.runInContext(readFileSync(new URL('../../src/modules/key-products/07-grade-model.js',import.meta.url),'utf8'),context);
 const classify=context.kpmClassifyGrade;
 for(const [amount,rate,expected] of [[601,12.1,'S'],[600,12.1,null],[601,12,null],[600,11.9,'A'],[300.1,11.9,'A'],[300,11.9,null],[299,15.1,'B'],[60.1,15.1,'B'],[60,15.1,'B'],[100,15,null],[59.9,11.9,'C'],[59.9,12,null],[500,20,null],[100,10,null],[50,20,null]])assert.equal(classify(amount,rate,1,'month'),expected,'图片分级边界 '+amount+'/'+rate);
 assert.equal(classify(700,20,0),null,'零销量不伪造等级');
 const grades=['S','A','B','C'],paths={up:[],down:[]};
 for(const [i,previous] of grades.entries())for(const [j,current] of grades.entries()){
  const sample={previous:{level:previous},current:{level:current},change:context.kpmGradeChange({level:current},{level:previous})};
  assert.equal(sample.change,i===j?'same':i>j?'up':'down');
  if(i!==j){paths[sample.change].push(previous+'-'+current);assert(context.kpmMatchesChange(sample,sample.change));assert.equal(context.kpmMatchesChange(sample,sample.change==='up'?'down':'up'),false)}
 }
 for(const kind of ['up','down'])assert.equal(new Set(paths[kind]).size,6,'每种升降必须覆盖六条路径');

 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 assert.equal(await root.locator('#kpm-count,.kpm-chart-note,.kpm-note,.kpm-chart-actions>span,.mk-heading>span').count(),0,'删除用户红框中的说明文字');
 assert.equal(await root.locator('#matrixtable th').nth(1).innerText(),'等级变动','变动入口与等级相邻');
 assert.deepEqual(await root.locator('[data-kpm-change]').evaluateAll(es=>es.map(e=>e.dataset.kpmChange)),['all','up','down'],'变动筛选包含全部、上升和下降');
 assert.equal(await root.locator('[data-kpm-transition],.kpm-change-paths').count(),0,'移除具体路径筛选');
 const all=root.locator('[data-kpm-change="all"]');
 assert.equal(await all.getAttribute('aria-pressed'),'true');assert.equal(await all.locator('span').innerText(),String(initial.rows.length));
 // 两组标签共用默认和选中外观，方向不再使用独立的描边按钮。
 const style=button=>button.evaluate(e=>{const s=getComputedStyle(e);return ['height','padding','borderWidth','borderRadius','backgroundColor','color','fontSize','fontWeight'].map(k=>s[k])});
 await page.mouse.move(0,0);
 assert.equal(await root.locator('.matrixlist [data-kpm-grade]').count(),0,'等级入口由顶部卡片提供');
 assert.deepEqual((await style(root.locator('[data-kpm-change="up"]'))).filter((_,i)=>i!==5),(await style(root.locator('[data-kpm-change="down"]'))).filter((_,i)=>i!==5),'两个方向尺寸一致，保留语义文字色');
 assert.equal(await root.locator('[data-kpm-change="up"]').evaluate(e=>getComputedStyle(e).color),'rgb(37, 156, 125)');assert.equal(await root.locator('[data-kpm-change="down"]').evaluate(e=>getComputedStyle(e).color),'rgb(199, 139, 49)');
 await root.locator('[data-kpm-change="up"]').click();await all.click();
 assert.equal((await snapshot()).change,'all');assert.equal((await snapshot()).visible.length,initial.rows.length,'全部清除方向限制');


 // 样例等级随月销门槛换算；六种升降路径在上方纯模型验证，不人为改样例凑齐。 
 assert.equal(await root.locator('#matrixtable .kpm-change small').count(),0,'等级变动不显示第二行');
 for(const button of await root.locator('#matrixtable .kpm-change').all()){
  const id=await button.getAttribute('data-kpm-grade-change'),row=initial.rows.find(p=>p.spuId===id);
  assert.deepEqual(await button.locator('.kpm-change-grade').allTextContents(),[row.assessment.previous.level||'未分级',row.level||'未分级']);
  const tokens=await button.locator('.kpm-change-grade').evaluateAll(es=>es.map(e=>({level:e.textContent,t:e.getBoundingClientRect().top,color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor})));
  assert(Math.abs(tokens[0].t-tokens[1].t)<1,'变动两端标签同排');
  const colors={S:['rgb(37, 156, 125)','rgb(234, 247, 242)'],A:['rgb(203, 141, 37)','rgb(255, 245, 228)'],B:['rgb(108, 126, 207)','rgb(238, 241, 255)'],C:['rgb(218, 107, 123)','rgb(255, 240, 242)']};
  for(const token of tokens)if(colors[token.level])assert.deepEqual([token.color,token.bg],colors[token.level],'变动标签使用统一等级颜色');
 }

 for(const key of ['up','down']){
  const button=root.locator('[data-kpm-change="'+key+'"]');
  const expected=initial.rows.filter(p=>p.assessment.change===key);
  assert.equal(await button.locator('span').innerText(),String(expected.length),'方向计数');
  await button.click();const current=await snapshot();
  assert.deepEqual(current.visible.map(p=>p.spuId).sort(),expected.map(p=>p.spuId).sort(),'方向筛选包含所有具体升降路径');
  assert.equal(await button.getAttribute('aria-pressed'),'true');
  assert.equal(await root.locator('#matrixchart circle').count(),current.base.filter(p=>p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.profitRate)).length,'变动筛选联动图表');
  assert.equal((await page.evaluate(()=>window.dashboardKeyProductManagementSnapshot())).baseIds.length,current.base.length,'经营面板保留基础范围');
  await button.click();assert.equal((await snapshot()).change,'all','再次点击取消筛选');
 }
 await root.locator('[data-kpm-change="up"]').click();await root.locator('[data-kpm-change="down"]').click();
 assert.equal((await snapshot()).change,'down','跨方向直接切换');
 assert.equal(await root.locator('[data-kpm-change][aria-pressed="true"]').count(),1,'方向互斥');
 await clearKeyProductFilters(page);
 await root.locator('[data-kpm-grade="A"]').click();
 const scoped=await snapshot();
 assert.equal(await all.locator('span').innerText(),String(scoped.visible.length),'全部计数跟随左侧等级');
 for(const key of ['up','down']){
  const button=root.locator('[data-kpm-change="'+key+'"]'),expected=scoped.visible.filter(p=>p.assessment.change===key);
  assert.equal(await button.locator('span').innerText(),String(expected.length),'计数跟随等级筛选');
  await button.click();assert.deepEqual((await snapshot()).visible.map(p=>p.spuId).sort(),expected.map(p=>p.spuId).sort(),'等级与方向取交集');
  await button.click();
 }
 await clearKeyProductFilters(page);
 for(const width of [1920,1440,1100,768,390,320]){
  await page.setViewportSize({width,height:1080});
  const layout=await root.locator('.kpm-filter-strip').evaluate(strip=>{
   const e=strip.querySelector('#kpm-change-tabs');
   const groups=[...e.children].map(n=>n.getBoundingClientRect()),buttons=groups;
   return {right:strip.getBoundingClientRect().right,overflow:strip.scrollWidth-strip.clientWidth,groupGap:groups[1].left-groups[0].right,topGap:Math.abs(groups[1].top-groups[0].top),buttonTopGap:Math.max(...buttons.map(b=>b.top))-Math.min(...buttons.map(b=>b.top))};
  });
  assert(layout.groupGap>0&&layout.topGap<1&&layout.buttonTopGap<1,'全部与两个方向筛选同排 '+width);
  assert(layout.right<=width,'标签只在内部滚动，不撑破页面 '+width);
  if(width===1920)assert(layout.overflow<=1,'桌面两组筛选完整可见');
  assert.match(await root.locator('[data-kpm-change="down"]').innerText(),/等级下降/);
  assert.equal(await root.locator('#kpm-change-tabs button').count(),3);
  assert.equal(await root.locator('[data-kpm-transition]').count(),0);
 }
 await page.setViewportSize({width:1920,height:1080});await clearKeyProductFilters(page);
 assert.equal(await root.locator('[data-kpm-grade="unrated"]').count(),0,'不展示未分级入口');let data=await snapshot();assert(data.visible.some(p=>!p.level),'全部明细保留未分级产品');assert.equal(await root.locator('#matrixchart circle').count(),data.base.filter(p=>p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.profitRate)).length,'完整矩阵包含可定位的未命中灰点');assert(await root.locator('[data-kpm-unmatched-area]').count());
 // 演示日台账通过同一分级规则产生当前及历史升降，不直接改写评级结果。
 const candidates=await page.evaluate(()=>window.dashboardKeyProductsSnapshot().rows.map(p=>({id:p.spuId,history:window.dashboardKeyProductGradeHistory(p.spuId)})));
 const candidate=candidates.find(p=>p.history.some(r=>r.change==='up')&&p.history.some(r=>r.change==='down'));assert(candidate,'历史台账包含上升和下滑场景');
 await root.locator('[data-kpm-search]').fill(initial.rows.find(p=>p.spuId===candidate.id).spuCode);
 const expected=candidate.history[0];assert.equal(expected.current.start,initial.range.start);assert.equal(expected.current.end,initial.range.end);assert.equal(Date.parse(expected.current.start)-Date.parse(expected.previous.end),86400000);
 const changeCell=root.locator('#matrixtable [data-kpm-grade-change]').first();
 assert.equal(await changeCell.evaluate(e=>e.tagName),'SPAN');assert.equal(await root.locator('#matrixtable [data-kpm-history],#matrixtable button.kpm-change,#matrixtable .kpm-change[role=button],#matrixtable .kpm-change[tabindex]').count(),0);
 assert.equal(await changeCell.evaluate(e=>getComputedStyle(e).cursor),'default');await changeCell.click();assert.equal(await page.locator('.kpm-grade-history').count(),0,'等级变动静态展示，不再打开记录抽屉');assert.equal(await page.locator('#dialog').isVisible(),false);
 assert.equal(await root.locator('[data-kpm-search]').inputValue(),initial.rows.find(p=>p.spuId===candidate.id).spuCode);
 await clearKeyProductFilters(page);
 await root.locator('[data-time-mode="month"]').click();await root.locator('[data-time-value]').selectOption('9');
 const september=await snapshot();assert(september.rows.some(p=>['up','down'].includes(p.assessment.change)),'历史月份可直接演示有升降的主表');
 for(const key of ['up','down']){
  if(!september.rows.some(p=>p.assessment.change===key))continue;
  await root.locator('[data-kpm-change="'+key+'"]').click();assert((await snapshot()).visible.length>0);assert((await snapshot()).visible.every(p=>p.assessment.change===key));await clearKeyProductFilters(page);
 }
 await root.locator('[data-time-mode="recent30"]').click();await clearKeyProductFilters(page);
}
