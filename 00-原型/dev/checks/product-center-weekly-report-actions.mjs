import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {weeklyReportSampleFiles} from '../prototype-ai-prompts.mjs';

export async function productCenterWeeklyReportActions(page){
 await page.clock.setFixedTime(new Date('2026-11-26T04:05:00Z'));
 const url=new URL('产品中心.html',page.url()).href;
 async function openReports(){
  await page.goto(url);
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  await page.locator('a[href="#dp-ai"]').click();
  await page.locator('#ai [data-gd-part="execution"]').click();
 }
 const table=page.getByRole('table',{name:'部门周报下载表'});
 const row=week=>table.getByRole('row').filter({has:page.getByRole('rowheader',{name:new RegExp('第'+week+'周')})});
 const trigger=week=>row(week).getByRole('button',{name:/周报操作/});
 const menu=week=>row(week).getByRole('menu',{name:'周报操作'});
 async function openMenu(week){
  await trigger(week).click();
  await menu(week).waitFor();
  return menu(week);
 }
 async function choose(week,action){
  const items=await openMenu(week);
  await items.getByRole('menuitem',{name:action}).click();
 }
 async function verifyDownload(button,filename,bytes){
  const [download]=await Promise.all([page.waitForEvent('download'),button.click()]);
  assert.equal(download.suggestedFilename(),filename);
  assert((await readFile(await download.path())).equals(bytes));
 }
 const aiFile='产品中心第43周周报.pdf';
 const original=await readFile(weeklyReportSampleFiles().get(aiFile));
 const first={name:'第43周修订.pdf',mimeType:'application/pdf',buffer:Buffer.concat([original,Buffer.from('\n% first revision\n')])};
 const second={name:'第43周最终.pdf',mimeType:'application/pdf',buffer:Buffer.concat([original,Buffer.from('\n% latest revision\n')])};
 await openReports();
 const readyTrigger=trigger('43'),pendingTrigger=trigger('44');
 assert.equal(await readyTrigger.innerText(),'周报操作');
 assert.equal(await pendingTrigger.innerText(),'周报操作');
 assert.equal(await row('44').getByText('未生成',{exact:true}).count(),0);
 assert.deepEqual(await pendingTrigger.evaluate(button=>{
  const style=getComputedStyle(button);
  return [style.backgroundColor,style.borderTopWidth];
 }),['rgba(0, 0, 0, 0)','0px']);
 assert(Math.abs((await readyTrigger.boundingBox()).x-(await pendingTrigger.boundingBox()).x)<1,'周报操作在有无周报的行内保持对齐');
 const linkStyle=button=>button.evaluate(el=>{
  const css=getComputedStyle(el);
  return [css.color,css.fontFamily,css.fontSize,css.fontWeight,css.lineHeight,css.padding];
 });
 const weeklyStyle=await linkStyle(pendingTrigger);
 await page.locator('#ai [data-gd-part="coordination"]').click();
 assert.deepEqual(weeklyStyle,await linkStyle(page.getByRole('button',{name:'查看依据',exact:true}).first()));
 await page.locator('#ai [data-gd-part="execution"]').click();
 let items=await openMenu('43');
 assert.deepEqual(await items.getByRole('menuitem').allTextContents(),['下载周报','上传周报','变更记录']);
 await items.getByRole('menuitem',{name:'下载周报'}).press('ArrowDown');
 assert.equal(await page.locator(':focus').textContent(),'上传周报');
 await page.keyboard.press('Escape');
 await items.waitFor({state:'hidden'});
 assert.equal(await trigger('43').getAttribute('aria-expanded'),'false');

 items=await openMenu('43');
 await verifyDownload(items.getByRole('menuitem',{name:'下载周报'}),aiFile,original);
 await choose('43','变更记录');
 const history=page.getByRole('dialog',{name:'变更记录'}),historyTable=history.getByRole('table');
 assert.deepEqual(await historyTable.getByRole('columnheader').allTextContents(),['变更人','变更日期','下载周报']);
 assert.deepEqual(await historyTable.locator('tbody tr').first().getByRole('cell').allTextContents(),['AI生成','26/11/16 00:57','下载周报']);
 await history.getByRole('button',{name:'关闭',exact:true}).click();

 const upload=page.getByRole('dialog',{name:'上传周报'}),file=upload.locator('input[type="file"]');
 async function submit(week,payload,validate=false){
  await choose(week,'上传周报');
  if(validate){
   await file.setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('invalid')});
   await upload.getByRole('button',{name:'上传',exact:true}).click();
   assert.equal(await upload.getByRole('alert').textContent(),'请选择有效的 PDF 周报');
  }
  await file.setInputFiles(payload);
  await upload.getByRole('button',{name:'上传',exact:true}).click();
  await upload.waitFor({state:'hidden'});
 }
 await submit('43',first,true);
 await page.clock.setFixedTime(new Date('2026-11-26T04:06:00Z'));
 await submit('43',second);
 assert.deepEqual((await row('43').getByRole('cell').allTextContents()).slice(0,2),['—','—']);
 await openReports();
 const latest=await openMenu('43');
 await verifyDownload(latest.getByRole('menuitem',{name:'下载周报'}),second.name,second.buffer);
 await choose('43','变更记录');
 assert.deepEqual(await historyTable.locator('tbody tr').evaluateAll(rows=>rows.map(tr=>[tr.cells[0].textContent,tr.cells[1].textContent])),[
  ['管理员账户','26/11/26 12:06'],['管理员账户','26/11/26 12:05'],['AI生成','26/11/16 00:57']
 ]);
 await verifyDownload(historyTable.locator('tbody tr').nth(1).getByRole('button'),first.name,first.buffer);
 await verifyDownload(historyTable.locator('tbody tr').nth(2).getByRole('button'),aiFile,original);
 await history.getByRole('button',{name:'关闭',exact:true}).click();

 items=await openMenu('44');
 assert(await items.getByRole('menuitem',{name:'下载周报'}).isDisabled());
 await items.getByRole('menuitem',{name:'变更记录'}).click();
 assert(await history.getByText('暂无变更记录',{exact:true}).isVisible());
 await history.getByRole('button',{name:'关闭',exact:true}).click();
 await submit('44',{...first,name:'第44周周报.pdf'});
 assert.match(await page.locator('#ai [data-gd-part="execution"] .gd-card-stats').textContent(),/已上传第44周/);
 await page.setViewportSize({width:390,height:900});
 items=await openMenu('44');
 const bounds=await items.boundingBox();
 assert(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y>=0&&bounds.y+bounds.height<=900);
 await verifyDownload(items.getByRole('menuitem',{name:'下载周报'}),'第44周周报.pdf',first.buffer);
}
