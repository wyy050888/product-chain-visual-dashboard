import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function newSuccessHistoryUI(page){
 const snapshot=()=>page.evaluate(()=>dashboardNewProductsSnapshot()),audit=()=>page.evaluate(()=>dashboardNewProductAssessmentSnapshot());
 const reload=async time=>{await page.clock.setFixedTime(new Date(time));await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready')};
 await reload('2026-11-15T04:00:00Z');
 const initial=await snapshot();assert.equal(initial.filters.launchStart,'');assert.equal(initial.filters.launchEnd,'');
 const exited=initial.rows.filter(r=>r.successQuarters.includes('2026-Q3')&&!r.inNewPool);assert(exited.length,'样例包含Q3成功且已出池的产品');
 await page.locator('[data-nsp-filter-toggle]').click();
 assert.equal(await page.getByRole('button',{name:'首次成功季度筛选',exact:true}).count(),0,'删除重复的首次成功季度筛选');
 assert.equal(await page.locator('#new-linked-filter [data-nsp-assessment-entry]').count(),0,'筛选区不再重复放考核入口');
 assert.equal('successQuarter' in initial.filters,false,'不保留失去入口的隐藏筛选');
 const entry=page.locator('#newtop [data-nsp-assessment-entry]');
 assert.equal(await entry.innerText(),'查看季度考核');
 assert.equal(await entry.count(),1);
 await page.locator('#newtop .nsp-kpi-title').click();assert.equal(await page.locator('.nsp-assessment').count(),0,'普通标题不再隐式打开考核');
 await entry.click();let data=await audit();assert.equal(data.period.mode,'quarter');assert.equal(data.result,'all');
 assert.equal(await page.locator('[data-nsp-assessment-controls] [data-nsp-assess-year]').count(),1,'年份选择位于正文筛选行');
 assert.equal(await page.locator('[data-nsp-assessment-controls] [data-nsp-assess-kind]').count(),2,'考核周期使用正文分段切换');
 assert.deepEqual(await page.locator('[data-nsp-assess-results] [role=tab]').allTextContents(),['全部纳入 '+data.summary.total,'成功 '+data.summary.success,'不成功 '+(data.summary.total-data.summary.success)]);
 assert.equal(await page.locator('[data-nsp-assess-quarter]').count(),0,'季度下拉已由四季矩阵替代');assert.equal(data.period.value,4);
 assert.equal(await page.locator('[data-nsp-assess-results] [aria-selected=true]').getAttribute('data-nsp-assess-result'),'all');
 assert.deepEqual(await page.locator('[data-nsp-assessment-table] th').allTextContents(),['SPU信息','上市季度','GSV','利润率','总退','考核结果','上市日期','操作']);
 assert.equal(await page.locator('[data-nsp-assessment-table] tbody tr').first().locator('td').nth(1).locator('.nsp-launch-quarter').count(),1);
 assert.equal(data.summary.total,initial.success.total);assert.equal(data.summary.success,initial.success.success);
 await page.locator('[data-nsp-assess-matrix="3"][data-nsp-assess-chain="all"][data-nsp-assess-pool="all"]').first().click();data=await audit();assert(exited.every(r=>data.rows.some(v=>v.spuId===r.spuId)),'历史考核名单包含后来已出池产品');
 await page.locator('[data-nsp-assess-result="success"]').click();data=await audit();
 assert.deepEqual(data.rows.filter(r=>r.successAssessment.success).map(r=>r.spuId).sort(),initial.rows.filter(r=>r.successQuarters.includes('2026-Q3')).map(r=>r.spuId).sort(),'季度成功名单覆盖原首次成功季度查询');
 assert(data.rows.filter(r=>r.successAssessment.success).every(r=>r.successAssessment.firstSuccess.quarter==='2026-Q3'));
 await page.locator('[data-nsp-assess-result="all"]').click();data=await audit();
 const all=data.rows.length,success=data.summary.success;assert.equal(await page.locator('[data-nsp-assess-result="all"]').innerText(),'全部纳入 '+all);assert.equal(await page.locator('[data-nsp-assess-result="failure"]').innerText(),'不成功 '+(all-success));
 await page.locator('[data-nsp-assess-product]').first().click();await page.locator('.up-detail').waitFor();await page.locator('#close').click();await page.locator('.nsp-assessment').waitFor();assert.equal((await audit()).period.value,3);assert.equal(await page.locator('[data-nsp-assess-results] [aria-selected=true]').getAttribute('data-nsp-assess-result'),'all');assert.equal(await page.locator('[data-nsp-assessment-controls] [data-nsp-assess-year]').inputValue(),'2026');await page.locator('[data-nsp-assess-result="failure"]').click();assert.equal((await audit()).result,'failure','返回后查询交互仍生效');await page.locator('#close').click();assert.deepEqual((await snapshot()).filters,initial.filters);
 for(const result of ['success','all']){
  await page.locator('#newtop [data-nsp-assessment="'+result+'"]').click();data=await audit();
  assert.equal(data.result,result);assert.equal(data.summary.total,initial.success.total);assert.equal(data.summary.success,initial.success.success);
  await page.locator('#close').click();
 }
 assert.deepEqual((await snapshot()).period,initial.period,'历史考核不回写主表期间');
 await page.locator('#time-new [data-time-mode="year"]').click();
 const annual=await snapshot();assert.equal(await entry.innerText(),'查看年度考核');await entry.click();data=await audit();
 assert.equal(data.period.mode,'year','年度视图中的文字入口进入年度考核');assert.equal(data.period.year,annual.period.year);assert.equal(data.assessment.end,annual.success.end);
 await page.locator('#close').click();await page.locator('#newtop [data-nsp-assessment="success"]').click();data=await audit();
 assert.equal(data.period.mode,'year','年度卡片数字仍进入独立年度考核');assert.equal(data.summary.total,annual.success.total);assert.equal(data.summary.success,annual.success.success);
 await page.locator('#close').click();await page.locator('#time-new [data-time-mode="recent30"]').click();
 const evidence=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../outputs/new-success-review');fs.mkdirSync(evidence,{recursive:true});
 for(const width of [1920,1440,1024,390,320]){
  await page.setViewportSize({width,height:1080});
  const layout=await entry.evaluate(button=>{
   const rect=button.getBoundingClientRect(),heading=button.closest('.nsp-success-heading').getBoundingClientRect(),card=button.closest('.newmetric'),box=card.getBoundingClientRect(),value=card.querySelector('.num').getBoundingClientRect(),label=card.querySelector('.nsp-kpi-title').getBoundingClientRect(),style=getComputedStyle(button);
   return {rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},heading:{left:heading.left,right:heading.right},box:{left:box.left,right:box.right,bottom:box.bottom},valueLeft:value.left,labelTop:label.top,labelBottom:label.bottom,border:style.borderTopWidth,background:style.backgroundColor,cardOverflow:card.scrollWidth-card.clientWidth};
  });
  assert.equal(layout.border,'0px');assert.equal(layout.background,'rgba(0, 0, 0, 0)','入口为无底色文字按钮');
  assert(layout.rect.left>=layout.heading.left&&layout.rect.right<=layout.heading.right+1,'入口紧跟标题且不超出标题栏 '+width);
  assert(layout.rect.right<=layout.valueLeft+1&&layout.rect.bottom<=layout.box.bottom,'不遮挡成功率和底部数字 '+width);
  assert(layout.cardOverflow<=1,'卡片不横向溢出 '+width);
  if(width===1920)assert(layout.rect.top<layout.labelBottom&&layout.rect.bottom>layout.labelTop,'桌面文字按钮与标题同排');
  assert(await page.locator('#new').evaluate(n=>n.scrollWidth<=n.clientWidth+2),'新品模块无横向溢出 '+width);
  if([1920,390].includes(width)){
   await page.locator('#newtop').screenshot({path:path.join(evidence,'assessment-entry-'+width+'.png')});
  }
  await entry.click();
  assert(await page.locator('#dialogbody').evaluate(n=>n.scrollWidth<=n.clientWidth+2),'考核正文仅表格内部横向滚动 '+width);
  const controls=await page.locator('.nsp-assessment-head-controls').boundingBox(),dialog=await page.locator('#dialog').boundingBox();
  assert(controls.x>=dialog.x&&controls.x+controls.width<=dialog.x+dialog.width,'筛选控件不超出抽屉 '+width);
  assert(await page.locator('[data-nsp-assess-results]').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'三个结果Tab完整展示 '+width);
  if([1920,390].includes(width))await page.locator('#dialog').screenshot({path:path.join(evidence,'assessment-result-tabs-'+width+'.png')});
  await page.locator('#close').click();
  if(![1920,390].includes(width))continue;
  await page.setViewportSize({width,height:1080});const help=page.locator('#newtop [data-nsp-kpi="新品销售成功率"]');await help.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await page.waitForTimeout(150);await help.hover();await page.waitForFunction(()=>!document.querySelector('#metric-tooltip').hidden);
  const tooltip=page.locator('#metric-tooltip');assert((await tooltip.getAttribute('class')).includes('metric-tooltip-nsp-card'));assert.match(await tooltip.innerText(),/当季/);assert.match(await tooltip.innerText(),/跨年/);assert(!/90|120|从上线累计/.test(await tooltip.innerText()));
  const rect=await tooltip.boundingBox();assert(rect.x>=7&&rect.x+rect.width<=width-7);await page.screenshot({path:path.join(evidence,'success-tooltip-'+width+'.png')});await page.mouse.move(0,0);
 }
 await page.setViewportSize({width:320,height:1080});assert(await page.locator('#new').evaluate(n=>n.scrollWidth<=n.clientWidth+2));
 await page.setViewportSize({width:1920,height:1080});await reload('2027-01-15T04:00:00Z');const cross=await snapshot();assert.equal(cross.filters.launchStart,'');assert(cross.successScope.some(r=>r.successAssessment.included&&r.successAssessment.carried),'跨年滚入不被默认上市年份排除');await page.locator('[data-nsp-assessment="all"]').first().click();data=await audit();assert(data.rows.length>0);assert(data.rows.every(r=>r.actualLaunch<'2027-01-01'&&r.successAssessment.carried));assert.equal(data.matrix.periods.filter(p=>!p.available).length,3,'未到的季度不可选择');await page.locator('#close').click();
 await page.locator('#time-new [data-time-mode="month"]').click();await page.locator('#time-new [data-time-year]').selectOption('2026');await page.locator('#time-new [data-time-value]').selectOption('8');const monthly=await snapshot();assert.equal(monthly.success.end,'2026-08-31');await page.locator('[data-nsp-assessment="all"]').first().click();data=await audit();assert.equal(data.assessment.end,'2026-08-31');assert.equal(data.summary.total,monthly.success.total);assert.equal(data.summary.success,monthly.success.success);assert(data.rows.every(r=>!r.successAssessment.firstSuccess||r.successAssessment.firstSuccess.date<='2026-08-31'),'月度下钻不能提前读取季度末数据');await page.locator('#close').click();
}
