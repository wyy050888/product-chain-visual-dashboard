const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
await page.waitForTimeout(350);
assert.equal(await page.locator('.pf-main-scope').count(),0);
assert.equal(await page.locator('#riskrail .riskcard').count(),6);
assert.equal(await page.locator('#riskrail .riskcard').first().locator('.rp-entry').count(),6);
assert.equal(await page.locator('#riskrail .riskcard').first().locator('.rp-entry').first().locator('.rp-key-metrics .rp-item').count(),4);
assert.equal(await page.locator('#riskrail .riskcard').first().locator('.rp-entry').first().locator('.rp-support-metrics .rp-item').count(),3);
const box=await page.locator('#risk').evaluate(el=>{const style=getComputedStyle(el),r=el.getBoundingClientRect(),head=el.querySelector('.sectionhead').getBoundingClientRect(),cards=[...el.querySelectorAll('.riskcard')].map(c=>c.getBoundingClientRect());return {background:style.backgroundColor,border:style.borderTopWidth,container:[r.x,r.y,r.right,r.bottom],head:[head.x,head.y,head.right],cards:cards.map(c=>[c.x,c.y,c.right,c.bottom]),entry:el.querySelector('.rp-entry').getBoundingClientRect().height};});
assert.equal(box.background,'rgb(255, 255, 255)');assert.equal(box.border,'1px');
assert.ok(box.cards.every(c=>c[0]>=box.container[0]&&c[2]<=box.container[2]&&c[3]<=box.container[3]));assert.ok(box.cards[0][1]===box.cards[2][1]);assert.ok(box.entry<140);
await page.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/risk-revision-20261013/risk-layout-desktop.png'});
await page.locator('#riskrail [data-rp-card-platform="0"]').selectOption('抖音');
for(const val of await page.locator('#riskrail [data-rp-card-platform]').evaluateAll(els=>els.map(el=>el.value)))assert.equal(val,'抖音');
await page.locator('#riskrail [data-risk="0"]').click();
assert.equal(await page.locator('#dialogbody .pf-attribute').count(),1);assert.equal(await page.locator('#dialogbody .list-pagination').getAttribute('data-list-size'),'20');
assert.deepEqual(await page.locator('#dialogbody [data-rp-filter="chain"] option').allTextContents(),['全部','个护类','环境类','清洁类','厨电类','健康类']);
await page.locator('#dialogbody .pf-attribute summary').click();
await page.locator('#dialogbody [data-pf-attribute-key="isNew"][data-pf-attribute-choice="yes"]').click();
assert.equal(await page.locator('#dialogbody [data-rp-filter="isNew"]').inputValue(),'yes');
await page.locator('#dialogbody [data-rp-reset]').click();assert.equal(await page.locator('#dialogbody .pf-attribute-value').innerText(),'全部');
await page.locator('#dialogbody [data-rp-filter="query"]').fill('Q517');assert.ok((await page.locator('#dialogbody .rp-list-table').innerText()).includes('Q517'));
await page.locator('#close').click();assert.equal(await page.locator('.pf-main-scope').count(),0);
for(const width of [1440,1200,390]){await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('#riskrail .riskcard').count(),6);if(width===390)await page.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/risk-revision-20261013/risk-layout-mobile.png'});}
assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:'No global scope; contained header and six cards; full metrics; compact rows; linked platforms; local filters/search/reset; 20 rows; responsive; no errors',entryHeight:box.entry}));}
finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});

