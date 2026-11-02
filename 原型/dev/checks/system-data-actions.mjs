import assert from 'node:assert/strict';

export async function systemDataActions(page){
 const cases=[
  ['#system-lifecycle-targets','#lt-target-page','[data-lt-import]','[data-lt-download]','#lt-import-dialog','[data-lt-import-close]'],
  ['#system-cost-efficiency','#cec-page','#cec-import','#cec-template','#cec-import-dialog','[data-cec-import-close]'],
  ['#system-core-links','#klc-page','#klc-import','#klc-template','#klc-import-dialog','[data-klc-close]'],
  ['#system-strategic-suppliers','#ssi-page','#ssi-import','#ssi-template','#ssi-import-dialog','[data-ssi-close]'],
 ];
 for(const [route,pane,importSelector,downloadSelector,dialogSelector,close] of cases){
  await page.evaluate(hash=>location.hash=hash,route);
  await page.locator(pane).waitFor({state:'visible'});
  const upload=page.locator(pane).locator(importSelector),download=page.locator(pane).locator(downloadSelector);
  for(const [button,label] of [[upload,/^导入(?:数据)?$/],[download,/^下载(?:模板)?$/]]){
   assert.match(await button.innerText(),label);
   assert.equal(await button.locator('svg[aria-hidden="true"]').count(),1);
   assert.equal(await button.getAttribute('type'),'button');
  }
  const style=await upload.evaluate(node=>{const s=getComputedStyle(node);return [s.backgroundColor,s.color,s.height]});
  assert.deepEqual(style,['rgb(22, 119, 255)','rgb(255, 255, 255)','35px'],route+' 导入为蓝色主按钮');
  assert.equal(await download.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
  // 点击图标本身也必须触发原有操作，而非只点文字有效。
  const downloaded=page.waitForEvent('download');await download.locator('svg').click();
  assert.match((await downloaded).suggestedFilename(),/\.(xlsx|csv)$/);
  await upload.locator('svg').click();await page.locator(dialogSelector).waitFor({state:'visible'});
  await page.locator(dialogSelector).locator(close).first().click();
  for(const width of [1920,390]){
   await page.setViewportSize({width,height:900});
   for(const button of [upload,download]){
    const box=await button.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,route+' 按钮不溢出');
    assert.equal(await button.evaluate(node=>node.scrollWidth<=node.clientWidth+1),true,'图标和文字完整显示');
   }
  }
  await page.setViewportSize({width:1920,height:1080});
 }
 assert.equal(await page.locator('#lt-system .sm-data-action').count(),9,'覆盖后台四组导入/下载及供应商导出按钮');
 console.log('通过：后台四页图标按钮、蓝色导入与白底下载、图标点击导入/下载、宽窄屏布局。');
}
