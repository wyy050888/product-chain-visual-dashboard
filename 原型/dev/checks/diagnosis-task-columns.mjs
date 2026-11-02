import assert from 'node:assert/strict';

export async function diagnosisTaskColumns(page){
 const root=page.locator('#ai'),table=()=>root.locator('[data-gd-table]');
 const storage='dashboard-column-widths-v1',key='gd-task-columns-v2';
 const original=await page.evaluate(storage=>localStorage.getItem(storage),storage);
 const legacy=await table().evaluate(t=>{
  const host=t.parentElement.closest('[id]'),headers=[...t.tHead.rows[0].cells].map((cell,i)=>{
   const copy=cell.cloneNode(true);copy.querySelectorAll('.metric-help,.metric-tooltip,[data-ui-column-handle]').forEach(n=>n.remove());
   return [i,1,copy.textContent.trim().replace(/\s+/g,' ')];
  });
  return JSON.stringify([t.id||host.id,'',[...host.querySelectorAll('table')].indexOf(t),headers]);
 });
 const oldWidths=[248,89,355,497,195,142,124,142,106];
 const widths=()=>table().locator('thead th').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));
 const ready=()=>table().locator('[data-ui-column-handle]').first().waitFor();
 try{
  await page.evaluate(({storage,legacy,oldWidths})=>localStorage.setItem(storage,JSON.stringify({[legacy]:oldWidths,'unrelated-table':[120,180]})),{storage,legacy,oldWidths});
  await page.reload();await ready();
  for(const width of [1920,1280,390]){
   await page.setViewportSize({width,height:1000});
   for(const part of ['coordination','closure']){
    await root.locator('[data-gd-part="'+part+'"]').click();await ready();
    assert.equal(await table().getAttribute('data-column-key'),key);
    const values=await widths(),base=values[0]/.14;
    for(const [index,ratio] of [[2,.215],[3,.3],[4,.085],[5,.07]])assert(Math.abs(values[index]-base*ratio)<1,'旧偏好不能覆盖新默认：'+width+'/'+part+'/'+index);
   }
  }
  await page.setViewportSize({width:1920,height:1080});
  const before=await widths();
  await table().locator('thead th').nth(2).locator('[data-ui-column-handle]').focus();await page.keyboard.press('ArrowRight');
  const custom=await widths();assert(Math.abs(custom[2]-before[2]-8)<2,'新版仍可手动调整');
  await root.locator('[data-gd-part="coordination"]').click();await ready();assert(Math.abs((await widths())[2]-custom[2])<1,'两个任务入口共用手动列宽');
  await page.reload();await ready();assert(Math.abs((await widths())[2]-custom[2])<1,'新偏好刷新后保留');
  const saved=await page.evaluate(storage=>JSON.parse(localStorage.getItem(storage)),storage);
  assert.deepEqual(saved[legacy],oldWidths,'不删除旧记录');assert.deepEqual(saved['unrelated-table'],[120,180],'不改其他表格偏好');assert(saved[key]);
 }finally{
  await page.evaluate(({storage,original})=>original===null?localStorage.removeItem(storage):localStorage.setItem(storage,original),{storage,original});
  await page.setViewportSize({width:1920,height:1080});await page.reload();
 }
 console.log('通过：旧列宽覆盖回归、两任务入口新默认、三种宽度、手动调宽及刷新记忆、其他表格隔离');
}
