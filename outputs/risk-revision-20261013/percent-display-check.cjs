const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
const card=p.locator('#riskrail .riskcard').first();assert.equal(await card.locator('.rp-entry').first().locator('[data-rp-field="return"] em').innerText(),'偏差 +12.37%');
await p.locator('#riskrail [data-risk="0"]').click();assert.ok((await p.locator('#dialogbody .rp-list-table tbody').innerText()).includes('偏差 +12.37%'));assert.ok(!/\dpp\b/.test(await p.locator('#dialogbody').innerText()));
await p.locator('#dialogbody [data-qr-detail]').first().click();assert.ok((await p.locator('#dialogbody').innerText()).includes('偏差 +12.37%'));
await p.locator('#drawer-tabs [data-drawer-tab="operating"]').click();const net=p.locator('.up-daily summary').first();assert.ok((await net.innerText()).includes('10%'));assert.ok(!/\dpp\b/.test(await p.locator('#dialogbody').innerText()));
await p.locator('#close').click();await p.locator('#close').click();assert.ok(!/\dpp\b/.test(await p.locator('#salescards').innerText()));assert.deepEqual(errors,[]);console.log('Percent units on risk cards, lists, details and sales; unchanged 12.37 difference; no page errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});

