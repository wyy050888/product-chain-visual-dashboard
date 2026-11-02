import {verifyProductPlatformIsolation} from './product-platform-isolation.mjs';
import {verifyShopPlatformIsolation} from './shop-platform-isolation.mjs';
import assert from 'node:assert/strict';

export async function riskPlatformCards(page){
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const platforms=['抖音','快手','视频号','天猫','京东','拼多多'];
 const board=kind=>page.locator('#riskrail [data-rp-board="'+kind+'"]');
 const checkValues=async()=>{
  const audit=await page.evaluate(()=>riskPlatformCardsSnapshot());
  for(const model of audit.boards){
   const cards=board(model.kind).locator('.rp-platform-product');assert.equal(await cards.count(),model.records.length);assert(model.records.length<=6);
   const identities=await cards.evaluateAll(es=>es.map(e=>e.dataset.rpSpu));assert.equal(new Set(identities).size,identities.length,'同一SPU不重复占位');
   assert.deepEqual(identities,model.records.map(r=>r.spuId));assert.equal(await cards.locator('.rp-identity-title .rp-platform-mark').count(),0,'产品信息不重复附加单一平台标识');
   for(const [index,record]of model.records.entries()){
    const card=cards.nth(index);assert.deepEqual(await card.locator('[data-rp-platform-row]').evaluateAll(es=>es.map(e=>e.dataset.rpPlatformRow)),model.displayPlatforms);
    assert.equal(await card.locator('.rp-platform-card-head [role=columnheader]').count(),0);
    assert.equal(await card.locator('[role=table]').count(),0,'产品两榜使用平台分组而非表格');assert.deepEqual(await card.locator('.rp-platform-card-head .rp-platform-metric-label').allTextContents(),model.kind===0?['平台罚款','资金冻结','链接下架','GSV']:['总退','已收退','GSV','销量']);assert.equal(await card.locator('.rp-platform-card-scroll').evaluate(node=>getComputedStyle(node).borderTopWidth),'0px');
    if(model.kind===0)assert.equal(await card.locator('[data-rp-field="drop"]').count(),0,'违规外侧卡片移除链接掉权');
    for(const data of record.platforms.filter(data=>model.displayPlatforms.includes(data.platform))){
     const row=card.locator('[data-rp-platform-row="'+data.platform+'"]');
     for(const [key,value]of [['gsv',data.gsvCents],...(model.kind===6?[['return',data.returnRate],['received',data.receivedRate],['netSales',data.netSales]]:[])]){
      const raw=await row.locator('[data-rp-field="'+key+'"]').getAttribute('data-value');
      assert.equal(raw===''?null:Number(raw),value,'按平台取原始业绩 '+key+' '+data.platform);
     }
     if(model.kind===0){
      for(const key of ['fine','frozen','offShelf']){
       const cell=row.locator('[data-rp-field="'+key+'"]'),main=await cell.locator('strong').innerText(),aux=(await cell.locator('small').innerText()).trim();
       if(main==='--')assert.equal(aux,'','不适用字段不显示次数/环比');
       else if(['fine','frozen'].includes(key))assert.match(aux,/^\d+次$/,'罚款/冻结金额下展示次数');
       else{assert.match(main,/^\d+次$/);assert.match(aux,/^环比/,'下架/掉权次数下展示环比');}
      }
     }
     assert.equal(await row.locator('.rp-platform-metric-label').count(),0,'各平台不重复指标名');const labels=await card.locator('.rp-platform-card-head .rp-platform-metric-label').evaluateAll(nodes=>nodes.map(node=>({left:node.getBoundingClientRect().left,bottom:node.getBoundingClientRect().bottom})));const cells=await row.locator('.rp-platform-metric').evaluateAll(nodes=>nodes.map(node=>({left:node.getBoundingClientRect().left,top:node.getBoundingClientRect().top})));assert(labels.every((label,index)=>Math.abs(label.left-cells[index].left)<1&&cells[index].top>=label.bottom),'共享指标名与各平台数值纵向对齐');assert.equal(await row.evaluate(node=>getComputedStyle(node).backgroundColor),'rgba(0, 0, 0, 0)','平台分组无表格底色');
     const positions=await row.locator('.rp-platform-metric').evaluateAll(es=>es.map(e=>({main:e.querySelector('strong').getBoundingClientRect().top,aux:e.querySelector('small').getBoundingClientRect().top})));assert(positions.every(p=>Math.abs(p.main-positions[0].main)<1&&Math.abs(p.aux-positions[0].aux)<1&&p.aux>p.main),'每个平台主值/辅助值保持两条共同基线');
    }
   }
  }
 };
 const selectedValues=kind=>board(kind).locator('[data-rp-card-platform]').evaluate(e=>[...e.selectedOptions].map(o=>o.value));
 const checkSelection=async (expected,returnExpected=['抖音','天猫'])=>{
  for(const kind of [0,6]){assert.deepEqual(await selectedValues(kind),kind===0?expected:returnExpected,'产品两榜独立所选平台');assert.equal(await board(kind).locator('.rp-platform-tags').getAttribute('role'),'group');}
  for(const kind of [0,6])for(const card of await board(kind).locator('.rp-platform-product').all()){
   const selection=kind===0?expected:returnExpected,visible=selection[0]==='all'?platforms:selection;
   assert.deepEqual(await card.locator('[data-rp-platform-row]').evaluateAll(es=>es.map(e=>e.dataset.rpPlatformRow)),visible,'卡片只展示所选平台');
   assert.equal(await card.locator('[data-rp-platform-row][role=group]').count(),visible.length);
  }
 };
 await verifyShopPlatformIsolation(page);await verifyProductPlatformIsolation(page);await checkSelection(['抖音','天猫']);
 const season=value=>board(0).locator('[data-rp-season-option="'+value+'"]');
 assert.deepEqual(await board(0).locator('[data-rp-season-option]').evaluateAll(nodes=>nodes.map(node=>node.childNodes[0].textContent)),['全部','夏季品','冬季品','四季品']);
 assert.equal(await board(0).locator('.rp-quality-actions [data-rp-card-season],.rp-quality-actions .pf-multi').count(),0,'右侧不再显示季品下拉框');
 assert.equal(await board(0).locator('.rp-platform-menu [data-rp-season-menu="0"]').count(),1,'季品与平台放在同一筛选区');
 const originalTotal=await board(0).locator('[data-risk]').innerText();
 assert.equal(await board(0).locator('.rp-season-tags').getAttribute('role'),'radiogroup');assert.equal(await board(0).locator('[data-rp-card-season]').evaluate(node=>node.multiple),false);
 await season('夏季品').click();assert.equal(await season('夏季品').getAttribute('aria-checked'),'true');
 const seasonTotal=Number((await board(0).locator('[data-risk]').innerText()).match(/\d+/)[0]);
 assert.equal(Number(await season('夏季品').locator('b').innerText()),seasonTotal);assert.equal(await board(0).locator('.rp-platform-product').count(),Math.min(seasonTotal,6));
 await board(0).locator('[data-risk]').click();assert.deepEqual(await page.locator('[data-rp-filter="attribute"]').evaluate(e=>[...e.selectedOptions].map(option=>option.value)),['夏季品']);await page.locator('#close').click();
 await season('冬季品').click();assert.deepEqual(await board(0).locator('[data-rp-card-season]').evaluate(e=>[...e.selectedOptions].map(option=>option.value)),['冬季品'],'冬季品替换夏季品');assert.equal(await board(0).locator('.rp-season-tags [aria-checked="true"]').count(),1);await season('冬季品').click();assert.equal(await season('冬季品').getAttribute('aria-checked'),'true','重复点击已选项不清空');assert.equal(await board(6).locator('[data-rp-card-season]').inputValue(),'all','两榜季品独立');
 await season('all').click();await season('all').focus();await page.keyboard.press('End');await page.keyboard.press('Enter');assert.equal(await season('四季品').getAttribute('aria-checked'),'true','标签支持键盘切换');
 await season('all').click();assert.equal(await board(0).locator('[data-risk]').innerText(),originalTotal);await checkSelection(['抖音','天猫']);
 const counts=await board(0).locator('[data-rp-platform-option]').allTextContents();
 for(const [platform,expected]of [['天猫',['抖音']],['快手',['抖音','快手']],['天猫',['抖音','快手','天猫']],['抖音',['快手','天猫']],['快手',['天猫']],['天猫',['all']]]){await board(0).locator('[data-rp-platform-option="'+platform+'"]').click();await checkSelection(expected);}
 for(const platform of platforms)await board(0).locator('[data-rp-platform-option="'+platform+'"]').click();
 await checkSelection(['all']);assert.equal(await board(0).locator('[data-rp-platform-option="all"]').getAttribute('aria-checked'),'true','逐项选满六平台归一为全平台');
 await board(0).locator('[data-rp-platform-option="抖音"]').click();await board(0).locator('[data-rp-platform-option="天猫"]').click();
 await checkSelection(['抖音','天猫']);assert.deepEqual(await board(0).locator('[data-rp-platform-option]').allTextContents(),counts,'切换不改变各平台数量');
 const keyboard=board(0).locator('[data-rp-platform-option="天猫"]');await keyboard.focus();await keyboard.press('ArrowRight');await checkSelection(['抖音','天猫']);
 await page.keyboard.press(' ');await checkSelection(['抖音','天猫','京东']);await page.keyboard.press('Enter');await checkSelection(['抖音','天猫']);
 for(const kind of [0,6]){
  await board(kind).locator('[data-risk]').click();const control=page.locator(kind===0?'#qr-list-platform':'#rf-return-platform');
  assert.equal(await control.evaluate(e=>e.multiple),true);assert.deepEqual(await control.evaluate(e=>[...e.selectedOptions].map(o=>o.value)),['抖音','天猫'],'完整榜单继承多选');
  await control.selectOption('京东',{force:true});await page.locator('#close').click();await checkSelection(['抖音','天猫']);
 }
 await board(0).screenshot({path:'outputs/risk-platform-quality-1920.png'});
 assert.equal(await board(0).locator('.rp-platform-product').count(),6);assert.equal(await board(6).locator('.rp-platform-product').count(),6);
 await checkValues();
 for(const width of [1920,1680,1600,1599,1440,1100,390]){
  await page.setViewportSize({width,height:1080});
  const boxes=await page.locator('#riskrail .rp-board-group-quality .riskcard').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  assert.equal(boxes.length,3);assert(boxes.every((b,i)=>!i||b.top>=boxes[i-1].bottom+10),'产品违规、退货、店铺各占整行');
  for(const kind of [0,6,1]){
   const host=board(kind);
   const layout=await host.evaluate(e=>{const h=e.querySelector('.rhead'),rect=s=>h.querySelector(s)?.getBoundingClientRect().toJSON(),date=e.querySelector(':scope > .qr-card-date'),items=e.querySelector('.rp-items');return {title:rect('h3'),menu:rect('.rp-platform-menu'),actions:rect('.rp-quality-actions'),toolbars:e.querySelectorAll(':scope > .rp-card-toolbar').length,date:date?.textContent,gap:items.getBoundingClientRect().top-(date||h).getBoundingClientRect().bottom}});
   assert.equal(layout.toolbars,0,'整行榜不保留额外筛选工具栏');if(kind===6){assert.match(layout.date,/\d{2}\/\d{2}\/\d{2}/,'退货榜保留对比日期');assert(layout.gap>=0&&layout.gap<=16,'日期与产品区紧凑衔接')}else assert.equal(layout.date,undefined,'其他榜不重复展示日期说明');
   if(width>1100){assert(Math.abs(layout.title.top+layout.title.height/2-layout.menu.top-layout.menu.height/2)<2,'标题平台垂直居中');assert(layout.menu.left>=layout.title.right+10&&layout.actions.left>=layout.menu.right+10,'平台与右侧操作不重叠');}
   assert(await host.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'榜单外框不横向溢出 '+width);
   const cards=host.locator('.rp-items>.rp-entry'),rects=await cards.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
   const columns=width>=1680?3:width>1100?2:1;
   assert.equal(new Set(rects.map(r=>Math.round(r.top))).size,Math.ceil(rects.length/columns),'六卡按预期分行 '+width);
   for(let i=0;i<rects.length;i+=columns)assert(rects.slice(i,i+columns).every(r=>Math.abs(r.top-rects[i].top)<1),'同排顶端对齐');
   assert(await host.locator('.rp-items').evaluate(e=>e.getBoundingClientRect().bottom-e.lastElementChild.getBoundingClientRect().bottom<3),'底部无多余空行');
   if(kind!==1&&width>=1680)assert(await cards.locator('.rp-platform-card-scroll').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1)),'桌面三列完整显示四项指标');
   if(kind!==1)for(const table of await cards.locator('.rp-platform-card-table').all()){
    const rows=await table.locator('[data-rp-platform-row]').evaluateAll(es=>es.map(e=>[...e.querySelectorAll('[data-rp-field]')].map(n=>n.getBoundingClientRect().right)));
    assert(rows.every(row=>row.every((x,i)=>Math.abs(x-rows[0][i])<1)),'相同指标跨平台纵向对齐');
   }
  }
 }
 await page.setViewportSize({width:1920,height:1080});
 await board(0).screenshot({path:'outputs/risk-platform-quality-1920.png'});
 await board(6).screenshot({path:'outputs/risk-platform-returns-1920.png'});
 await board(1).screenshot({path:'outputs/risk-platform-shops-1920.png'});
 await board(0).locator('[data-rp-platform-option="all"]').click();await checkValues();
 await board(0).locator('[data-rp-platform-option="快手"]').click();await checkValues();
 await board(0).locator('[data-rp-platform-option="all"]').click();await board(6).locator('[data-rp-platform-option="all"]').click();
 const product=board(6).locator('.rp-platform-product').first(),row=product.locator('[data-rp-platform-row="京东"]');
 const actual=await row.locator('[data-rp-field="return"] strong').innerText();
 await row.locator('[data-rp-platform-detail]').click();
 assert.equal(await page.locator('[data-up-quality-platform="京东"]').getAttribute('aria-pressed'),'true','点击平台进入对应平台详情');
 assert.equal(await page.locator('.up-return-metrics [data-up-quality-metric="returned"] strong').innerText(),actual,'卡片与详情取数相同');
 await page.locator('#close').click();
 await page.setViewportSize({width:390,height:1080});await board(0).screenshot({path:'outputs/risk-platform-quality-390.png'});
 console.log('通过：三榜独占整行及3×2布局、产品两榜默认抖音天猫、多选及全平台六行、平台原值、上下两行/跨行对齐、筛选及平台详情一致、窄屏无外溢');
}
