import assert from 'node:assert/strict';
export async function cardSeasons(page,kinds=[0,2,3,4,6]){
 const choices=['all','夏季品','冬季品','四季品'];
 const control=k=>page.locator('#riskrail [data-rp-card-season="'+k+'"]');
 const card=k=>page.locator('#riskrail .riskcard').filter({has:page.locator('[data-risk="'+k+'"]')});
 assert.equal(await page.locator('#riskrail [data-rp-card-season]').count(),5);
 for(const k of kinds)await control(k).selectOption('all',{force:true});
 const original={};
 for(const k of kinds){
  original[k]=await card(k).locator('[data-risk]').innerText();
  assert.deepEqual(await control(k).locator('option').allTextContents(),['全部',...choices.slice(1)]);
  let sum=0;
  for(const value of choices.slice(1)){
   await control(k).selectOption(value,{force:true});
   const count=Number((await card(k).locator('[data-risk]').innerText()).match(/\d+/)[0]);sum+=count;
   assert.equal(await card(k).locator('.rp-entry').count(),Math.min(count,6));
   if([0,2,3,4,6].includes(k))assert.equal(Number(await card(k).locator('[data-rp-season-option="'+value+'"] .rp-season-count').innerText()),count,'季品标签数量等于完整入榜数');
   for(const other of kinds.filter(x=>x!==k))assert.equal(await control(other).inputValue(),[3,4].includes(k)&&[3,4].includes(other)?value:'all');
   const names=await card(k).locator('.rp-entry .rp-identity b').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('title')||node.textContent.trim()));
   await card(k).locator('[data-risk]').click();
   assert.equal(await page.locator('[data-rp-filter="attribute"]').inputValue(),value);
   if(count){
    const index=await page.locator('.rp-list-table th').evaluateAll(ns=>ns.findIndex(n=>n.textContent.trim()==='季品'));
    // 当前完整榜单可仅保留季品筛选；有季品展示列时再核对逐行分类。
    const seasons=await page.locator('.rp-list-table tbody tr').evaluateAll((rs,i)=>i<0?[]:rs.map(r=>r.children[i].textContent.trim()),index);
    if(index>=0)assert.ok(seasons.every(s=>s===value));
    const listNames=await page.locator('.rp-list-table tbody .rp-identity b').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('title')||node.textContent.trim()));
    assert.deepEqual((k===6?[...new Set(listNames)]:listNames).slice(0,6),names);
   }else assert.ok(await page.locator('.rp-list-table .empty').count());
   await page.locator('#close').click();
   assert.equal(await control(k).inputValue(),value);
  }
  assert.equal(sum,Number(original[k].match(/\d+/)[0]),'三种季品应覆盖当前入榜产品');
  await control(k).selectOption('all',{force:true});
  assert.equal(await card(k).locator('[data-risk]').innerText(),original[k]);
 }
 for(const width of [1920,1440,390]){
  await page.setViewportSize({width,height:1080});
  for(const k of kinds){
   const field=[0,2,3,4,6].includes(k)?card(k).locator('.rp-season-menu'):control(k).locator('..').locator('summary');
   const b=await field.boundingBox(),more=await card(k).locator('[data-risk]').boundingBox();
   assert.ok(b.x>=0&&b.x+b.width<=width);
   assert.ok(b.x+b.width<=more.x+1||b.y+b.height<=more.y+1||b.y>=more.y+more.height-1,'季品控件与查看全部不应重叠');
  }
 }
 await page.setViewportSize({width:1920,height:1080});
}
