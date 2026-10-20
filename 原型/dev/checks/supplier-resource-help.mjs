import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function verifySupplierResourceHelp(page,root){
 const headings=root.locator('.scp-section-heading h3'),help=root.locator('[data-scp-resource-help]'),tip=page.locator('#metric-tooltip'),year=root.locator('[data-scp-period=resource] [data-scp-year]');
 assert.deepEqual(await headings.allTextContents(),['整机供应商','物料供应商']);assert.deepEqual(await headings.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).fontSize)),['16px','16px']);
 await help.evaluate(node=>node.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.mouse.move(0,0);
 await help.hover();await tip.waitFor({state:'visible'});assert.match(await tip.getAttribute('class'),/metric-tooltip-scp-resource/);assert.equal(await tip.locator('h4').innerText(),'整机资源池预警');
 assert.equal(await tip.locator('.scp-sourcing-rule strong').innerText(),'＜100%');assert.equal(await tip.locator('dt,.scp-resource-help-formula,.scp-resource-help-definitions').count(),0);assert.doesNotMatch(await tip.innerText(),/÷|统计去重|累计资源|仅展示/);assert.match(await tip.innerText(),/达到或超过100%标绿/);assert.doesNotMatch(await tip.innerText(),/目标未配置|不判定预警|显示[“]?—/);
 await page.keyboard.press('Escape');assert(await tip.isHidden());await help.focus();await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');await page.keyboard.press('Enter');await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');
 await year.selectOption('2025');await help.click();assert.match(await tip.locator('.scp-sourcing-rule>span').innerText(),/2025/);await page.keyboard.press('Escape');await year.selectOption('2026');await page.mouse.move(0,0);
 for(const width of [1920,1366,390]){
  await page.setViewportSize({width,height:1080});await help.evaluate(node=>node.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await help.click();assert(await tip.evaluate(node=>{const b=node.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight}),'资源池提示不越界 '+width);
  if(width===1920)await tip.screenshot({path:fileURLToPath(new URL('../../outputs/supplier-resource-help.png',import.meta.url))});
  assert(await root.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'标题放大不撑宽模块 '+width);await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});await root.scrollIntoViewIfNeeded();console.log('通过：供应商双标题16px、资源池预警条件提示、悬浮/点击/键盘、年份联动与窄屏边界');
}
