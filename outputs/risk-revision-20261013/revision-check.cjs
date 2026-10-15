const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/嗡嗡/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///E:/需求合集/产品链目视化看板/原型/index.html');assert.deepEqual(errors,[]);
 assert.equal(await p.locator('.pf-main-scope [data-pf-filter]').count(),5);
 assert.equal(await p.locator('#riskrail [data-rp-card-platform="3"]').count(),0);
 for(const k of [0,1])assert.equal(await p.locator('#riskrail .riskcard').filter({has:p.locator('[data-risk="'+k+'"]')}).locator('[data-rp-card-filter="qualityRisk"]').count(),1);
 const stockBefore=await p.locator('#riskrail .riskcard').filter({has:p.locator('[data-risk="3"]')}).innerText();
 await p.locator('#riskrail [data-rp-card-platform="0"]').selectOption('抖音');
 assert.equal(await p.locator('#riskrail .riskcard').filter({has:p.locator('[data-risk="3"]')}).innerText(),stockBefore);
 await p.locator('#riskrail [data-rp-card-platform="0"]').selectOption('all');
 await p.locator('.pf-main-scope .pf-attribute summary').click();await p.locator('.pf-main-scope [data-pf-attribute-key="clearance"][data-pf-attribute-choice="yes"]').click();for(const k of [0,2,3,4,6])assert.equal(await p.locator('#riskrail [data-rp-row^="'+k+':"]').count(),0);
 await p.locator('.pf-main-scope .link').click();assert.ok(await p.locator('#riskrail [data-rp-row^="0:"]').count());
 await p.locator('#riskrail [data-risk="0"]').click();
 for(const k of [0,1,2,3,4,6]){
  if(k)await p.locator('[data-drawer-tab="ranking-'+k+'"]').click();
  const rows=p.locator('.rp-list-table tbody tr');assert.ok(await rows.count()<=20);assert.ok(await rows.count()>0,'records '+k);
  if(k===1){assert.equal(await p.locator('[data-rp-filter="qualityRisk"]').count(),1)}
  else {for(const key of ['brand','chain','attribute','isNew','clearance'])assert.equal(await p.locator('[data-rp-filter="'+key+'"]').count(),1);await p.locator('#dialogbody .pf-attribute summary').click();await p.locator('#dialogbody [data-pf-attribute-key="clearance"][data-pf-attribute-choice="yes"]').click();assert.equal(await rows.count(),0);await p.locator('[data-rp-reset]').click();assert.ok(await rows.count()>0);}
  if(k===3)assert.equal(await p.locator('#rf-return-platform').count(),0);
 }
 await p.locator('[data-drawer-tab="ranking-0"]').click();await p.locator('[data-rp-filter="qualityRisk"]').selectOption('fine');
 assert.ok(await p.locator('.rp-list-table tbody tr').count()>0);
 const values=await p.locator('.rp-list-table tbody tr td:nth-child(4)').allTextContents();assert.ok(values.every(s=>/\/[1-9][\d]*次/.test(s)));
 await p.locator('[data-rp-reset]').click();await p.locator('[data-rp-filter="sort"]').selectOption('sales');assert.equal(await p.locator('[data-rp-filter="returnPool"]').inputValue(),'deviation');assert.ok(await p.locator('.rp-list-table tbody tr').count()>0);
 await p.locator('[data-drawer-tab="ranking-2"]').click();const listLoss=await p.locator('#rf-list-table tbody tr td:nth-child(3)').first().innerText();await p.locator('#rf-list-table [data-riskitem]').first().click();
 assert.ok((await p.locator('#dialogbody').innerText()).includes('测算净利'));assert.ok((await p.locator('#dialogbody').innerText()).includes(listLoss));
 await p.locator('#close').click();await p.locator('#close').click();
 await p.locator('#newall').click();for(const key of ['brand','attribute','isNew','clearance'])assert.equal(await p.locator('.new-all-filters [data-pf-filter="'+key+'"]').count(),1);
 await p.locator('.new-all-filters .pf-attribute summary').click();await p.locator('.new-all-filters [data-pf-attribute-key="clearance"][data-pf-attribute-choice="yes"]').click();assert.equal(await p.locator('#new-all-products-table tbody tr').count(),0);await p.locator('#new-all-reset').click();assert.ok(await p.locator('#new-all-products-table tbody tr').count()>0);await p.locator('#close').click();
 await p.setViewportSize({width:390,height:844});assert.ok(await p.locator('.pf-main-scope').isVisible());assert.deepEqual(errors,[]);
 await p.screenshot({path:'E:/需求合集/产品链目视化看板/outputs/risk-revision-20261013/ui-mobile.png',fullPage:false});
 console.log('PRODUCT FILTERS / QUALITY CATEGORIES / RETURN POOL / COMPANY INVENTORY / NET ESTIMATE / NEW LIST / 20 ROWS / MOBILE PASSED');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

