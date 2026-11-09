import assert from 'node:assert/strict';

export async function diagnosisStickyOperations(page){
 const root=page.locator('#ai');
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const geometry=host=>host.evaluate(el=>{
  const table=el.querySelector('table'),header=table.tHead.rows[0].lastElementChild;
  const cells=[header,...[...table.tBodies[0].rows].map(row=>row.lastElementChild).filter(cell=>!cell.hasAttribute('colspan'))];
  const edge=el.getBoundingClientRect().left+el.clientLeft+el.clientWidth;
  return cells.map(cell=>({right:cell.getBoundingClientRect().right,edge,position:getComputedStyle(cell).position,background:getComputedStyle(cell).backgroundColor}));
 });
 const tabs=[['coordination',['core','omission','blocker','solution']],['resource',['focus','deviation']],['execution',['missing','quality']],['closure',['all']]];
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:900});
  for(const [part,items] of tabs){
   await root.locator('[data-gd-part="'+part+'"]').click();
   for(const tab of items){
    await root.locator('[data-gd-tab="'+tab+'"]').click();
    const host=root.locator('.gd-table-scroll');
    await host.evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-160,behavior:'instant'}));
    for(const fraction of [0,.5,1]){
     await host.evaluate((el,f)=>{el.scrollLeft=(el.scrollWidth-el.clientWidth)*f},fraction);await settle();
     for(const cell of await geometry(host)){
      assert.equal(cell.position,'sticky');assert(Math.abs(cell.right-cell.edge)<=2,'操作列保持在表格可视区右侧：'+JSON.stringify({width,part,tab,fraction,...cell}));
      assert.notEqual(cell.background,'rgba(0, 0, 0, 0)','固定列必须有不透明背景');
     }
    }
    if(width===390){
     const button=host.locator('tbody tr').first().locator('td').last().locator('button');
     const hit=await button.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))});
     assert(hit,'窄屏操作按钮不被其他列遮挡');
     await button.click();
     if(part==='coordination'||part==='closure'){const dialog=page.locator('.up-todo-dialog[open]');await dialog.waitFor();await dialog.locator('[data-todo-close]').click()}
     else{await page.locator('.gd-analysis-dialog').waitFor();await page.locator('#close').click()}
    }
   }
  }
 }
 await page.setViewportSize({width:1280,height:900});await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="core"]').click();
 const host=root.locator('.gd-table-scroll'),last=host.locator('thead th').last();
 const before=await last.evaluate(el=>el.getBoundingClientRect().width);
 await last.locator('[data-ui-column-handle]').focus();await page.keyboard.press('ArrowRight');await settle();
 assert(Math.abs(await last.evaluate(el=>el.getBoundingClientRect().width)-before-8)<2,'固定列仍可调整宽度');
 await page.reload();await settle();
 for(const cell of await geometry(root.locator('.gd-table-scroll')))assert(Math.abs(cell.right-cell.edge)<=2,'恢复保存列宽后仍固定右侧');
 await root.locator('[data-gd-search]').fill('不存在的记录');assert.equal(await root.locator('.gd-empty').evaluate(el=>getComputedStyle(el).position),'static','空结果横跨全表，不固定在右边');
 console.log('总诊断11个页签/3种宽度：操作列在左中右滚动位置均固定、窄屏点击、列宽调整/恢复及空结果通过');
}
