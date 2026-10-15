const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
await p.locator('#riskrail [data-risk="0"]').click();await p.waitForTimeout(200);const tip=p.locator('#rp-trend-tooltip'),point=()=>p.locator('.rp-mini-trend').first().locator('[data-rp-trend-point]').last();
assert.equal(await p.locator('.rp-mini-trend title').count(),0);await point().hover();await tip.waitFor({state:'visible'});
const expected=await point().evaluate(n=>({...n.dataset}));assert.ok((await tip.innerText()).includes(expected.trendDate));assert.ok((await tip.innerText()).includes(expected.trendValue));assert.equal(await point().getAttribute('aria-describedby'),'rp-trend-tooltip');const rect=await tip.boundingBox();assert.ok(rect.x>=8&&rect.x+rect.width<=1912&&rect.y>=8&&rect.y+rect.height<=1072);
await p.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/trend-tooltip-check.png'});
await p.locator('.rp-mini-trend').first().locator('[data-rp-trend-point]').first().hover();assert.notEqual((await tip.innerText()).slice(0,10),expected.trendDate);
await p.mouse.move(450,90);await p.locator('[data-rp-trend]').selectOption('received');assert.equal(await tip.isVisible(),false);await point().hover();assert.ok((await tip.innerText()).includes('已收退货率'));assert.ok((await tip.innerText()).includes('%'));
await p.mouse.move(450,90);assert.equal(await tip.isVisible(),false);
await point().focus();assert.equal(await tip.isVisible(),true);await p.keyboard.press('Escape');assert.equal(await tip.isVisible(),false);assert.equal(await p.locator('#overlay').evaluate(n=>n.hidden),false);
await point().hover();await p.locator('#dialogbody').evaluate(n=>n.scrollTop=20);await p.waitForTimeout(50);assert.equal(await tip.isVisible(),false);
await point().hover();await p.locator('#qr-list-table [data-qr-detail]').first().click();assert.equal(await tip.isVisible(),false);await p.locator('#close').click();
for(const k of [1,2,3,4,6]){await p.locator('[data-drawer-tab="ranking-'+k+'"]').click();await p.waitForTimeout(150);await point().hover();assert.equal(await tip.isVisible(),true);assert.ok((await tip.innerText()).includes('GSV'));await p.mouse.move(450,90)}
await p.locator('#close').click();assert.equal(await tip.isVisible(),false);
await p.setViewportSize({width:390,height:844});await p.locator('#riskrail [data-risk="0"]').click();await p.waitForTimeout(200);await point().evaluate(n=>n.scrollIntoView({block:'center',inline:'center'}));await point().click();assert.equal(await tip.isVisible(),true);const mobile=await tip.boundingBox();assert.ok(mobile.x>=8&&mobile.x+mobile.width<=382&&mobile.y>=8&&mobile.y+mobile.height<=836);
assert.deepEqual(errors,[]);console.log('HOVER / DAILY VALUES / METRIC SWITCH / FOCUS / ESCAPE / SCROLL / DRAWER / SIX LISTS / MOBILE PASSED');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});