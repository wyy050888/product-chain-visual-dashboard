const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
const name=(await p.locator('#projecttable tbody td').first().innerText()).split('\n')[0];
await p.locator('#projectsearch').fill(name);assert.ok(await p.locator('#projecttable tbody tr').count());assert.ok((await p.locator('#projecttable tbody td:first-child').allTextContents()).every(t=>t.includes(name)));
await p.locator('#projectsearch').fill('project-no-result');assert.ok((await p.locator('#projecttable').innerText()).includes('暂无匹配项目'));await p.locator('#projectsearch').fill('');
await p.locator('#lifetable [data-life-completed="period"]').first().click();await p.waitForTimeout(100);await p.locator('[data-drawer-tab="products"]').click();
assert.equal(await p.locator('#life-product-search').getAttribute('placeholder'),'产品名称 / SPU码 / 型号');
assert.ok(await p.locator('#life-product-search').evaluate(n=>n.parentElement.classList.contains('unified-input-group')));
const rowName=(await p.locator('#life-products-results tbody tr td:nth-child(2)').first().innerText()).split('\n')[0];await p.locator('#life-product-search').fill(rowName.toLowerCase());assert.ok((await p.locator('#life-products-results tbody tr').allTextContents()).every(t=>t.includes(rowName)));
await p.locator('#life-product-search').fill('spu-no-result');assert.ok((await p.locator('#life-products-results').innerText()).includes('暂无匹配'));
await p.locator('#close').click();await p.locator('#riskrail [data-risk="0"]').click();
const head=await p.locator('#qr-list-table th').first().evaluate(n=>({height:n.clientHeight,color:getComputedStyle(n).backgroundColor,nowrap:getComputedStyle(n).whiteSpace}));
console.log('HEADER',head);assert.ok(head.height<=48);assert.equal(head.color,'rgb(245, 246, 248)');assert.equal(head.nowrap,'nowrap');assert.deepEqual(errors,[]);console.log('PROJECT / LIFECYCLE SEARCH / SHARED COMPONENTS / GREY HEADER PASSED');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});