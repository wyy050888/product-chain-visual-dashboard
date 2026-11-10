import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function drawerGradeOptions(page){
 // 浏览器返回旧抽屉时，不应保留已取消的筛选值而使产品被静默隐藏。
 const box=vm.createContext({rpListState:{filters:{0:{grade:'unrated'},2:{grade:['S','unrated']}}},pfSelected:value=>Array.isArray(value)?value:value==='all'?[]:[value]});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/03-filters.js',import.meta.url),'utf8'),box);
 assert.equal(box.rpSavedFilters(0).grade,'all');assert.deepEqual([...box.rpSavedFilters(2).grade],['S']);
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 for(const kind of [0,6,4,3,2]){
  await page.locator('#riskrail [data-risk="'+kind+'"]').first().click();
  const grade=page.locator('#dialogbody select[data-rp-filter="grade"]');
  assert.deepEqual(await grade.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value)),['all','S','A','B','C']);
  assert.equal(await page.locator('#dialogbody [data-rp-grade="unrated"]').count(),0);
  assert.doesNotMatch(await page.locator('#dialogbody').innerText(),/待分级/);
  const take=()=>page.evaluate(()=>dashboardRankingGradeSnapshot().rows.map(r=>[r.spuId,r.grade]));
  const original=await take();
  const pick=async value=>{
   const menu=page.locator('#dialogbody .pf-multi[data-pf-multi-label="产品分级"]');
   if(await menu.getAttribute('open')===null)await menu.locator(':scope>summary,:scope>[data-pf-multi-trigger]').click();
   await menu.locator('[data-pf-multi-option][value="'+value+'"]').check();
  };
  await pick('S');assert((await take()).every(([,level])=>level==='S'));
  await pick('all');assert.deepEqual(await take(),original,'全部仍包含原有产品，取消选项不删记录');
  await page.locator('#close').click();
 }
 console.log('五类产品风险榜抽屉仅保留全部/S/A/B/C，筛选恢复与产品记录保留通过');
}
