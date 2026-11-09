import assert from 'node:assert/strict';
import {verifyProductPlatformIsolation} from './product-platform-isolation.mjs';
export async function riskPlatformMenu(page){
 const kinds=[0,1,2,6],platforms=['抖音','快手','视频号','天猫','京东','拼多多'];
 const board=kind=>page.locator('#riskrail [data-rp-board="'+kind+'"]'),menu=kind=>board(kind).locator('[data-rp-platform-menu]'),control=kind=>menu(kind).locator('[data-rp-card-platform]');
 const selected=kind=>control(kind).evaluate(e=>[...e.selectedOptions].map(o=>o.value)),initial={};
 for(const kind of kinds){
  initial[kind]=await selected(kind);assert.deepEqual(await control(kind).locator('option').evaluateAll(es=>es.map(e=>e.value)),kind===1?platforms:['all',...platforms]);
  assert.equal(await menu(kind).locator('.rp-platform-tags').getAttribute('role'),[0,6].includes(kind)?'group':'radiogroup');
  const counts=await menu(kind).locator('.rp-platform-count').allTextContents();assert(counts.every(value=>/^\d+$/.test(value)));
  assert(await menu(kind).locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)));
 }
 for(const kind of kinds){
  const before=Object.fromEntries(await Promise.all(kinds.filter(other=>other!==kind).map(async other=>[other,{selected:await selected(other),text:await board(other).innerText()}])));
  await control(kind).selectOption('快手',{force:true});assert.deepEqual(await selected(kind),['快手']);
  for(const [key,state]of Object.entries(before)){assert.deepEqual(await selected(Number(key)),state.selected);assert.equal(await board(Number(key)).innerText(),state.text,'平台筛选仅更新本榜');}
  await control(kind).selectOption(initial[kind],{force:true});
 }
 await verifyProductPlatformIsolation(page);
 const last=menu(0).locator('[data-rp-platform-option="拼多多"]'),first=menu(0).locator('[data-rp-platform-option="all"]');
 for(const width of [1920,1440,390,320]){
  await page.setViewportSize({width,height:1080});
  for(const kind of kinds)assert(await board(kind).evaluate(e=>e.scrollWidth<=e.clientWidth+1),'平台条不撑宽榜单 '+width);
  await first.focus();await page.keyboard.press('End');assert(await last.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('.rp-platform-tags').getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1}));
  await page.keyboard.press('Home');assert(await first.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('.rp-platform-tags').getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1}));
 }
 await page.setViewportSize({width:1920,height:1080});console.log('通过：四榜平台独立、选项/图标/计数、抽屉继承与隔离、平台条键盘和宽窄屏。');
}
