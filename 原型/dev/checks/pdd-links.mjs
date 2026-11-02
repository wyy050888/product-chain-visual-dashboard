import assert from 'node:assert/strict';

export async function pddLinks(page){
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const card=page.locator('#riskrail .rp-shop-card');
 await card.locator('[data-rp-platform-option="拼多多"]').click();
 const entry=card.locator('.rp-shop-entry:has(.rp-shop-link-counts)').first();
 assert.equal(await entry.locator('[data-rp-field="score"]').count(),0);
 const cardRed=entry.locator('[data-rp-field="redLinks"]'),cardYellow=entry.locator('[data-rp-field="yellowLinks"]');
 const id=Number((await entry.getAttribute('data-rp-row')).split(':')[1]);
 const links=await page.evaluate(id=>window.pddShopLinksSnapshot(id).all,id);
 const redIds=links.filter(l=>l.redCount>=3).map(l=>l.id),yellowIds=links.filter(l=>l.redCount>0&&l.redCount<3).map(l=>l.id);
 assert.equal(Number(await cardRed.locator('strong').innerText()),redIds.length);
 assert.equal(Number(await cardYellow.locator('strong').innerText()),yellowIds.length);
 const pop=page.locator('#rp-pdd-links-popover');
 assert.equal(await entry.locator('[data-rp-pdd-shop],[aria-haspopup="dialog"]').count(),0);
 for(const count of [cardRed,cardYellow]){await count.hover();await settle();assert.equal(await pop.isVisible(),false);await count.click();assert.equal(await pop.isVisible(),false);await page.locator('.sd-detail').waitFor();await page.locator('#close').click();assert.equal(await page.locator('#overlay').isVisible(),false,'点击榜单记录后关闭详情再继续验证')}
 await card.locator('[data-risk="1"]').click();await page.locator('[data-rp-reset]').click();
 await page.locator('#rf-list-platform').selectOption('拼多多',{force:true});
 const table=page.locator('#rf-list-table');
 const keys=await table.locator('[data-rp-sort]').evaluateAll(ns=>ns.map(n=>n.dataset.rpSort));
 assert.deepEqual(keys.slice(-2),['redLinks','yellowLinks']);assert.ok(!keys.some(k=>['score','productScore','logisticsScore','serviceScore'].includes(k)));
 await table.evaluate(el=>el.scrollLeft=el.scrollWidth);await settle();
 const red=table.locator('[data-rp-pdd-shop="'+id+'"][data-rp-pdd-tone="red"]'),yellow=table.locator('[data-rp-pdd-shop="'+id+'"][data-rp-pdd-tone="yellow"]');
 await red.hover();await pop.waitFor({state:'visible'});
 assert.deepEqual(await pop.locator('th').allTextContents(),['商品链接','近30天品质退款率（三级分类）','近30天品质求助平台率（三级分类）','近30天品质文本情感分（三级分类）','近30天品质退款率（主营链群）','近30天品质求助平台率（主营链群）','近30天品质文本情感分（主营链群）']);
 assert.deepEqual(await pop.locator('[data-rp-pdd-link]').evaluateAll(ns=>ns.map(n=>n.dataset.rpPddLink)),redIds);
 assert.equal(await pop.locator('.risk-thumb').count(),redIds.length);
 const first=links.find(l=>l.id===redIds[0]);
 assert.deepEqual(await pop.locator('tbody tr').first().locator('td').allTextContents().then(cells=>cells.slice(1)),['thirdRank','mainRank'].flatMap(key=>first.metrics.map(m=>m[key])));
 await pop.locator('.rp-pdd-link-scroll').hover();await page.waitForTimeout(220);assert.equal(await pop.isVisible(),true);
 await page.keyboard.press('Escape');assert.equal(await pop.isVisible(),false);
 await yellow.focus();await pop.waitFor({state:'visible'});
 assert.deepEqual(await pop.locator('[data-rp-pdd-link]').evaluateAll(ns=>ns.map(n=>n.dataset.rpPddLink)),yellowIds);
 await page.keyboard.press('Escape');
 // Narrow screens retain all seven fields in a scrollable floating table.
 await page.setViewportSize({width:390,height:844});await settle();await red.focus();await pop.waitFor({state:'visible'});
 const narrow=await pop.boundingBox();assert.ok(narrow.x>=12&&narrow.x+narrow.width<=378);
 const sizing=await pop.locator('.rp-pdd-link-scroll').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,table:el.querySelector('table').getBoundingClientRect().width,inline:el.querySelector('table').getAttribute('style')}));
 assert.ok(sizing.scroll>sizing.client,JSON.stringify(sizing));
 await page.keyboard.press('Escape');await page.setViewportSize({width:1920,height:1080});await settle();
 await table.evaluate(el=>el.scrollLeft=el.scrollWidth);await settle();
 const count=table.locator('[data-rp-pdd-tone="red"]').first();
 await count.hover();await pop.waitFor({state:'visible'});
 assert.equal(await pop.locator('tbody tr').count(),Number(await count.innerText()));
 const box=await pop.boundingBox();assert.ok(box.x>=12&&box.x+box.width<=1908&&box.y>=12&&box.y+box.height<=1068);
 await pop.locator('.rp-pdd-link-scroll').evaluate(el=>el.scrollTop=120);await page.waitForTimeout(80);assert.equal(await pop.isVisible(),true);
 await page.keyboard.press('Escape');assert.equal(await pop.isVisible(),false);assert.equal(await page.locator('#overlay').isVisible(),true);
 await count.click();await pop.waitFor({state:'visible'});
 await page.locator('#rf-list-platform').selectOption('抖音',{force:true});await pop.waitFor({state:'hidden'});
 assert.equal(await table.locator('[data-rp-sort="redLinks"]').count(),0);assert.equal(await table.locator('[data-rp-sort="score"]').count(),1);
 await page.locator('#close').click();
}
