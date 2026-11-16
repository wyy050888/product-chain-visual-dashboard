import assert from 'node:assert/strict';
export async function riskGroupNavigation(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const nav=page.locator('#rp-group-navigation'),buttons=nav.locator('button');
 const kinds=['0','6','8','1','4','3','2'];
 assert.deepEqual(await buttons.allTextContents(),['产品违规榜','退货恶化榜','退货偏差榜','店铺风险榜','呆滞预警榜','缺货预警榜','亏损产品榜']);
 const jump=kind=>nav.locator('[data-rp-group-jump="'+kind+'"]');
 const board=kind=>page.locator('#riskrail [data-rp-board="'+kind+'"]');
 const initial=await page.locator('#riskrail').innerText();
 for(const width of [1920,1024,390,320]){
  await page.setViewportSize({width,height:1080});
  await page.locator('#risk').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('[data-rp-group-jump="0"]').getAttribute('aria-current')==='location');
  for(const key of [...kinds.slice(1),kinds[0]]){
   await jump(key).click();
   await page.waitForFunction(k=>document.querySelector('[data-rp-group-jump="'+k+'"]').getAttribute('aria-current')==='location',key);
   const geometry=await board(key).evaluate(el=>({top:el.getBoundingClientRect().top,headerBottom:document.querySelector('#risk>.sectionhead').getBoundingClientRect().bottom}));
   assert(geometry.top>=geometry.headerBottom-1&&geometry.top<=geometry.headerBottom+16,'目标标题不被吸顶栏遮挡 '+width+' '+key+' '+JSON.stringify(geometry));
  }
  assert(await buttons.evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})), 'Tab完整可见 '+width);
 }
 assert.equal(await page.locator('#riskrail').innerText(),initial,'定位不重绘各榜或改变筛选');
 await page.setViewportSize({width:1920,height:1080});
 await board('8').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-document.querySelector('.navigation-toolbar').getBoundingClientRect().bottom-document.querySelector('#risk>.sectionhead').getBoundingClientRect().height-2,behavior:'instant'}));
 await page.waitForFunction(()=>document.querySelector('[data-rp-group-jump="8"]').getAttribute('aria-current')==='location');
 await jump('2').focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-rp-group-jump="2"]').getAttribute('aria-current')==='location');
 await jump('0').click();
 console.log('通过：七个风险榜定位、滚动高亮、吸顶避让、键盘及窄屏，保留榜单数据。');
}
