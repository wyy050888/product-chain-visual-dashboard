const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const p=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.stack));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');await p.waitForTimeout(400);
assert.deepEqual(errors,[]);
assert.equal(await p.locator('#projectsearch').getAttribute('placeholder'),'项目名称');
assert.ok(await p.locator('#projectsearch').evaluate(n=>n.closest('.ui-business-search')===n.closest('.unified-filter-extras').firstElementChild));
await p.locator('#riskrail [data-risk="0"]').click();await p.waitForTimeout(120);
const input=p.locator('[data-rp-filter="query"]');
assert.ok(await input.evaluate(n=>n.closest('label')===n.closest('.rp-list-tools').firstElementChild));
assert.ok((await input.boundingBox()).width>=280);
const style=await p.locator('[data-rp-filter="brand"]').evaluate(n=>({parent:n.parentElement.className,border:getComputedStyle(n.parentElement).borderWidth,height:n.parentElement.clientHeight}));
console.log('FILTER STYLE',style);assert.ok(style.parent.includes('unified-input-group'));assert.ok(style.height>=34);
assert.equal(await p.locator('#rp-list-count,.rp-lamp-note').count(),0);
assert.equal(await p.locator('[data-rp-trend]').inputValue(),'gsv');
assert.equal(await p.locator('.rp-mini-trend').first().locator('title').count(),7);
let identity=await p.locator('#qr-list-table .rp-identity').first().innerText();const code=identity.match(/SPU\s+([^\s]+)/)[1];
await input.fill(code.toLowerCase());assert.ok(await p.locator('#qr-list-table tbody tr').count()>0);assert.ok((await p.locator('#qr-list-table .rp-identity').allTextContents()).every(x=>x.includes(code)));
await input.fill('zz-no-result');assert.ok((await p.locator('#qr-list-table').innerText()).includes('暂无'));
await input.fill('');
await p.locator('.drawer-platform-switch [data-platform-value="抖音"]').click();
assert.ok((await p.locator('#qr-list-table tbody tr td:nth-child(3)').allTextContents()).every(t=>t.trim()==='抖音'));
const before=await p.locator('.rp-mini-trend').first().locator('title').allTextContents();
const returned={};for(const metric of ['margin','return','received','gsv']){await p.locator('[data-rp-trend]').selectOption(metric);assert.equal(await p.locator('.rp-mini-trend').first().getAttribute('data-trend-metric'),metric);returned[metric]=await p.locator('.rp-mini-trend').first().locator('title').allTextContents();assert.equal(returned[metric].length,7)}
assert.deepEqual(before,returned.gsv);assert.ok(returned.margin.every(t=>t.includes('%')));
// 与详情逐日台账核对同一产品、同一平台的七天GSV。
await p.locator('#qr-list-table [data-qr-detail]').first().click();await p.locator('[data-drawer-tab="operating"]').click();
await p.locator('#up-daily-table').evaluate(n=>{const d=n.closest('details');if(d&&!d.open)d.querySelector('summary').click()});
if(await p.locator('#up-daily-pages .list-page-arrow:not(:disabled)').count())await p.locator('#up-daily-pages .list-page-arrow').last().click();
const daily=await p.locator('#up-daily-table tbody tr').evaluateAll(ns=>ns.map(tr=>[...tr.cells].map(td=>td.textContent.trim())));
for(const title of before){const day=title.slice(0,10),value=title.split(' GSV ')[1];assert.equal(daily.find(r=>r[0]===day)?.[4],value,day)}
await p.locator('#close').click();assert.equal(await p.locator('[data-rp-trend]').inputValue(),'gsv');
await p.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/list-trends-check.png'});
const nav=p.locator('#rp-list-pagination .list-pagination');if(Number(await nav.getAttribute('data-list-pages'))>1){await nav.locator('[data-list-page="2"]').first().click();assert.equal(await nav.getAttribute('data-list-current'),'2');await p.locator('[data-rp-trend]').selectOption('received');assert.equal(await nav.getAttribute('data-list-current'),'2')}
for(const k of [1,2,3,4,6]){
 await p.locator('[data-drawer-tab="ranking-'+k+'"]').click();await p.waitForTimeout(80);
 assert.equal(await p.locator('#rp-list-count,.rp-lamp-note').count(),0);
 assert.equal(await p.locator('[data-rp-trend]').inputValue(),'gsv');
 assert.equal(await p.locator('#rp-list-pagination .list-pagination').getAttribute('data-list-size'),'20');
 assert.ok(await p.locator('[data-rp-filter="query"]').evaluate(n=>n.closest('label')===n.closest('.rp-list-tools').firstElementChild));
 console.log('LIST',k,await p.locator('.rp-mini-trend').count());
 if(k===1){const text=await p.locator('#rf-list-table .rp-identity').first().innerText();const id=text.match(/ID\s+(\d+)/)[1];await p.locator('[data-rp-filter="query"]').fill(id);assert.equal(await p.locator('#rf-list-table tbody tr').count(),1);await p.locator('[data-rp-filter="query"]').fill('');await p.locator('[data-rp-trend]').selectOption('margin');assert.equal(await p.locator('.rp-mini-trend').count(),0);assert.ok(await p.locator('.rp-trend-empty').count());await p.locator('[data-rp-trend]').selectOption('gsv')}
 else{await p.locator('[data-rp-trend]').selectOption('return');assert.ok(await p.locator('.rp-mini-trend').count())}
 if(k===3||k===4){await p.locator('[data-ir-dimension="chain"]').click();assert.ok(await p.locator('.rp-mini-trend').count());await p.locator('[data-rp-trend]').selectOption('received');await p.locator('[data-rp-group]').first().click();assert.ok(await p.locator('.rp-mini-trend').count());await p.locator('#close').click();assert.equal(await p.locator('[data-rp-trend]').inputValue(),'received')}
}
await p.locator('#close').click();await p.setViewportSize({width:390,height:844});
await p.locator('#riskrail [data-risk="0"]').click();await p.waitForTimeout(100);
assert.ok((await p.locator('[data-rp-filter="query"]').boundingBox()).width>200);
assert.ok(await p.locator('#dialog').evaluate(n=>n.getBoundingClientRect().width<=innerWidth));
await p.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/list-trends-mobile-check.png'});
assert.deepEqual(errors,[]);console.log('SEARCH / UNIFIED FILTERS / SEVEN-DAY FACTS / METRIC SWITCH / PAGINATION / GROUPS / MOBILE PASSED');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
