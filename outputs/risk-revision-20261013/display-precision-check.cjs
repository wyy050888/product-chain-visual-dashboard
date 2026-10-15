const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={Number,Math,fmt:(n,d)=>Number(n).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d})};vm.createContext(ctx);vm.runInContext(fs.readFileSync('原型/src/modules/product-filters/04-display.js','utf8'),ctx);
for(const [a,b] of [[4000,'4000.0元'],[9999.99,'10000.0元'],[10000,'10000.0元'],[10000.01,'1.0w'],[13000,'1.3w'],[-42200,'-4.2w'],[0,'0.0元'],[null,'--']])assert.equal(ctx.pfMoneyYuan(a),b);
assert.equal(ctx.upPercent(18.37),'18.4%');assert.equal(ctx.upPercent(0),'0.0%');assert.equal(ctx.upMoney(4220000),'4.2w');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
const first=p.locator('#riskrail .riskcard').first().locator('.rp-entry').first();
assert.equal(await first.locator('[data-rp-field="fine"] strong').innerText(),'7000.0元/1次');assert.equal(await first.locator('[data-rp-field="return"] strong').innerText(),'18.4%');assert.equal(await first.locator('[data-rp-field="return"] em').innerText(),'偏差 +12.4%');
assert.equal(await p.locator('#riskrail .riskcard').nth(1).locator('[data-rp-field="score"] strong').first().innerText(),'4.88分');
await p.locator('#riskrail [data-risk="0"]').click();for(const k of [0,1,2,3,4,6]){await p.locator('[data-drawer-tab="ranking-'+k+'"]').click();const content=await p.locator('#dialogbody .rp-list-table').innerText();assert.ok(!/\d+\.\d{2}%/.test(content));assert.ok(!/\d+\.\d{2}(?:w|元)/.test(content));assert.ok(!/\d,\d{3}\.\d(?:w|元)/.test(content));}
await p.locator('#close').click();await p.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/risk-revision-20261013/precision-desktop.png'});
assert.ok(!/\d+\.\d{2}%/.test(await p.locator('#salescards').innerText()));
const bad=await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.children.length===0&&el.getClientRects().length&&/\d+\.\d{2}%/.test(el.textContent)).map(el=>el.textContent));assert.deepEqual(bad,[]);
assert.deepEqual(errors,[]);console.log('One decimal / 10000 threshold / sign, zero, missing / preserved score / six lists / sales / page errors passed');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});

