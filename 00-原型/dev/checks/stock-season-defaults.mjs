import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function stockSeasonDefaults(page){
 const source=fs.readFileSync(new URL('../../src/modules/risk-presentation/02-platforms.js',import.meta.url),'utf8');
 const context=vm.createContext({DATA_CUTOFF:'2026-10-27'});vm.runInContext(source.slice(source.indexOf('function rpStockDefaultSeason('),source.indexOf('const rpCardSeasons=')),context);
 for(let month=1;month<=12;month++)assert.equal(context.rpStockDefaultSeason('2026-'+String(month).padStart(2,'0')+'-01'),month>=10?'冬季品':month>=4&&month<=6?'夏季品':'all');
 const card=kind=>page.locator('#riskrail [data-rp-board="'+kind+'"]'),control=kind=>card(kind).locator('[data-rp-card-season]');
 const values=kind=>control(kind).evaluate(node=>[...node.selectedOptions].map(option=>option.value));
 for(const [date,season]of [['2026-02-15T04:00:00Z','all'],['2026-03-31T16:00:00Z','夏季品'],['2026-08-15T04:00:00Z','all'],['2026-10-27T04:00:00Z','冬季品']]){
  await page.clock.setFixedTime(new Date(date));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
  const data=await page.evaluate(()=>({3:shortageRankingSnapshot().rows,4:stagnantRankingSnapshot().rows}));
  for(const kind of [3,4]){
   assert.deepEqual(await values(kind),[season],'实时库存榜按当前北京时间季度默认');
   assert.equal(await card(kind).locator('[data-rp-season-option="'+season+'"]').getAttribute('aria-checked'),'true');
   const expected=data[kind].filter(row=>season==='all'||row.attribute===season);
   assert.equal(Number((await card(kind).locator('[data-risk]').innerText()).match(/\d+/)[0]),expected.length,'默认筛选更新全量入榜数，零条不回退全部');
   assert.deepEqual(await card(kind).locator('.rp-stock-entry .rp-identity b').allTextContents(),expected.slice(0,6).map(row=>row.name),'先默认筛选再取Top6');
  }
  for(const kind of [0,2,6])assert.deepEqual(await values(kind),['all'],'不修改其他榜的季品默认值');
 }
 const raw=await page.evaluate(()=>({3:shortageRankingSnapshot().rows,4:stagnantRankingSnapshot().rows}));
 const verifyLinked=async season=>{for(const kind of [3,4]){
  assert.deepEqual(await values(kind),[season]);assert.equal(await control(kind).evaluate(node=>node.multiple),false);
  assert.equal(await card(kind).locator('.rp-season-tags').getAttribute('role'),'radiogroup');assert.equal(await card(kind).locator('[data-rp-season-option][aria-checked="true"]').count(),1);
  const tag=card(kind).locator('[data-rp-season-option="'+season+'"]');assert.equal(await tag.getAttribute('aria-checked'),'true');assert.equal(await tag.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(230, 240, 255)');
  const expected=raw[kind].filter(row=>season==='all'||row.attribute===season);assert.equal(Number((await card(kind).locator('[data-risk]').innerText()).match(/\d+/)[0]),expected.length);assert.deepEqual(await card(kind).locator('.rp-stock-entry .rp-identity b').allTextContents(),expected.slice(0,6).map(row=>row.name));
 }};
 for(const [kind,season]of [[3,'夏季品'],[4,'冬季品'],[3,'四季品'],[4,'all']]){await card(kind).locator('[data-rp-season-option="'+season+'"]').click();await verifyLinked(season);await card(kind).locator('[data-rp-season-option="'+season+'"]').click();await verifyLinked(season)}
 await card(3).locator('[data-rp-season-option="冬季品"]').focus();await page.keyboard.press('ArrowRight');await verifyLinked('四季品');await page.keyboard.press('Home');await verifyLinked('all');await page.keyboard.press('End');await verifyLinked('四季品');
 for(const width of [390,320]){await page.setViewportSize({width,height:1080});await card(3).locator('[data-rp-season-option="冬季品"]').click();await verifyLinked('冬季品');for(const kind of [3,4])assert(await card(kind).evaluate(node=>node.scrollWidth<=node.clientWidth+1))}await page.setViewportSize({width:1920,height:1080});
 await control(3).selectOption('all',{force:true});await control(4).selectOption('夏季品',{force:true});
 await page.locator('#globaltime [data-time-mode="year"]').dispatchEvent('click');await page.locator('#globaltime [data-time-year]').selectOption('2025',{force:true});
 assert.deepEqual(await values(3),['夏季品']);assert.deepEqual(await values(4),['夏季品'],'历史时间和重绘不覆盖联动手选');
 await card(4).locator('[data-risk]').click();assert.deepEqual(await page.locator('[data-rp-filter="attribute"]').evaluate(node=>[...node.selectedOptions].map(option=>option.value)),['夏季品'],'完整榜单继承当前季品');await page.locator('#close').click();
 await control(4).selectOption('冬季品',{force:true});assert.deepEqual(await values(3),['冬季品'],'两榜手选同步且不累计');
 console.log('通过：四季度默认、北京时间季度边界、Q2夏/Q4冬、Q1/Q3全部、数量/Top6、空结果、两榜双向联动单选/键盘/窄屏、手选与历史期间隔离、完整榜单继承');
}
