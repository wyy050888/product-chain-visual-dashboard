const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
const menu=selector=>p.locator(selector).locator('..');
async function choose(selector,values){
 const m=menu(selector);if(await m.getAttribute('open')===null)await m.locator('summary').click();
 await m.locator('[data-pf-multi-option]').filter({hasNot:p.locator('x-impossible')}).first().check();
 for(const value of values)await m.locator('[data-pf-multi-option]').filter({hasNot:p.locator('x-impossible')}).evaluateAll((boxes,v)=>{const box=boxes.find(b=>b.value===v);box.click()},value);
 assert.deepEqual(await p.locator(selector).evaluate(s=>[...s.selectedOptions].filter(o=>!['all','全部'].includes(o.value)).map(o=>o.value)),await p.locator(selector).evaluate((s,vs)=>[...s.options].filter(o=>vs.includes(o.value)).map(o=>o.value),values));
 if(await m.getAttribute('open')!==null)await m.locator('summary').click();
}
async function riskIds(){
 if(+(await p.locator('#rp-list-pagination nav').getAttribute('data-list-current'))>1)await p.locator('#rp-list-pagination [data-list-page="1"]').first().click();
 const ids=[];let pages=+(await p.locator('#rp-list-pagination nav').getAttribute('data-list-pages'));
 for(let n=1;n<=pages;n++){if(n>1)await p.locator('#rp-list-pagination [data-list-page="'+n+'"]').first().click();ids.push(...await p.locator('.rp-list-table .rp-identity small').allTextContents())}
 return [...new Set(ids)].sort();
}
await p.locator('#riskrail [data-risk="0"]').click();
for(const k of [0,1,2,3,4,6]){
 await p.locator('[data-drawer-tab="ranking-'+k+'"]').click();await p.locator('[data-rp-reset]').click();
 const base=await riskIds(),brand='[data-rp-filter="brand"]',chain='[data-rp-filter="chain"]';
 const bv=await p.locator(brand).evaluate(s=>[...s.options].filter(o=>o.value!=='all').slice(0,2).map(o=>o.value));
 await choose(brand,[bv[0]]);const a=await riskIds();await choose(brand,[bv[1]]);const bb=await riskIds();await choose(brand,bv);const union=await riskIds();assert.deepEqual(union,[...new Set([...a,...bb])].sort(),'brand union '+k);
 await choose(brand,[]);const cv=await p.locator(chain).evaluate(s=>[...s.options].filter(o=>o.value!=='all').slice(0,2).map(o=>o.value));
 await choose(chain,[cv[0]]);const c=await riskIds();await choose(chain,[cv[1]]);const d=await riskIds();await choose(chain,cv);const categories=await riskIds();assert.deepEqual(categories,[...new Set([...c,...d])].sort(),'category union '+k);
 await choose(brand,bv);const combined=await riskIds();assert.deepEqual(combined,union.filter(id=>categories.includes(id)),'AND '+k);
 await p.locator('[data-drawer-tab="ranking-'+(k===1?0:1)+'"]').click();await p.locator('[data-drawer-tab="ranking-'+k+'"]').click();assert.deepEqual(await riskIds(),combined,'tab persistence '+k);
 await p.locator('[data-rp-reset]').click();assert.deepEqual(await riskIds(),base,'reset '+k);assert.equal(await menu(brand).locator('.pf-multi-value').innerText(),'全部');
 console.log('board',k,'OR / AND / persistence / reset passed');
}
await p.locator('#close').click();await p.locator('#newall').click();
assert.equal(await p.locator('#new-all-chain').evaluate(s=>s.multiple),true);
await choose('#new-all-chain',['0','1']);await choose('[data-pf-filter="brand"]',['康佳','创维']);
assert.ok((await p.locator('#new-all-products-table td:first-child').allTextContents()).every(t=>/康佳|创维/.test(t)));
await p.locator('#new-all-reset').click();assert.equal(await menu('#new-all-chain').locator('.pf-multi-value').innerText(),'全部');assert.equal(await menu('[data-pf-filter="brand"]').locator('.pf-multi-value').innerText(),'全部');
await p.locator('#close').click();
await choose('#ai-chain',['清洁链','环境链']);assert.equal(await menu('#ai-chain').getAttribute('open'),null);
await p.locator('#ai-reset').click();assert.equal(await menu('#ai-chain').locator('.pf-multi-value').innerText(),'全部');
await p.locator('.head .nav button').nth(1).evaluate(b=>b.click());await p.locator('#dp-inventory .pf-multi').waitFor();
await choose('#dp-inventory [data-field="brand"]',['1','2']);assert.equal(await menu('#dp-inventory [data-field="brand"]').locator('.pf-multi-value').innerText(),'创维、康佳');
await choose('#dx-ai-chain',['清洁链','环境链']);
 await p.locator('.head .nav button').first().evaluate(b=>b.click());await p.locator('#riskrail [data-risk="0"]').click();
await p.setViewportSize({width:390,height:844});const m=menu('[data-rp-filter="brand"]');await m.locator('summary').click();
const bounds=await m.locator('.pf-multi-menu').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390,'mobile menu within screen');
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await p.keyboard.press('Escape');assert.equal(await m.getAttribute('open'),null);assert.equal(await p.locator('#overlay').evaluate(e=>e.hidden),false);
await m.locator('summary').click();await p.locator('#dialogtitle').click();assert.equal(await m.getAttribute('open'),null);
assert.deepEqual(errors,[]);console.log('Shared product / AI / department multi-select, mobile, Escape and outside click passed; no page errors');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
