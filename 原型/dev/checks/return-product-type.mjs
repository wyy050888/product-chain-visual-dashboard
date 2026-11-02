import assert from 'node:assert/strict';

export async function returnProductType(page){
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const card=page.locator('#riskrail [data-rp-board="6"]'),choice=value=>card.locator('[data-rp-return-type="'+value+'"]');
 const seasonMenu=card.locator('[data-rp-season-menu="6"]');assert.equal(await seasonMenu.locator('.rp-season-tags').getAttribute('role'),'radiogroup');assert.equal(await seasonMenu.locator('select').evaluate(node=>node.multiple),false);assert.equal(await seasonMenu.locator('[aria-checked="true"]').getAttribute('data-rp-season-option'),'all','季品默认全部');
 assert.deepEqual(await card.locator('[data-rp-return-type]').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent)),['全部','新品','老品']);
 assert.equal(await page.locator('#riskrail [data-rp-return-type]').count(),3,'仅退货恶化榜新增切换');
 await card.locator('[data-rp-platform-option="all"]').click();
 const raw=await page.evaluate(()=>({rows:riskBoardPeriodAudit().find(board=>board.kind===6).ranking.map(row=>({...row,channel:row.platform})),spus:referenceSampleAudit().spus}));
 const products=new Map(raw.spus.map(p=>[p.spuId,p]));
 const isNew=row=>typeof row.isNew==='boolean'?row.isNew:products.get(row.spuId)?.cohort==='new'?true:products.get(row.spuId)?.cohort==='old'?false:null;
 const expected=(type,platform)=>raw.rows.filter(r=>(platform==='all'||r.channel===platform)&&(type==='all'||isNew(r)===(type==='new')));
 const verify=async(type,platform)=>{
  const rows=expected(type,platform),ids=[...new Set(rows.map(r=>r.spuId))].slice(0,6);
  assert.equal(await choice(type).getAttribute('aria-checked'),'true');
  for(const value of ['all','new','old']){const count=expected(value,platform).length;assert.equal(Number(await choice(value).locator('.rp-platform-count').innerText()),count,'新老品数量保留平台、忽略自身选择');assert.equal(await choice(value).getAttribute('aria-label'),({all:'全部',new:'新品',old:'老品'})[value]+'，'+count+'条入榜记录')}
  assert.deepEqual(await card.locator('.rp-platform-product').evaluateAll(es=>es.map(e=>e.dataset.rpSpu)),ids,'先筛选新老品再取前六，沿用原顺序');
  assert.match(await card.locator('[data-risk="6"]').innerText(),new RegExp('查看全部 '+rows.length+' '));
  for(const p of ['all','抖音','快手','视频号','天猫','京东','拼多多'])assert.equal(Number(await card.locator('[data-rp-platform-option="'+p+'"] .rp-platform-count').innerText()),expected(type,p).length,'平台计数同步新老品 '+p);
 };
 for(const platform of ['all','快手']){
  await card.locator('[data-rp-platform-option="'+platform+'"]').click();
  for(const type of ['new','old','all']){await choice(type).click();await verify(type,platform)}
 }
 await card.locator('[data-rp-platform-option="all"]').click();
 await choice('new').click();
 assert(expected('new','all').length>0&&expected('old','all').length>0,'真实样例覆盖新品和老品');
 await card.locator('[data-risk="6"]').click();
 const types=page.locator('#dialogbody [data-rp-filter="productType"]');
 assert.deepEqual(await types.evaluate(e=>[...e.selectedOptions].map(o=>o.value)),['new'],'完整榜单继承外侧新老品');
 const rows=page.locator('.rp-return-table tbody tr');assert(await rows.count()>0);
 assert((await rows.allTextContents()).every(text=>text.includes('新品')),'完整榜单只展示新品');
 await types.selectOption('old',{force:true});
 assert((await rows.allTextContents()).every(text=>text.includes('老品')),'抽屉内可独立切换老品');
 await page.locator('#close').click();await verify('new','all');
 await card.locator('[data-risk="6"]').click();
 assert.deepEqual(await page.locator('#dialogbody [data-rp-filter="productType"]').evaluate(e=>[...e.selectedOptions].map(o=>o.value)),['new'],'重新进入继承外侧而非上次抽屉选择');
 await page.locator('#close').click();
 await choice('new').focus();await page.keyboard.press('ArrowRight');await verify('old','all');
 await page.keyboard.press('Home');await verify('all','all');
 const before=await card.locator('.rp-platform-product').evaluateAll(es=>es.map(e=>e.dataset.rpSpu));
 await card.locator('[data-rp-season-option="冬季品"]').click();
 await choice('old').click();
 await card.locator('[data-rp-platform-option="快手"]').click();
 assert.deepEqual(await card.locator('[data-rp-card-season]').evaluate(e=>[...e.selectedOptions].map(o=>o.value)),['冬季品'],'平台和新老品切换保留季品');
 assert.equal(await choice('old').getAttribute('aria-checked'),'true');
 assert.equal(Number(await choice('old').locator('.rp-platform-count').innerText()),Number((await card.locator('[data-risk="6"]').innerText()).match(/\d+/)[0]),'新老品数量与当前季品、平台下查看全部一致');
 assert.equal(await card.locator('.rp-quality-actions [data-rp-card-season]').count(),0,'季品不再置于右侧下拉');
 assert(await card.locator('.rhead [data-rp-season-menu="6"]').isVisible(),'季品Tab在标题筛选区外露');
 assert.equal(Number(await card.locator('[data-rp-season-option="冬季品"] .rp-season-count').innerText()),Number((await card.locator('[data-risk="6"]').innerText()).match(/\d+/)[0]),'季品计数同步平台和新老品');
 await card.locator('[data-rp-season-option="夏季品"]').click();
 assert.deepEqual(await card.locator('[data-rp-card-season]').evaluate(e=>[...e.selectedOptions].map(o=>o.value)),['夏季品'],'夏季品替换冬季品，不叠加');assert.equal(await seasonMenu.locator('[aria-checked="true"]').count(),1);
 await card.locator('[data-rp-season-option="夏季品"]').click();
 assert.equal(await card.locator('[data-rp-card-season]').inputValue(),'夏季品','再次点击已选项不清空');
 await card.locator('[data-rp-season-option="夏季品"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await card.locator('[data-rp-card-season]').inputValue(),'冬季品','键盘单选切换');await page.keyboard.press('Home');assert.equal(await card.locator('[data-rp-card-season]').inputValue(),'all');assert.equal(await seasonMenu.locator('[aria-checked="true"]').count(),1);
 for(const width of [1920,1100,390,320]){
  await page.setViewportSize({width,height:1080});
  assert(await card.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'筛选条不撑宽 '+width);
  assert(await choice('old').isVisible());
 }
 await card.locator('[data-rp-card-season]').selectOption('all',{force:true});
 await card.locator('[data-rp-platform-option="all"]').click();await choice('all').click();
 assert.deepEqual(await card.locator('.rp-platform-product').evaluateAll(es=>es.map(e=>e.dataset.rpSpu)),before,'全部恢复原榜单');
 console.log('通过：退货榜新老品主数据筛选、先筛选后取前六、平台计数、季品组合、抽屉继承隔离、键盘和窄屏');
}
