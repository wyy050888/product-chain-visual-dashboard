import {verifyDetailContact} from './detail-contact.mjs';
import {verifyMetricHelpOnly} from './metric-help-only.mjs';
import assert from 'node:assert/strict';

async function stayOnTooltip(page,trigger,tip,name){
 await page.mouse.move(0,0);await trigger.scrollIntoViewIfNeeded();await trigger.hover();await tip.waitFor({state:'visible'});
 assert.notEqual(await tip.evaluate(el=>getComputedStyle(el).pointerEvents),'none',name+'允许鼠标进入');
 const box=await tip.boundingBox();await page.mouse.move(box.x+Math.min(14,box.width/2),box.y+Math.min(14,box.height/2),{steps:8});
 await page.waitForTimeout(400);assert(await tip.isVisible(),name+'从触发点移入提示不消失');
 const content=await tip.innerText();await page.mouse.move(box.x+Math.min(24,box.width/2),box.y+Math.min(24,box.height/2),{steps:4});await page.waitForTimeout(350);assert(await tip.isVisible(),name+'内部移动保持显示');assert.equal(await tip.innerText(),content,name+'鼠标在提示内不切换数据');
 const text=tip.locator('b,strong,p,li').first();if(await text.count())await text.click();else await page.mouse.click(box.x+Math.min(24,box.width/2),box.y+Math.min(24,box.height/2));await page.waitForTimeout(300);assert(await tip.isVisible(),name+'内部点击不关闭');
 if(await tip.evaluate(el=>el.scrollHeight>el.clientHeight+2)){await page.mouse.wheel(0,100);await page.waitForTimeout(300);assert(await tip.isVisible(),name+'内部滚动不关闭');}
 await page.mouse.move(0,0);await tip.waitFor({state:'hidden',timeout:1800});
 await trigger.evaluate(el=>el.blur());await trigger.focus();await tip.waitFor({state:'visible'});const overlay=await page.locator('#overlay').isVisible();await page.keyboard.press('Escape');await tip.waitFor({state:'hidden'});assert.equal(await page.locator('#overlay').isVisible(),overlay,name+'Esc仅关闭提示');await trigger.evaluate(el=>el.blur());console.log('通过悬停：'+name);
}

export async function tooltipHover(page){
 await page.setViewportSize({width:1920,height:900});
 await verifyMetricHelpOnly(page);
 await stayOnTooltip(page,page.locator('#riskrail .card-metric-help').first(),page.locator('#metric-tooltip'),'全局指标说明');
 // 模拟动态表格的截断文本，验证同一委托组件，不依赖特定商品名恰好超长。
 await page.evaluate(()=>{const table=document.createElement('table');table.id='tooltip-check-cell';table.style.cssText='position:fixed;left:60px;top:130px;width:150px;table-layout:fixed;z-index:7000;background:white';table.innerHTML='<tbody><tr><td tabindex="0" style="width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">这是用于核验动态表格截断原文悬停行为的一段足够长的商品名称</td></tr></tbody>';document.body.append(table)});
 await stayOnTooltip(page,page.locator('#tooltip-check-cell td'),page.locator('#ui-cell-tooltip'),'表格原文');await page.locator('#tooltip-check-cell').evaluate(el=>el.remove());
 await page.locator('a[href="#risk"]').click();await page.locator('#riskrail [data-risk="0"]').first().click();
 await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();await page.locator('.up-detail').waitFor();await page.locator('[data-drawer-tab="operating"]').click();
 await stayOnTooltip(page,page.locator('.up-detail [data-up-trend-point]').first(),page.locator('#up-sales-tooltip'),'产品经营趋势');
 await page.locator('[data-drawer-tab="quality"]').click();await verifyDetailContact(page);await stayOnTooltip(page,page.locator('.up-detail [data-up-return-point]').first(),page.locator('#up-sales-tooltip'),'产品退货趋势');
 await page.locator('.up-detail .up-contact-bar span').first().hover();assert.equal(await page.locator('#up-contact-tooltip').count(),0,'进线构成不弹额外浮层');for(let depth=0;depth<3&&await page.locator('#overlay').isVisible();depth++)await page.locator('#close').click();await page.locator('#overlay').waitFor({state:'hidden'});
 await page.locator('a[href="#matrix"]').click();const filters=page.locator('#matrix [data-kpm-filter]');for(const select of await filters.all())if(await select.getAttribute('multiple')!==null)await select.evaluate(el=>{for(const option of el.options)option.selected=option.value==='all';el.dispatchEvent(new Event('change',{bubbles:true}))});
 await stayOnTooltip(page,page.locator('#matrix circle[data-kpm-point]').first(),page.locator('#kpm-point-tooltip'),'关键产品圆点');
 await page.getByRole('button',{name:'配置全局规则',exact:true}).click();await page.locator('[data-brc-new-tab="success"]').click();await stayOnTooltip(page,page.locator('#brc-new-panel .metric-help').first(),page.locator('#metric-tooltip'),'规则配置说明');
 console.log('通过：指标说明仅问号触发，图表数据提示鼠标移入、停留、内部点击/滚动、移出和键盘关闭');
}
