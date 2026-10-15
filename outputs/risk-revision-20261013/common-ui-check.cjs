const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
await p.locator('#riskrail .rp-entry').first().waitFor();
const snapshot=async()=>p.evaluate(()=>[...document.querySelectorAll('#riskrail .riskcard')].map(card=>({kind:card.querySelector('[data-risk]').dataset.risk,rows:[...card.querySelectorAll('.rp-entry')].map(el=>({height:el.getBoundingClientRect().height,identity:el.querySelector('.rp-identity').innerText,fields:[...el.querySelectorAll('[data-rp-field]')].map(f=>({key:f.dataset.rpField,value:f.querySelector('.rp-value').textContent,target:f.querySelector('em')?.textContent||''}))}))})));
const folder='outputs/risk-revision-20261013/',mode=process.argv[2]||'before',data=await snapshot();
if(mode==='before'){fs.writeFileSync(folder+'common-ui-before.json',JSON.stringify(data,null,2));await p.screenshot({path:folder+'common-ui-before.png'});console.log(JSON.stringify(data.map(c=>({kind:c.kind,heights:c.rows.map(r=>r.height)}))));return}
const before=JSON.parse(fs.readFileSync(folder+'common-ui-before.json'));assert.equal(data.length,6);assert.deepEqual(data.map(c=>({kind:c.kind,rows:c.rows.map(r=>r.fields)})),before.map(c=>({kind:c.kind,rows:c.rows.map(r=>r.fields)})));
for(const card of data){assert.equal(card.rows.length,6)}
const placement=await p.evaluate(()=>[...document.querySelectorAll('#riskrail .rp-entry')].map(el=>{const name=el.querySelector('b').getBoundingClientRect(),button=el.querySelector('[data-qr-detail],[data-riskitem]').getBoundingClientRect();return {gap:button.x-name.right,borders:[...el.querySelectorAll('.rp-key-metrics .rp-item')].map(f=>getComputedStyle(f).borderLeftWidth),background:getComputedStyle(el.querySelector('.rp-key-metrics')).backgroundColor}}));
assert.ok(placement.every(r=>r.gap>=0&&r.gap<13));assert.ok(placement.every(r=>r.borders.every(v=>v==='0px')));
const heights=data.map(c=>c.rows[0].height);assert.ok(new Set(heights).size>1);assert.ok(heights.reduce((a,b)=>a+b,0)<before.reduce((a,c)=>a+c.rows[0].height,0));
await p.locator('#riskrail .riskcard').first().locator('[data-qr-detail]').first().click();assert.equal(await p.locator('#overlay').getAttribute('hidden'),null);assert.ok((await p.locator('#dialogtitle').innerText()).includes('产品详情'));await p.locator('#close').click();
await p.locator('#riskrail .riskcard').nth(1).locator('[data-riskitem]').first().click();assert.equal(await p.locator('#overlay').getAttribute('hidden'),null);await p.locator('#close').click();
await p.locator('#riskrail [data-risk="0"]').click();await p.locator('#dialogbody .rp-list-table').waitFor();await p.locator('#close').click();
await p.screenshot({path:folder+'common-ui-after.png'});
await p.setViewportSize({width:390,height:844});const overflow=await p.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth,entries:[...document.querySelectorAll('#riskrail .rp-entry')].filter(e=>e.scrollWidth>e.clientWidth+1).length}));assert.equal(overflow.page,false);assert.equal(overflow.entries,0);
await p.screenshot({path:folder+'common-ui-mobile.png'});assert.deepEqual(errors,[]);
console.log(JSON.stringify({heightsBefore:before.map(c=>c.rows[0].height),heightsAfter:heights,allFieldsUnchanged:true,nearbyDetailLinks:true,detailAndListOpen:true,mobileOverflow:overflow,pageErrors:errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

