import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function verifyCostCategoryImport(page){
 const key='cost-efficiency-config-v1',editor=page.locator('#cec-editor');
 const audit=()=>page.evaluate(()=>costConfigAudit()),cost=()=>page.evaluate(()=>costControlAudit({year:2026,mode:'month',value:10}));
 const reset=async()=>{await page.evaluate(k=>localStorage.removeItem(k),key);await page.reload();await page.evaluate(()=>location.hash='#system-cost-efficiency');await page.locator('#cec-page').waitFor({state:'visible'})};
 await reset();const baseline=await cost();
 await page.locator('#cec-category').selectOption('service');
 assert.deepEqual(await page.locator('#cec-body tr td:first-child').allTextContents(),['用户中心','用户中心']);
 await page.locator('#cec-reset').click();
 const download=page.waitForEvent('download');await page.locator('#cec-template').click();
 const template=fs.readFileSync(await(await download).path(),'utf8');
 assert.match(template,/责任部门.*降本分类.*降本指标.*年度.*数据类型/);assert.match(template,/包装降本/);assert.match(template,/客服收入/);
 await page.locator('#cec-new').click();await editor.locator('[name="metric"]').fill('分类回归样例');await page.locator('#cec-save').click();
 assert.match(await page.locator('#cec-editor-error').innerText(),/请选择降本分类/);
 await page.keyboard.press('Escape');await page.locator('[data-cec-discard]').click();
 const headers=['责任部门','降本分类','降本指标','年度','数据类型',...Array.from({length:12},(_,i)=>(i+1)+'月'),'备注'];
 const row=(category,type,value,metric='分类回归样例')=>['采购部',category,metric,'2026',type,...Array.from({length:12},(_,i)=>i===9?value:''),''];
 const upload=async(rows,columns=headers)=>{
  await page.locator('#cec-import').click();
  await page.locator('#cec-file').setInputFiles({name:'分类导入.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFF'+[columns,...rows].map(r=>r.join(',')).join('\r\n'))});
  await page.locator('#cec-import-result .cec-import-summary').waitFor();
 };
 const commit=async()=>{assert.match(await page.locator('#cec-import-result').innerText(),/校验通过/);if(await page.locator('#cec-overwrite').count())await page.locator('#cec-overwrite').check();await page.locator('#cec-confirm-import').click()};
 const unchanged=JSON.stringify((await audit()).store);
 for(const rows of [[row('其他','目标值','100')],[row('','目标值','100')],[row('产品降本','目标值','100'),row('包装降本','实际达成','50')],[row('产品降本','目标值','100'),row('包装降本','目标值','50')]]){
  await upload(rows);assert.match(await page.locator('#cec-import-result').innerText(),/校验未通过/);assert(await page.locator('#cec-confirm-import').isDisabled());assert.equal(JSON.stringify((await audit()).store),unchanged);await page.locator('[data-cec-import-close]').first().click();
 }
 await upload([row('产品降本','目标值','100'),row('产品降本','实际达成','50')]);
 assert.match(await page.locator('#cec-import-result').innerText(),/采购部（去计划）/);assert.match(await page.locator('#cec-import-result').innerText(),/产品降本/);await commit();
 let a=await audit(),item=a.metrics.find(m=>m.metric==='分类回归样例');assert(item);assert.equal(item.category,'product');
 assert.equal((await cost()).totals.month.target,baseline.totals.month.target+10000);
 const months=JSON.stringify(a.store.months),total=(await cost()).totals;
 await page.locator('#cec-query').fill('分类回归样例');await page.locator(`[data-cec-edit="${item.id}"]`).click();await editor.locator('[name="category"]').selectOption('packaging');await page.locator('#cec-save').click();
 a=await audit();assert.equal(a.metrics.find(m=>m.id===item.id).category,'packaging');assert.equal(JSON.stringify(a.store.months),months);assert.deepEqual((await cost()).totals,total,'仅改分类不改金额');
 await page.reload();assert.equal((await audit()).metrics.find(m=>m.id===item.id).category,'packaging','分类刷新保留');
 await upload([row('物流降本','目标值','200'),row('物流降本','实际达成','0')]);await commit();
 a=await audit();assert.equal(a.metrics.filter(m=>m.metric==='分类回归样例').length,1,'分类不作为新增指标键');assert.equal(a.metrics.find(m=>m.id===item.id).category,'logistics');assert.equal(a.store.months[item.id+'|2026-10'].actualCents,0);
 const oldHeaders=headers.filter(h=>h!=='降本分类'),oldRow=row('','实际达成','25','产品降本').filter((_,i)=>i!==1);
 await upload([oldRow],oldHeaders);await commit();assert.equal((await audit()).metrics.find(m=>m.id==='purchase-0').category,'product','旧模板继承已分类指标');
 await upload([row('','目标值','1','旧模板新增指标').filter((_,i)=>i!==1)],oldHeaders);assert.match(await page.locator('#cec-import-result').innerText(),/分类/);assert(await page.locator('#cec-confirm-import').isDisabled());await page.locator('[data-cec-import-close]').first().click();
 // v3旧自定义目录没有分类时，保留金额并显式展示未分类，不按名称猜测。
 await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({version:3,metrics:{'purchase-99':{department:'purchase',metricIndex:99,metric:'旧自定义指标'}},months:{'purchase-99|2026-10':{targetCents:10000,actualCents:5000}}})),key);await page.reload();
 let c=await cost();assert.equal(c.categoryRows.find(r=>r.id==='unclassified').values.month.actual,5000);assert.equal(c.totals.month.actual,baseline.totals.month.actual+5000);
 await page.locator('#cec-category').selectOption('unclassified');await page.locator('[data-cec-edit="purchase-99"]').click();await editor.locator('[name="category"]').selectOption('fine');await page.locator('#cec-save').click();c=await cost();assert(!c.categoryRows.some(r=>r.id==='unclassified'));assert.equal(c.totals.month.actual,baseline.totals.month.actual+5000);
 for(const width of [1366,390]){await page.setViewportSize({width,height:900});await page.locator('#cec-reset').click();await page.locator('#cec-new').click();assert(await editor.evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.keyboard.press('Escape');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2))}
 await page.setViewportSize({width:1920,height:1080});await reset();
 console.log('通过：分类筛选/必填/模板/预览/一致性校验、编辑重分类不改金额、导入按原键更新、旧表兼容和未分类迁移');
}
