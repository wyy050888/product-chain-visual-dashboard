import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export async function verifyKeyProductGrades(page,initial){
 const context=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('../../src/modules/key-products/07-grade-model.js',import.meta.url),'utf8'),context);
 const classify=context.kpmClassifyGrade;
 for(const [amount,rate,expected] of [[601,12.1,'S'],[600,12.1,null],[601,12,null],[600,11.9,'A'],[300.1,11.9,'A'],[300,11.9,null],[299,15.1,'B'],[60.1,15.1,'B'],[60,15.1,null],[100,15,null],[59.9,11.9,'C'],[59.9,12,null],[500,20,null],[100,10,null],[50,20,null]])assert.equal(classify(amount,rate),expected,'图片分级边界 '+amount+'/'+rate);
 assert.equal(classify(700,20,0),null,'零销量不伪造等级');
 const grades=['S','A','B','C'],paths={up:[],down:[]};
 for(const [i,previous] of grades.entries())for(const [j,current] of grades.entries()){
  const sample={previous:{level:previous},current:{level:current},change:context.kpmGradeChange({level:current},{level:previous})};
  assert.equal(sample.change,i===j?'same':i>j?'up':'down');
  if(i!==j){paths[sample.change].push(previous+'-'+current);assert(context.kpmMatchesChange(sample,sample.change,previous+'-'+current));assert.equal(context.kpmMatchesChange(sample,sample.change,current+'-'+previous),false)}
 }
 for(const kind of ['up','down'])assert.equal(new Set(paths[kind]).size,6,'每种升降必须覆盖六条路径');

 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 assert.equal(await root.locator('#kpm-count,.kpm-chart-note,.kpm-note,.kpm-chart-actions>span,.mk-heading>span').count(),0,'删除用户红框中的说明文字');
 assert.equal(await root.locator('#matrixtable th').nth(2).innerText(),'等级变动','变动入口与等级相邻');
 assert.deepEqual(await root.locator('[data-kpm-change]').evaluateAll(es=>es.map(e=>e.dataset.kpmChange)),['up','down'],'主表只保留上升和下降');
 assert.equal(await root.locator('[data-kpm-transition]').count(),12,'十二子类初始全部可见');

 for(const kind of ['up','down'])for(const path of paths[kind])assert(initial.rows.some(p=>p.assessment.change===kind&&p.assessment.previous.level+'-'+p.level===path),'默认近30天包含演示路径 '+path);
 assert.equal(await root.locator('#matrixtable .kpm-change small').count(),0,'等级变动不显示第二行');
 for(const button of await root.locator('#matrixtable .kpm-change').all()){
  const id=await button.getAttribute('data-kpm-history'),row=initial.rows.find(p=>p.spuId===id);
  assert.deepEqual(await button.locator('.kpm-change-grade').allTextContents(),[row.assessment.previous.level||'待分级',row.level||'待分级']);
  const tokens=await button.locator('.kpm-change-grade').evaluateAll(es=>es.map(e=>({level:e.textContent,t:e.getBoundingClientRect().top,color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor})));
  assert(Math.abs(tokens[0].t-tokens[1].t)<1,'变动两端标签同排');
  const colors={S:['rgb(37, 156, 125)','rgb(234, 247, 242)'],A:['rgb(203, 141, 37)','rgb(255, 245, 228)'],B:['rgb(108, 126, 207)','rgb(238, 241, 255)'],C:['rgb(218, 107, 123)','rgb(255, 240, 242)']};
  for(const token of tokens)if(colors[token.level])assert.deepEqual([token.color,token.bg],colors[token.level],'变动标签使用统一等级颜色');
 }

 for(const key of ['up','down']){
  const button=root.locator('[data-kpm-change="'+key+'"]');if(!await button.count())continue;
  await button.click();const current=await snapshot();assert(current.visible.every(p=>p.assessment.change===key));
  assert.equal(await root.locator('#matrixchart circle').count(),current.visible.filter(p=>p.level&&p.assessment.current.sales>0).length,'变动筛选联动图表');
  if(['up','down'].includes(key)){
   const options=root.locator('[data-kpm-transition-kind="'+key+'"]');assert.equal(await options.count(),6,'每行常显六条路径');
   const all=await options.evaluateAll(es=>es.map(e=>e.dataset.kpmTransition).filter(k=>k!=='all'));
   assert.deepEqual([...all].sort(),paths[key].sort());
   for(const path of all){
    await root.locator('[data-kpm-transition="'+path+'"]').click();const selected=await snapshot();assert.equal(selected.transition,path);
    const expected=current.visible.filter(p=>p.assessment.previous.level+'-'+p.level===path);
    assert.deepEqual(selected.visible.map(p=>p.spuId).sort(),expected.map(p=>p.spuId).sort(),'路径筛选必须命中真实两期等级');
    assert.equal(await root.locator('#matrixchart circle').count(),expected.filter(p=>p.level&&p.assessment.current.sales>0).length);
    await root.locator('[data-kpm-transition="'+path+'"]').click();assert.equal((await snapshot()).transition,'all');
   }
  }

  assert.equal((await page.evaluate(()=>window.dashboardKeyProductManagementSnapshot())).baseIds.length,current.visible.length,'经营面板同步范围');
  await root.locator('[data-kpm-reset]').click();
 }
 // 无需先点方向即可选子类，跨方向切换同步更新状态；再次点击子类回到该方向全部。
 for(const key of ['up','down']){
  for(const path of paths[key]){
   await root.locator('[data-kpm-transition="'+path+'"]').click();const selected=await snapshot();
   assert.equal(selected.change,key);assert.equal(selected.transition,path);
   const expected=initial.rows.filter(p=>p.assessment.change===key&&p.assessment.previous.level+'-'+p.level===path);
   assert.deepEqual(selected.visible.map(p=>p.spuId).sort(),expected.map(p=>p.spuId).sort());
   assert.equal(await root.locator('[data-kpm-transition].active').count(),1);
   await root.locator('[data-kpm-transition="'+path+'"]').click();assert.equal((await snapshot()).transition,'all');
  }
 }
 await root.locator('[data-kpm-transition="C-B"]').click();await root.locator('[data-kpm-change="up"]').click();
 assert.equal((await snapshot()).change,'up');assert.equal((await snapshot()).transition,'all','点击方向清除子类');
 await root.locator('[data-kpm-change="up"]').click();assert.equal((await snapshot()).change,'all','再次点击方向取消筛选');
 for(const width of [1920,1440,1100,768,390,320]){
  await page.setViewportSize({width,height:1080});
  const layout=await root.locator('.kpm-filter-strip').evaluate(strip=>{
   const e=strip.querySelector('#kpm-change-tabs'),grade=strip.querySelector('#matrixtabs').getBoundingClientRect(),change=e.getBoundingClientRect();
   const groups=[...e.children].map(n=>n.getBoundingClientRect()),buttons=[...e.querySelectorAll('button')].map(n=>n.getBoundingClientRect());
   return {right:strip.getBoundingClientRect().right,overflow:strip.scrollWidth-strip.clientWidth,gradeGap:change.left-grade.right,centerGap:Math.abs((change.top+change.bottom-grade.top-grade.bottom)/2),groupGap:groups[1].left-groups[0].right,topGap:Math.abs(groups[1].top-groups[0].top),buttonTopGap:Math.max(...buttons.map(b=>b.top))-Math.min(...buttons.map(b=>b.top))};
  });
  assert(layout.gradeGap>0&&layout.centerGap<1,'分级和升降筛选左右同排 '+width);
  assert(layout.groupGap>0&&layout.topGap<1&&layout.buttonTopGap<1,'下滑七标签在上升组右侧同排 '+width);
  assert(layout.right<=width,'标签只在内部滚动，不撑破页面 '+width);
  if(width===1920)assert(layout.overflow<=1,'桌面分级和十四个升降标签同排完整可见');
  if(width===390)assert(layout.overflow>0,'窄屏内部横向滚动');
  assert.match(await root.locator('[data-kpm-change="down"]').innerText(),/^等级下滑/);
  for(const group of await root.locator('.kpm-change-row').all())assert.equal(await group.locator('button').count(),7);
  assert.equal(await root.locator('[data-kpm-transition]:visible').count(),12);
 }
 await page.setViewportSize({width:1920,height:1080});await root.locator('[data-kpm-reset]').click();
 await root.locator('[data-kpm-grade="unrated"]').click();let data=await snapshot();assert(data.visible.every(p=>!p.level));assert.equal(await root.locator('#matrixchart circle').count(),0,'未命中SABC的产品仅留在明细，不画灰色圆点');assert(await root.locator('#matrixtable tbody tr').count()>0,'未命中规则的明细仍可查看');assert.doesNotMatch(await root.locator('#matrixchart').innerText(),/待分级/);await root.locator('[data-kpm-reset]').click();
 // 演示日台账通过同一分级规则产生当前及历史升降，不直接改写评级结果。
 const candidates=await page.evaluate(()=>window.dashboardKeyProductsSnapshot().rows.map(p=>({id:p.spuId,history:window.dashboardKeyProductGradeHistory(p.spuId)})));
 const candidate=candidates.find(p=>p.history.some(r=>r.change==='up')&&p.history.some(r=>r.change==='down'));assert(candidate,'历史台账包含上升和下滑场景');
 await root.locator('[data-kpm-search]').fill(initial.rows.find(p=>p.spuId===candidate.id).spuCode);
 await root.locator('#matrixtable [data-kpm-history]').first().click();const history=page.locator('.kpm-grade-history');await history.waitFor();
 assert.equal(await history.locator('tbody tr').count(),6);assert.equal(await history.locator('.metric-help').count(),0,'不添加多余字段说明');
 const expected=candidate.history[0];assert.equal(expected.current.start,initial.range.start);assert.equal(expected.current.end,initial.range.end);assert.equal(Date.parse(expected.current.start)-Date.parse(expected.previous.end),86400000);
 const select=history.locator('[data-kpm-history-filter]');assert.equal(await select.locator('optgroup option').count(),12);for(const kind of ['up','down']){await select.selectOption(kind);assert.equal(await history.locator('tbody tr').count(),candidate.history.filter(r=>r.change===kind).length)}await select.selectOption('changed');assert.equal(await history.locator('tbody tr').count(),candidate.history.filter(r=>['up','down'].includes(r.change)).length);
 const pick=history.locator('[data-kpm-history-pick]').last();const selectedIndex=Number(await pick.getAttribute('data-kpm-history-pick'));await pick.click();
 assert.equal(await history.getAttribute('data-grade-start'),candidate.history[selectedIndex].current.start,'选择历史记录更新两期对照');
 await page.setViewportSize({width:390,height:900});assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'历史抽屉窄屏不撑破正文');await page.setViewportSize({width:1920,height:1080});
 await history.locator('[data-kpm-history-product]').first().click();await page.locator('.up-detail').waitFor();assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),candidate.history[selectedIndex].current.start,'产品详情继承所查看的历史周期');assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'1');await page.locator('#close').click();await history.waitFor();assert.equal(await select.inputValue(),'changed','从产品返回保留记录筛选');
 await page.locator('#close').click();assert.equal(await root.locator('[data-kpm-search]').inputValue(),initial.rows.find(p=>p.spuId===candidate.id).spuCode,'返回保留主表搜索');
 await root.locator('[data-kpm-reset]').click();
 await root.locator('[data-time-mode="month"]').click();await root.locator('[data-time-value]').selectOption('9');
 const september=await snapshot();assert(september.rows.some(p=>['up','down'].includes(p.assessment.change)),'历史月份可直接演示有升降的主表');
 for(const key of ['up','down']){
  if(!september.rows.some(p=>p.assessment.change===key))continue;
  await root.locator('[data-kpm-change="'+key+'"]').click();assert((await snapshot()).visible.length>0);assert((await snapshot()).visible.every(p=>p.assessment.change===key));await root.locator('[data-kpm-reset]').click();
 }
 await root.locator('[data-time-mode="recent30"]').click();await root.locator('[data-kpm-reset]').click();
}
