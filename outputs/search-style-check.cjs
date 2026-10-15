const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');
const styles=n=>{const s=getComputedStyle(n),c=getComputedStyle(n.querySelector('select')),f=n.querySelector('.unified-field-name'),fs=getComputedStyle(f);return{height:n.getBoundingClientRect().height,border:s.border,bg:s.backgroundColor,radius:s.borderRadius,font:c.fontSize,controlHeight:c.height,nameHeight:f.getBoundingClientRect().height,nameBg:fs.backgroundColor,nameBorder:fs.borderRight,padding:c.padding}};
const shared=await p.locator('#ai .unified-input-group').filter({has:p.locator('select')}).first().evaluate(styles);
const project=p.locator('#projectsearch');assert.equal(await project.locator('..').locator('.unified-field-name').count(),0);await project.fill('project-no-result');assert.ok((await p.locator('#projecttable').innerText()).includes('暂无匹配'));await project.fill('');
await p.locator('#riskrail [data-risk="0"]').click();await p.waitForTimeout(200);
for(const k of [0,1,2,3,4,6]){
 if(k)await p.locator('[data-drawer-tab="ranking-'+k+'"]').click();
 await p.mouse.move(100,20);await p.waitForTimeout(200);
 const search=p.locator('[data-rp-filter="query"]'),parent=search.locator('..');
 assert.equal(await parent.locator('.unified-field-name').count(),0);assert.ok((await parent.innerText()).trim()==='');
 assert.equal(await p.locator('.rp-list-tools>:first-child').getAttribute('class'),await parent.getAttribute('class'));
 assert.ok((await parent.boundingBox()).width>=350);
 const icon=await parent.evaluate(n=>getComputedStyle(n,'::before').backgroundImage);assert.ok(icon.includes('data:image/svg'));
 const fields=await p.locator('.rp-list-tools>.unified-input-group:not(.ui-business-search)').evaluateAll((nodes)=>nodes.map(n=>{const s=getComputedStyle(n),c=getComputedStyle(n.querySelector('select')),f=n.querySelector('.unified-field-name'),fs=getComputedStyle(f);return{height:n.getBoundingClientRect().height,border:s.border,bg:s.backgroundColor,radius:s.borderRadius,font:c.fontSize,controlHeight:c.height,nameHeight:f.getBoundingClientRect().height,nameBg:fs.backgroundColor,nameBorder:fs.borderRight,padding:c.padding}}));
 for(const field of fields)assert.deepEqual(field,shared,'shared filter styles differ on '+k);
 await search.fill('filter-no-result');assert.equal(await p.locator('.rp-list-table tbody tr').count(),0);await p.locator('[data-rp-reset]').click();
 assert.ok(await p.locator('.rp-list-table tbody tr').count());
}
await p.locator('[data-drawer-tab="ranking-0"]').click();await p.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/search-style-check.png'});
await p.setViewportSize({width:390,height:844});const bounds=await p.locator('.rp-list-tools').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth}));assert.ok(bounds.scroll<=bounds.width);assert.equal(await p.locator('[data-rp-filter="query"]').locator('..').locator('.unified-field-name').count(),0);
assert.deepEqual(errors,[]);console.log('SEARCH ICON / NO LABEL / SHARED FILTER STYLES / SIX LISTS / SEARCH RESET / MOBILE PASSED');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
