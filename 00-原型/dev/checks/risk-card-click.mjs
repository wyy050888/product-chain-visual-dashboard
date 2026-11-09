import assert from 'node:assert/strict';
export async function riskCardClick(page){
 const current=()=>page.locator('#dialogbody > .up-detail').evaluate(root=>({
  title:document.querySelector('#dialogtitle').textContent,spu:root.dataset.upSpu||null,shop:root.dataset.sdShop||null,
  tab:root.dataset.upTab,start:root.dataset.upStart||root.dataset.start,end:root.dataset.upEnd||root.dataset.end,
  platform:root.querySelector('#up-platform')?.value||null
 }));
 const close=async()=>{await page.locator('#close').click();assert(await page.locator('#overlay').isHidden())};
 for(const kind of [0,1,2,3,4,6]){
  const rows=page.locator('#riskrail .rp-entry[data-rp-kind="'+kind+'"]'),row=rows.nth(Math.min(2,await rows.count()-1));
  if(!(await rows.count())){assert(await page.locator('#riskrail [data-rp-board="'+kind+'"] .empty').isVisible());continue}
  assert(await rows.count()>0);await row.locator('.rp-detail-link').click();await page.locator('.up-detail').waitFor();const expected=await current();await close();
  for(const target of [row.locator('.rp-identity b').first(),row.locator('[data-rp-field] strong').first()]){
   await target.click();await page.locator('.up-detail').waitFor();assert.deepEqual(await current(),expected,'名称或指标点击与详情入口一致：'+kind);
   assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'0','一次点击只打开一层');await close();
  }
  await row.click({position:{x:(await row.boundingBox()).width-4,y:3}});await page.locator('.up-detail').waitFor();assert.deepEqual(await current(),expected,'记录空白区域同样打开详情：'+kind);await close();
 }
 const row=page.locator('#riskrail .rp-entry[data-rp-kind="0"]').first();
 await row.locator('.rp-identity b').evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);const selected=window.getSelection();selected.removeAllRanges();selected.addRange(range)});
 await row.dispatchEvent('click');assert(await page.locator('#overlay').isHidden(),'选择文字不意外打开详情');await page.evaluate(()=>window.getSelection().removeAllRanges());
 await page.locator('#riskrail img.risk-thumb').first().click();assert(await page.locator('#product-image-viewer').isVisible());assert(await page.locator('#overlay').isHidden(),'图片继续独立预览');await page.locator('#product-image-viewer .rp-image-close').click();
 const help=page.locator('#riskrail .rp-shop-assessed').first();if(await help.count()){await help.click();assert(await page.locator('#metric-tooltip').isVisible());assert(await page.locator('#overlay').isHidden());await page.keyboard.press('Escape')}
 await page.setViewportSize({width:390,height:900});await row.locator('[data-rp-field] strong').first().click();await page.locator('.up-detail').waitFor();assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'0');await close();await page.setViewportSize({width:1920,height:1080});
}
