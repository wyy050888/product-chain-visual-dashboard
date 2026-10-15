const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
await p.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/risk-revision-20261013/ui-desktop.png'});
await p.locator('#riskrail [data-risk="0"]').click();
let headers=await p.locator('.rp-list-table th').allTextContents();assert.ok(!headers.some(s=>/总退货率目标|已收退货率目标|超目标幅度/.test(s)));assert.ok((await p.locator('.rp-list-table tbody tr').first().innerText()).includes('偏差'));
await p.locator('[data-drawer-tab="ranking-6"]').click();headers=await p.locator('.rp-list-table th').allTextContents();assert.ok(!headers.some(s=>/货率目标|超目标幅度/.test(s)));assert.ok((await p.locator('.rp-list-table tbody tr').first().innerText()).includes('偏差'));
await p.locator('[data-drawer-tab="ranking-3"]').click();headers=await p.locator('.rp-list-table th').allTextContents();const vals=await p.locator('.rp-list-table tbody tr').first().locator('td').allTextContents(),read=s=>vals[headers.findIndex(h=>h.includes(s))];const total=read('高危品总库存'),value=read('高危品货值'),turn=read('周转');
await p.locator('.rp-list-table [data-riskitem]').first().click();assert.equal(await p.locator('[data-up-metric="totalUnits"] strong').innerText(),total.trim());assert.equal(await p.locator('[data-up-metric="stockValue"] strong').innerText(),value.trim());assert.equal(await p.locator('[data-up-metric="turn"] strong').innerText(),turn.trim());
await p.locator('#close').click();await p.locator('#close').click();assert.equal(await p.locator('.pf-main-scope').count(),0);
await p.locator('#riskrail [data-risk="0"]').click();await p.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/risk-revision-20261013/ui-drawer.png'});
await p.setViewportSize({width:390,height:844});await p.locator('#close').click();await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/risk-revision-20261013/ui-mobile-top.png'});assert.deepEqual(errors,[]);console.log('COMPACT VALUES / DEVIATIONS / STOCK DETAIL CONSISTENCY / NO GLOBAL SCOPE / DESKTOP & MOBILE PASSED');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
