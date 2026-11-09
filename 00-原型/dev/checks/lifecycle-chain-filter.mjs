import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function lifecycleChainFilter(page){
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 await page.locator('a[href="#lifecycle"]').click();
 const state=()=>page.evaluate(()=>dashboardLifecycleSnapshot()),audit=()=>page.evaluate(()=>lifecycleTargetsAudit()),tab=key=>page.locator('#lt-chain-tabs [data-lt-chain="'+key+'"]');
 const names=await page.evaluate(()=>dashboardSalesReviewSnapshot().chains.map(row=>row.name));
 assert.deepEqual(await page.locator('#lt-chain-tabs button').allTextContents(),['全部',...names],'复用销售四链群，个护健康只展示一个Tab');
 assert.equal((await state()).chainFilter,'all');
 const other=await page.evaluate(()=>JSON.stringify({sales:dashboardSalesReviewSnapshot(),projects:projectPanoramaAudit().state}));
 for(const mode of ['month','quarter','year']){
  await page.locator('#time-lifecycle [data-time-mode="'+mode+'"]').click();await tab('all').click();
  const baseline=[];
  for(let stage=0;stage<8;stage++){await page.locator('#lifecards [data-life="'+stage+'"]').click();baseline.push(await state())}
  const allTargets=(await audit()).dashboard;
  for(const chain of [0,1,2,3]){
   await tab(chain).click();
   assert.equal((await state()).chainFilter,String(chain));
   const cards=await page.locator('#lifecards .lifecard').evaluateAll(nodes=>nodes.map(card=>({target:card.querySelector('[data-lt-card-target]').textContent,actual:card.querySelector('[data-lt-card-actual]').textContent})));
   for(let stage=0;stage<8;stage++){
    const fact=baseline[stage].chains[chain];assert.equal(+cards[stage].actual.replaceAll(',',''),fact.actual,'八类规划实际数沿用所选链群');
    assert.equal(cards[stage].target,fact.targetMeta.state==='complete'?fact.target.toLocaleString('zh-CN'):'—');
   }
   assert.equal(await page.locator('#lifetable tbody tr').count(),1,'单链群不重复展示汇总行');
   assert.equal(await page.locator('#lifetable tbody tr td').first().innerText(),names[chain]);
   const link=page.locator('#lifetable [data-life-completed="period"]').first();
   assert.equal(await link.getAttribute('data-life-row'),String(chain),'下钻保留原始链群索引');await link.click();assert((await page.locator('#toast').innerText()).includes('链群 = '+names[chain]));
   const stageBefore=(await state()).stage;await page.locator('#lifecards [data-life="0"] [data-lt-card-actual]').click();assert.equal((await state()).stage,stageBefore);assert((await page.locator('#toast').innerText()).includes('链群 = '+names[chain]));
   assert.deepEqual((await audit()).dashboard,allTargets,'公司目标与事实不受展示筛选影响');
  }
  await page.locator('#lifecards [data-life="0"]').click();
  const snapshot=await state(),values=(await audit()).saved.years[2026].values;
  const months=mode==='year'?Array.from({length:12},(_,i)=>i+1):mode==='quarter'?[snapshot.period.value*3-2,snapshot.period.value*3-1,snapshot.period.value*3]:[snapshot.period.value];
  const parts=(await audit()).saved.years[2026].mergedParts;
  const merged=months.reduce((sum,m)=>sum+(parts?.[0]?.[Math.floor((m-1)/3)]||[values[3][0][Math.floor((m-1)/3)]]).reduce((n,q)=>n+Math.floor(q/3)+((m-1)%3<q%3?1:0),0),0);
  assert.equal(snapshot.summary.target,merged,'个护与健康两类目标合并计算');
  await tab('all').click();assert.equal(await page.locator('#lifetable tbody tr').count(),5);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify({sales:dashboardSalesReviewSnapshot(),projects:projectPanoramaAudit().state})),other);
 await tab('all').focus();await tab('all').press('End');assert.equal((await state()).chainFilter,'3');await tab(3).press('Home');assert.equal((await state()).chainFilter,'all');
 for(const width of [1920,1440,1280,1024,600,390,320]){
  await page.setViewportSize({width,height:1080});await tab(3).click();
  assert(await page.locator('#lifecycle').evaluate(el=>el.scrollWidth<=el.clientWidth+2),'模块不撑开页面 '+width);
  assert(await page.locator('#lt-chain-tabs').isVisible());
  const layout=await page.locator('#lifecycle .sectionhead').evaluate(el=>{const tabs=el.querySelector('#lt-chain-tabs').getBoundingClientRect(),time=el.querySelector('.module-timebar')?.getBoundingClientRect();return !time||Math.min(tabs.right,time.right)-Math.max(tabs.left,time.left)<=0||Math.min(tabs.bottom,time.bottom)-Math.max(tabs.top,time.top)<=0});assert(layout,'链群与期间控件不重叠 '+width);
  if([1920,390].includes(width))await page.locator('#lifecycle').screenshot({path:fileURLToPath(new URL('../../outputs/lifecycle-chain-filter-'+width+'.png',import.meta.url))});
 }
 await page.setViewportSize({width:1920,height:1080});await tab('all').click();
 console.log('通过：四链群、八规划、月季年与合并目标、原索引下钻、键盘及全公司口径隔离、七种宽度');
}
