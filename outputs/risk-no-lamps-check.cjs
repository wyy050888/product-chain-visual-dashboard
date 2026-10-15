const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
assert.equal(await p.locator('#riskrail .rp-lamp-tabs,#riskrail [data-rp-lamp],#riskrail [data-lamp]').count(),0);
assert.ok(await p.locator('#riskrail .rp-value.red').count());
await p.locator('#riskrail [data-risk="0"]').click();
for(const k of [0,1,2,3,4,6]){
 if(k)await p.locator('[data-drawer-tab="ranking-'+k+'"]').click();
 assert.equal(await p.locator('#rp-list-lamps,.rp-lamp-tabs,[data-rp-lamp],.rp-list-risks .rp-risk').count(),0);
 const text=await p.locator('.rp-list-table').innerText();assert.ok(!/红灯|黄灯|灯色待定/.test(text));assert.ok(text.includes('命中风险 / 优先级'));
 const rows=p.locator('.rp-list-table tbody tr');assert.ok(await rows.count());assert.ok(await rows.count()<=20);
 await p.locator('[data-rp-filter="query"]').fill('no-result-xyz');assert.equal(await rows.count(),0);assert.ok((await p.locator('.rp-list-table').innerText()).includes('暂无风险记录'));await p.locator('[data-rp-reset]').click();assert.ok(await rows.count());
}
await p.locator('[data-drawer-tab="ranking-0"]').click();await p.locator('#qr-list-table [data-qr-detail]').first().click();
const tabs=await p.locator('[data-drawer-tab]').evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.drawerTab,text:n.textContent})));const handling=tabs.find(t=>t.text.includes('风险与处理'));assert.ok(handling);await p.locator('[data-drawer-tab="'+handling.key+'"]').click();
assert.equal(await p.locator('.rp-detail-lamp-note').count(),0);assert.ok(!(await p.locator('#dialogbody').innerText()).includes('灯色待定'));
await p.locator('#close').click();await p.locator('[data-drawer-tab="ranking-1"]').click();await p.locator('#rf-list-table [data-riskitem]').first().click();assert.ok(!/红灯|黄灯|灯色待定/.test(await p.locator('#dialogbody').innerText()));await p.locator('#close').click();await p.locator('#close').click();await p.setViewportSize({width:390,height:844});
assert.equal(await p.locator('#riskrail .rp-lamp-tabs').count(),0);assert.deepEqual(errors,[]);console.log('NO LAMP FILTERS / NO GRADE BADGES / SIX LISTS / SEARCH RESET / 20 ROWS / DETAIL / MOBILE PASSED');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
