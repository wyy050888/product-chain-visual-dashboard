import {verifyProductPlatformIsolation} from './product-platform-isolation.mjs';
import {verifyShopPlatformIsolation} from './shop-platform-isolation.mjs';
import assert from 'node:assert/strict';

export async function riskPlatformCards(page){
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const platforms=['抖音','快手','视频号','天猫','京东','拼多多'];
 const board=kind=>page.locator('#riskrail [data-rp-board="'+kind+'"]');
 const summaryPeriod=async()=> (await board(0).locator('.rp-quality-summary-period').innerText()).replace(/\s+/g,' ').trim();
 const checkSummary=async()=>{
  const {summaryRecords}=await page.evaluate(()=>riskPlatformCardsSnapshot().boards.find(model=>model.kind===0));
  const events=summaryRecords.flatMap(row=>row.events).filter(event=>event.reasonType==='quality');
  const amount=type=>events.filter(event=>event.type===type).reduce((sum,event)=>sum+Number(event.amount||0),0);
  const count=type=>events.filter(event=>event.type===type).length;
  const expected={
   products:new Set(summaryRecords.map(row=>row.spuId)).size,
   fine:amount('罚款'),
   frozen:amount('资金冻结'),
   offShelf:count('下架'),
   drop:count('掉权')
  };
  const actual=await board(0).locator('[data-rp-summary]').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>{
   const value=node.querySelector('dd').textContent;
   return [node.dataset.rpSummary,value==='--'?null:Number(value.replace(/[^\d.-]/g,''))];
  })));
  assert.deepEqual(actual,expected,'汇总按全平台命中SPU及其处罚事件计算');
  return actual;
 };
 const checkValues=async(qualityGsvLabel='近30日 GSV',qualityRange)=>{
  const audit=await page.evaluate(()=>riskPlatformCardsSnapshot());
  if(qualityRange){
   assert.deepEqual(audit.range,qualityRange);
   assert(audit.boards.find(model=>model.kind===0).records.length>0,'所选期间有违规卡片可核对');
  }
  for(const model of audit.boards){
   if(qualityRange&&model.kind!==0)continue;
   const cards=board(model.kind).locator('.rp-platform-product');assert.equal(await cards.count(),model.records.length);assert(model.records.length<=6);
   const identities=await cards.evaluateAll(es=>es.map(e=>e.dataset.rpSpu));assert.equal(new Set(identities).size,identities.length,'同一SPU不重复占位');
   assert.deepEqual(identities,model.records.map(r=>r.spuId));assert.equal(await cards.locator('.rp-identity-title .rp-platform-mark').count(),0,'产品信息不重复附加单一平台标识');
   for(const [index,record]of model.records.entries()){
    const card=cards.nth(index),visible=model.displayPlatforms.filter(platform=>record.violatedPlatforms.includes(platform));
    assert.deepEqual(await card.locator('[data-rp-platform-row]').evaluateAll(es=>es.map(e=>e.dataset.rpPlatformRow)),visible);
    assert.equal(await card.locator('.rp-platform-card-head [role=columnheader]').count(),0);
    assert.equal(await card.locator('[role=table]').count(),0,'产品两榜使用平台分组而非表格');assert.deepEqual(await card.locator('.rp-platform-card-head .rp-platform-metric-label').allTextContents(),model.kind===0?['平台罚款','资金冻结','链接下架','链接掉权',qualityGsvLabel]:['总退环比','已收退环比','未收退环比','10/4–10/10 GSV']);assert.equal(await card.locator('.rp-platform-card-scroll').evaluate(node=>getComputedStyle(node).borderTopWidth),'0px');
    for(const data of record.platforms.filter(data=>visible.includes(data.platform))){
     const row=card.locator('[data-rp-platform-row="'+data.platform+'"]');
     for(const [key,value]of [['gsv',data.gsvCents],...(model.kind===6?[['return',data.returnRate],['received',data.receivedRate]]:[])]){
      const raw=await row.locator('[data-rp-field="'+key+'"]').getAttribute('data-value');
      assert.equal(raw===''?null:Number(raw),value,'按平台取原始业绩 '+key+' '+data.platform);
     }
     if(model.kind===0){
      for(const key of ['fine','frozen','offShelf','drop']){
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
   const rows=await card.locator('[data-rp-platform-row][role=group]').evaluateAll(es=>es.map(e=>e.dataset.rpPlatformRow));
   assert(rows.length>0&&rows.every(platform=>visible.includes(platform)),'卡片至少有一个所选命中平台');
  }
 };
 await verifyShopPlatformIsolation(page);await verifyProductPlatformIsolation(page);await checkSelection(['抖音','天猫']);
 assert.deepEqual(await board(0).locator('.rp-quality-summary dt').allTextContents(),['违规产品','平台罚款','资金冻结','链接下架','链接掉权']);
 assert.equal(await summaryPeriod(),'近30日 全平台合计');
 const initialSummary=await checkSummary();
 assert(initialSummary.products>6,'汇总覆盖前六张卡片之外的产品');
 assert.equal(await page.locator('#riskrail .rp-quality-summary').count(),1,'仅产品违规榜显示汇总');
 const productType=value=>board(0).locator('[data-rp-product-type="'+value+'"]');
 await productType('new').click();assert((await checkSummary()).products<initialSummary.products,'汇总响应新老品筛选');await productType('all').click();
 const season=value=>board(0).locator('[data-rp-season-option="'+value+'"]');
 assert.deepEqual(await board(0).locator('[data-rp-season-option]').evaluateAll(nodes=>nodes.map(node=>node.childNodes[0].textContent)),['全部','夏季品','冬季品','四季品']);
 assert.equal(await board(0).locator('.rp-quality-actions [data-rp-card-season],.rp-quality-actions .pf-multi').count(),0,'右侧不再显示季品下拉框');
 assert.equal(await board(0).locator('.rp-platform-menu [data-rp-season-menu="0"]').count(),1,'季品与平台放在同一筛选区');
 const originalTotal=await board(0).locator('[data-risk]').innerText();
 assert.equal(await board(0).locator('.rp-season-tags').getAttribute('role'),'radiogroup');assert.equal(await board(0).locator('[data-rp-card-season]').evaluate(node=>node.multiple),false);
 await season('夏季品').click();assert.equal(await season('夏季品').getAttribute('aria-checked'),'true');
 assert((await checkSummary()).products<initialSummary.products,'汇总响应季品筛选');
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
  assert.equal(boxes.length,4);assert(boxes.every((b,i)=>!i||b.top>=boxes[i-1].bottom+10),'品质风险组四榜各占整行');
  for(const kind of [0,6,8,1]){
   const host=board(kind);
   const layout=await host.evaluate(e=>{
    const head=e.querySelector('.rhead'),header=head.getBoundingClientRect(),style=getComputedStyle(head);
    const rect=selector=>head.querySelector(selector)?.getBoundingClientRect().toJSON();
    const date=e.querySelector(':scope > .qr-card-date'),items=e.querySelector('.rp-items').getBoundingClientRect();
    return {
     contentLeft:header.left+parseFloat(style.paddingLeft),contentRight:header.right-parseFloat(style.paddingRight),
     title:rect('h3'),period:rect(':scope > [data-rp-board-date]'),summary:rect('.rp-quality-summary'),
     stamp:rect('.rp-quality-summary-period'),firstMetric:rect('[data-rp-summary="products"]'),
     menu:rect('.rp-platform-menu'),actions:rect('.rp-quality-actions'),itemsTop:items.top,
     toolbars:e.querySelectorAll(':scope > .rp-card-toolbar').length,date:date?.textContent,
     gap:items.top-(date||head).getBoundingClientRect().bottom
    };
   });
   assert.equal(layout.toolbars,0,'整行榜不保留额外筛选工具栏');if([6,8].includes(kind)){assert.match(layout.date,/\d{2}\/\d{2}\/\d{2}/,'退货榜展示统计日期');assert(layout.gap>=0&&layout.gap<=16,'日期与产品区紧凑衔接')}else assert.equal(layout.date,undefined,'其他榜不重复展示日期说明');
   if(kind===0){
    assert(Math.abs(layout.period.right-layout.contentRight)<1,'日期控件对齐标题区右侧');
    assert(layout.summary.top>=Math.max(layout.title.bottom,layout.period.bottom)&&layout.menu.top>=layout.summary.bottom&&layout.actions.top>=layout.summary.bottom,'日期和标题在汇总上方，筛选区在汇总下方');
    assert(Math.abs(layout.summary.left-layout.contentLeft)<1&&Math.abs(layout.summary.right-layout.contentRight)<1,'汇总横向占满标题区');
    if(width>600){
     assert(layout.period.top<layout.title.bottom&&layout.title.top<layout.period.bottom,'日期控件和标题同排');
     assert(layout.stamp.right<=layout.firstMetric.left,'期间标记位于汇总数字左侧');
    }
    assert(layout.itemsTop>=Math.max(layout.menu.bottom,layout.actions.bottom),'筛选区在卡片上方');
    if(width>1100)assert(layout.actions.left>=layout.menu.right+10,'平台与右侧操作不重叠');
   }else if(width>1100){assert(Math.abs(layout.title.top+layout.title.height/2-layout.menu.top-layout.menu.height/2)<2,'标题平台垂直居中');assert(layout.menu.left>=layout.title.right+10&&layout.actions.left>=layout.menu.right+10,'平台与右侧操作不重叠');}
   assert(await host.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'榜单外框不横向溢出 '+width);
   const cards=host.locator('.rp-items>.rp-entry'),rects=await cards.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
   const columns=width>=1680?3:width>1100?2:1;
   assert.equal(new Set(rects.map(r=>Math.round(r.top))).size,Math.ceil(rects.length/columns),'六卡按预期分行 '+width);
   for(let i=0;i<rects.length;i+=columns)assert(rects.slice(i,i+columns).every(r=>Math.abs(r.top-rects[i].top)<1),'同排顶端对齐');
   assert(await host.locator('.rp-items').evaluate(e=>e.getBoundingClientRect().bottom-e.lastElementChild.getBoundingClientRect().bottom<3),'底部无多余空行');
   if(kind!==1&&width>=1680)assert(await cards.locator('.rp-platform-card-scroll').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1)),'桌面三列完整显示指标');
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
 assert.deepEqual(await checkSummary(),initialSummary);
 await board(0).locator('[data-rp-platform-option="快手"]').click();await checkValues();
 assert.deepEqual(await checkSummary(),initialSummary,'切换单平台时五项汇总保持全平台口径');
 assert(Number((await board(0).locator('[data-risk]').innerText()).match(/\d+/)[0])<initialSummary.products,'查看全部跟随所选平台');
 await board(0).locator('[data-rp-platform-option="all"]').click();await board(6).locator('[data-rp-platform-option="all"]').click();
 const row=board(6).locator('[data-rp-platform-row]').first(),platform=await row.getAttribute('data-rp-platform-row');
 const actual=(await row.locator('[data-rp-field="return"] small').innerText()).replace(/^实际 /,'');
 await row.locator('[data-rp-platform-detail]').click();
 assert.equal(await page.locator('[data-up-quality-platform="'+platform+'"]').getAttribute('aria-pressed'),'true','点击平台进入对应平台详情');
 assert.equal(await page.locator('.up-return-metrics [data-up-quality-metric="returned"] strong').innerText(),actual,'卡片与详情取数相同');
 await page.locator('#close').click();
 const date=board(0).locator('#rp-board-date-0');await date.click();
 const day=page.locator('#up-date-popover [data-range-date="2026-10-23"]:not(:disabled)');await day.click();await day.click();
 assert.equal(await summaryPeriod(),'所选期间 全平台合计','单日自选沿用所选期间口径');
 await checkValues('GSV',{start:'2026-10-23',end:'2026-10-23'});
 const singleDaySummary=await checkSummary();
 assert(singleDaySummary.drop>0&&singleDaySummary.products<initialSummary.products,'切换日期后汇总仅计算当天事件');
 await board(0).locator('[data-rp-platform-option="抖音"]').click();
 assert.equal(await board(0).locator('.rp-platform-product').count(),0,'抖音当天无命中产品');
 assert.deepEqual(await checkSummary(),singleDaySummary,'所选平台为空榜时仍显示全平台合计');
 await board(0).locator('[data-rp-platform-option="all"]').click();
 const dropRows=await board(0).locator('[data-rp-platform-row]').evaluateAll(rows=>rows.map(row=>({
  platform:row.dataset.rpPlatformRow,counts:Object.fromEntries([...row.querySelectorAll('[data-value]')].map(cell=>[cell.dataset.rpField,Number(cell.dataset.value)])),
  countColors:['offShelf','drop'].map(key=>getComputedStyle(row.querySelector('[data-rp-field="'+key+'"] strong .rp-card-actual-value')).color)
 })));
 assert(dropRows.length>0,'固定单日覆盖仅掉权入榜');
 for(const row of dropRows){
  assert(['京东','拼多多'].includes(row.platform),'全平台筛选隐藏所有未命中平台');
  assert(row.counts.drop>0,'单独命中的掉权展示次数');
  assert.deepEqual(row.countColors,['rgb(0, 0, 0)','rgb(0, 0, 0)'],'下架及掉权的次数均为黑色');
  assert.equal(row.counts.fine+row.counts.frozen+row.counts.offShelf,0,'样例仅由掉权触发入榜');
 }
 await page.setViewportSize({width:390,height:1080});await board(0).screenshot({path:'outputs/risk-platform-quality-390.png'});
 await page.setViewportSize({width:1920,height:1080});
 await date.click();
 await page.locator('#up-date-popover [data-range-date="2026-10-20"]:not(:disabled)').click();
 await day.click();
 assert.equal(await summaryPeriod(),'所选期间 全平台合计');
 await checkValues('GSV',{start:'2026-10-20',end:'2026-10-23'});
 const controls=board(0).locator('[data-rp-board-date]');
 const switchMode=mode=>controls.locator('[data-drawer-time-mode="'+mode+'"]').click();
 await switchMode('month');await controls.locator('[data-drawer-time-value]').selectOption('9');
 assert.equal(await summaryPeriod(),'9月 全平台合计');
 await checkValues('9月 GSV',{start:'2026-09-01',end:'2026-09-30'});
 await switchMode('quarter');
 assert.equal(await summaryPeriod(),'Q3 全平台合计');
 await checkValues('Q3 GSV',{start:'2026-07-01',end:'2026-09-30'});
 await switchMode('year');
 assert.equal(await summaryPeriod(),'26年 全平台合计');
 await checkValues('26年 GSV',{start:'2026-01-01',end:'2026-10-26'});
 console.log('通过：三榜3×2布局、产品两榜平台筛选、违规卡片仅展示本期命中平台、仅掉权入榜及黑色次数、平台详情和响应式布局');
}
