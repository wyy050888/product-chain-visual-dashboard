import assert from 'node:assert/strict';
export async function cardSeasons(page,kinds=[0,2,3,4,6]){
 const choices=['all','夏季品','冬季品','四季品'];
 const control=k=>page.locator('#riskrail [data-rp-card-season="'+k+'"]');
 const card=k=>page.locator('#riskrail .riskcard').filter({has:page.locator('[data-risk="'+k+'"]')});
 assert.equal(await page.locator('#riskrail [data-rp-card-season]').count(),6);
 for(const k of kinds)await control(k).selectOption('all',{force:true});
 const original={};
 for(const k of kinds){
  original[k]=await card(k).locator('[data-risk]').innerText();
  assert.deepEqual(await control(k).locator('option').allTextContents(),['全部',...choices.slice(1)]);
  let sum=0;
  for(const value of choices.slice(1)){
   await control(k).selectOption(value,{force:true});
   const count=Number((await card(k).locator('[data-risk]').innerText()).match(/\d+/)[0]);sum+=count;
   const previews=await card(k).locator('.rp-entry').count(),limit=Math.min(count,6);
   if([6,8].includes(k))assert(previews<=limit,'同一 SPU 的多个平台共用一张卡片');
   else assert.equal(previews,limit);
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
    const previewNames=[0,6,8].includes(k)?[...new Set(listNames)]:listNames;
    assert.deepEqual(previewNames.slice(0,6),names);
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

export async function riskChainFilters(page){
 const board=kind=>page.locator(`#riskrail [data-rp-board="${kind}"]`);
 const chain=kind=>board(kind).getByRole('radiogroup',{name:/链群$/});
 const chainOption=(kind,value)=>chain(kind).locator(`[data-rp-chain-option="${value}"]`);
 const total=async kind=>Number((await board(kind).locator(`[data-risk="${kind}"]`).innerText()).match(/\d+/)[0]);
 const chains=['环境','清洁','厨电','个护&健康'];
 const chainByIndex=['清洁','厨电','环境','个护&健康'];
 const products=new Map(await page.evaluate(()=>referenceSampleAudit().spus.map(row=>[row.spuId,row])));
 const directorKinds=[0,6,8,4,3,2],sharedKinds=[0,6,8,2];
 async function check(kinds){
  for(const kind of kinds){
   const field=chain(kind);
   assert.equal(await chainOption(kind,'all').getAttribute('aria-checked'),'true');
   assert.deepEqual(await field.getByRole('radio').evaluateAll(buttons=>buttons.map(button=>button.firstChild.textContent)),['全部',...chains]);
   const before=await total(kind);
   let sum=0;
   for(const value of chains){
    const option=chainOption(kind,value);
    await option.click();
    const count=await total(kind);sum+=count;
    assert.equal(Number(await option.locator('.rp-platform-count').innerText()),count);
    assert.equal(await field.locator('[aria-checked="true"]').count(),1);
   }
   assert.equal(sum,before,'四个链群覆盖同一榜单的完整范围');
   await chainOption(kind,'环境').click();
   const drawer=board(kind).locator(`[data-risk="${kind}"]`);
   await drawer.click();
   assert.equal(await page.locator('#dialogbody [data-rp-filter="chain"]').inputValue(),'环境');
   await page.locator('#close').click();
  }
  const audit=await page.evaluate(()=>riskBoardPeriodAudit());
  for(const kind of kinds){
   const snapshot=audit.find(row=>row.kind===kind);
   if(snapshot)assert.equal(snapshot.count,await total(kind));
   const ids=snapshot?snapshot.records.map(row=>row.spuId):await board(kind).locator('[data-rp-spu]').evaluateAll(rows=>rows.map(row=>row.dataset.rpSpu));
   assert(ids.every(id=>chainByIndex[products.get(id)?.chain]==='环境'));
  }
 }
 await check(directorKinds);
 const deviation=board(8);
 assert.deepEqual(await deviation.locator('.rp-filter-groups > :not(select)').evaluateAll(nodes=>nodes.map(node=>node.className)),['rp-platform-tags','rp-return-type-tags','rp-season-menu','rp-chain-filter']);
 assert(await deviation.locator('.rp-filter-groups > :is(.rp-return-type-tags,.rp-season-menu,.rp-chain-filter)').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node,'::before').width==='1px')));
 const before=await total(8);
 await deviation.locator('[data-rp-product-type="new"]').click();
 await deviation.locator('[data-rp-season-option="冬季品"]').click();
 assert(await total(8)<=before);
 assert.equal(await chainOption(8,'环境').getAttribute('aria-checked'),'true');
 assert.equal(await board(6).locator('[data-rp-product-type="all"]').getAttribute('aria-checked'),'true');
 await deviation.locator('[data-risk="8"]').click();
 for(const [field,value] of [['chain','环境'],['productType','new'],['attribute','冬季品']]){
  assert.equal(await page.locator(`#dialogbody [data-rp-filter="${field}"]`).inputValue(),value);
 }
 await page.locator('#close').click();
 await chainOption(8,'环境').focus();await page.keyboard.press('ArrowRight');
 assert.equal(await chainOption(8,'清洁').getAttribute('aria-checked'),'true');
 await page.goto(new URL('产品中心.html',page.url()).href);
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await check(sharedKinds);
 const inventory=page.locator('#inventory-stagnant-top');
 await inventory.getByRole('radio',{name:'清洁'}).click();
 const top=await page.evaluate(()=>inventoryControlAudit().stagnantTop);
 assert(top.rows.length>0&&top.rows.every(row=>chainByIndex[products.get(row.spuId)?.chain]==='清洁'));
}
