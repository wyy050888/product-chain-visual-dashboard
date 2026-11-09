import assert from 'node:assert/strict';
export async function riskGroupNavigation(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const nav=page.locator('#rp-group-navigation'),buttons=nav.locator('button');
 assert.deepEqual(await buttons.allTextContents(),['品质风险榜','库存风险榜','亏损产品榜']);
 const groups={quality:'.rp-board-group-quality',inventory:'.rp-board-group-inventory',loss:'.rp-loss-wide'};
 const initial=await page.locator('#riskrail').innerText();
 for(const width of [1920,1024,390,320]){
  await page.setViewportSize({width,height:1080});
  await page.locator('#risk').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('[data-rp-group-jump="quality"]').getAttribute('aria-current')==='location');
  for(const key of ['inventory','loss','quality']){
   const button=nav.locator('[data-rp-group-jump="'+key+'"]');await button.click();
   await page.waitForFunction(k=>document.querySelector('[data-rp-group-jump="'+k+'"]').getAttribute('aria-current')==='location',key);
   const geometry=await page.locator('#riskrail>'+groups[key]).evaluate(el=>({top:el.getBoundingClientRect().top,headerBottom:document.querySelector('#risk>.sectionhead').getBoundingClientRect().bottom}));
   assert(geometry.top>=geometry.headerBottom-1&&geometry.top<=geometry.headerBottom+16,'目标标题不被吸顶栏遮挡 '+width+' '+key+' '+JSON.stringify(geometry));
  }
  assert(await buttons.evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})), 'Tab完整可见 '+width);
 }
 assert.equal(await page.locator('#riskrail').innerText(),initial,'定位不重绘各榜或改变筛选');
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('#riskrail>.rp-board-group-inventory').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-document.querySelector('.navigation-toolbar').getBoundingClientRect().bottom-document.querySelector('#risk>.sectionhead').getBoundingClientRect().height-2,behavior:'instant'}));
 await page.waitForFunction(()=>document.querySelector('[data-rp-group-jump="inventory"]').getAttribute('aria-current')==='location');
 await nav.locator('[data-rp-group-jump="loss"]').focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-rp-group-jump="loss"]').getAttribute('aria-current')==='location');
 await nav.locator('[data-rp-group-jump="quality"]').click();
 console.log('通过：风险三分区Tab定位、滚动高亮、吸顶避让、键盘及窄屏，保留榜单数据。');
}
