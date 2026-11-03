import assert from 'node:assert/strict';
export async function compassShopConfig(page){
 const context=page.context(),root=new URL('数智罗盘/店铺配置.html',page.url()).href;
 await page.locator('#riskrail [data-risk="1"]').click();
 const before=await page.locator('#dialogsub').innerText(),original=page.url();
 const opened=context.waitForEvent('page');await page.locator('#rp-shop-type-config').click();const admin=await opened;
 await admin.waitForLoadState();const errors=[];admin.on('pageerror',e=>errors.push(e.message));
 try{
  assert.equal(page.url(),original);assert(await page.locator('#overlay').isVisible());assert.equal(await page.locator('#dialogsub').innerText(),before);
  assert(decodeURI(admin.url()).includes('数智罗盘/店铺配置.html'));
  const go=async(platform)=>{await admin.goto(root+'?platform='+platform+'&date=2026-10-16');await admin.locator('#shop-rows tr').first().waitFor()};
  const audit=()=>admin.evaluate(()=>window.shopAdminAudit());
  for(const platform of ['douyin','kuaishou','wechat','tmall','jd','pdd']){
   await go(platform);assert.equal(await admin.locator('[data-platform]').count(),6);assert.equal(await admin.locator('aside .menu-selected').innerText(),'店铺配置');
   const data=await audit();assert(data.shops.length>0);
   const allowed=platform==='jd'?['自营','POP旗舰店','POP专卖店']:['旗舰店','专卖店'];
   const choices=await admin.locator('[data-shop-category]').first().locator('option:not([disabled])').allTextContents();assert.deepEqual(choices,allowed);
   for(const shop of data.shops)assert([...allowed,'无分类'].includes(shop.metadata.shopCategory));assert.equal(data.readonly,['tmall','jd','pdd'].includes(platform));
   const heads=await admin.locator('.shop-table th').allTextContents();assert(heads.includes('店铺分类')&&heads.includes('是否考核店铺'));
   assert.equal(await admin.locator('#shop-rows td input:not([type=hidden])').count(),0);
   if(data.readonly){assert(heads.includes('店铺策略')&&heads.includes('店铺推广'));assert.equal(await admin.locator('#shop-rows [data-open]').count(),0);assert(await admin.locator('#records-open').isVisible());}
   else assert(await admin.locator('#shop-rows [data-open]').count()>0);
  }
  // 原负责配置的创建、记录和持久化在三平台均可操作。
  for(const platform of ['douyin','kuaishou','wechat']){
   await go(platform);let data=await audit();const shop=data.shops.find(s=>!s.configs.length);assert(shop);
   await admin.locator('#shop-search').fill(shop.id);await admin.locator('[data-open="'+shop.id+'"]').click();await admin.locator('#new-config').click();
   await admin.locator('input[name=mode][value=long]').check();await admin.locator('#config-start').fill('2026-10-17');
   const region=await admin.locator('#long-region option').nth(1).getAttribute('value');await admin.locator('#long-region').selectOption(region);
   await admin.locator('#long-owner').fill('邓新凯');await admin.locator('#long-owner').press('ArrowDown');await admin.locator('#long-owner').press('Enter');await admin.locator('#save-config').click();
   assert(await admin.locator('#new-config-overlay').isHidden());assert((await audit()).shops.find(s=>s.id===shop.id).configs.some(c=>c.owner==='邓新凯'));
   await admin.locator('#shop-records').click();assert((await admin.locator('#records-overlay').innerText()).includes('邓新凯'));await admin.keyboard.press('Escape');await admin.keyboard.press('Escape');
   await admin.reload();assert((await audit()).shops.find(s=>s.id===shop.id).configs.length>0);
  }
  // 行内分类与考核即时保存，筛选、重置、刷新均读取同一值。
  await go('douyin');let data=await audit();const watched=data.shops.find(s=>s.id==='306131028');assert(watched);
  await admin.locator('#shop-search').fill(watched.id);let row=admin.locator('[data-shop="'+watched.id+'"]');
  await row.locator('[data-shop-category]').selectOption('专卖店');await row.getByRole('switch').click();
  await admin.locator('#category-filter').selectOption('专卖店');await admin.locator('#assessed-filter').selectOption(watched.metadata.assessed?'no':'yes');assert.equal(await admin.locator('#shop-rows [data-shop]').count(),1);
  await admin.reload();await admin.locator('#shop-search').fill(watched.id);row=admin.locator('[data-shop="'+watched.id+'"]');assert.equal(await row.locator('[data-shop-category]').inputValue(),'专卖店');assert.equal(await row.getByRole('switch').getAttribute('aria-checked'),String(!watched.metadata.assessed));
  await admin.locator('#shop-filter-reset').click();assert((await admin.locator('#shop-rows [data-shop]').count())>1);
  // 原榜单收到新标签页元数据，仍保留原查询范围。
  await page.bringToFront();await page.locator('[data-rp-filter="query"]').fill(watched.id);assert.match(await page.locator('#rf-list-table tbody').innerText(),/专卖店/);assert.equal(await page.locator('#dialogsub').innerText(),before);
  // 详情已打开时也同步，保留当前日期和页签。
  await page.locator('#rf-list-table [data-riskitem]').first().click();await page.locator('.sd-detail').waitFor();
  const detailPeriod=await page.locator('#dialogsub').innerText();
  await admin.locator('#shop-search').fill(watched.id);
  await row.locator('[data-shop-category]').selectOption('旗舰店');
  await page.waitForFunction(()=>document.querySelector('[data-sd-category]')?.textContent==='旗舰店');
  assert.equal(await page.locator('#dialogsub').innerText(),detailPeriod);
  await page.locator('.drawer-back').click();
  assert.match(await page.locator('#rf-list-table tbody').innerText(),/旗舰店/);
  // 旧非法分类保留无分类与独立考核，可筛出后人工修正。
  await admin.evaluate(id=>{const key='shop-classification-config-v1',store=JSON.parse(localStorage.getItem(key));store.shops['抖音|'+id]={shopCategory:'C店',assessed:false};localStorage.setItem(key,JSON.stringify(store))},watched.id);
  await admin.reload();await admin.locator('#category-filter').selectOption('无分类');await admin.locator('#shop-search').fill(watched.id);
  row=admin.locator('[data-shop="'+watched.id+'"]');assert.equal(await row.locator('[data-shop-category]').inputValue(),'');assert.equal(await row.getByRole('switch').getAttribute('aria-checked'),'false');
  await row.getByRole('switch').click();assert.equal((await audit()).shops.find(s=>s.id===watched.id).metadata.shopCategory,'无分类');
  await admin.locator('#category-filter').selectOption('');await row.locator('[data-shop-category]').selectOption('专卖店');
  // 最新分配快照：目标调整后只读取该次分配，不合并旧月份负责人。
  await go('tmall');const goalOpened=context.waitForEvent('page');await admin.evaluate(url=>window.open(url,'_blank'),new URL('目标管理/目标管理.html',root).href);const target=await goalOpened;target.on('pageerror',e=>errors.push(e.message));
  try{
   await target.waitForLoadState();await target.waitForFunction(()=>Boolean(window.GoalPrototype?.targetStore));
   await target.evaluate(()=>{
    const a=GoalPrototype,cid='一类不含 CID',records=[10,11,12].flatMap(monthNumber=>a.targetStore.read('product',{year:2026,monthNumber,cid}));
    const original=records.find(r=>r.shopId==='konka');
    for(const row of records)if(row.shopId==='konka')Object.assign(row,{region:'品牌二区',regionId:'REGION002',strategy:'孙豫帆',strategyId:'USER003',promotion:'郑成波',promotionId:'USER007'});
    records.push({...original,product:'跨品牌目标样例',productCode:'',productMatch:'unmatched',brand:'创维',monthNumber:12,region:'品牌二区',regionId:'REGION002',strategy:'孙豫帆',strategyId:'USER003',promotion:'郑成波',promotionId:'USER007'});
    a.targetStore.applyImport(a.targetStore.importPlan('product',records,cid),'店铺配置联动样例.xlsx');
   });
   await admin.waitForFunction(()=>{const s=window.shopAdminAudit().shops.find(s=>s.id==='konka');return s.attribution.brand.includes('创维')&&s.attribution.region.includes('品牌二区')&&s.attribution.strategy.includes('孙豫帆')&&s.attribution.promotion.includes('郑成波')});
   const mapped=(await audit()).shops.find(s=>s.id==='konka').attribution;
   assert(!mapped.region.includes('品牌三区')&&!mapped.strategy.includes('余志鹏'),'旧负责人只保留在分配记录');
   await admin.locator('#shop-search').fill('konka');assert(await admin.locator('[data-shop=konka]').isVisible());const entry=admin.locator('[data-shop=konka]');
   const sourceBefore=await target.evaluate(()=>localStorage.getItem('goal-prototype-targets-v1'));
   await entry.locator('[data-shop-category]').selectOption('专卖店');await entry.getByRole('switch').click();assert.equal(await target.evaluate(()=>localStorage.getItem('goal-prototype-targets-v1')),sourceBefore,'两个可编辑字段不反向改目标');
   assert.equal(await entry.locator('td.ss-readonly select,td.ss-readonly input').count(),0);
   await admin.locator('#shop-filter-reset').click();await admin.locator('#brand-filter').selectOption('创维');await admin.locator('#region-filter').selectOption('品牌二区');await admin.locator('#owner-filter').fill('孙豫帆');await admin.locator('#promotion-filter').fill('郑成波');assert(await admin.locator('[data-shop=konka]').isVisible());
   // 本月没有目标的店铺不使用主数据冒充导入归属。
   await admin.locator('#shop-filter-reset').click();await admin.locator('#shop-search').fill('suporTmEmpty');assert.equal(await admin.locator('[data-shop=suporTmEmpty] .ss-empty').count(),4);
  }finally{await target.close()}
  // 平台页签键盘循环、窄屏及分页保持可用。
  await go('tmall');await admin.locator('#tab-tmall').focus();await admin.keyboard.press('ArrowRight');await admin.waitForURL(/platform=jd/);assert.equal((await audit()).platform,'jd');
  for(const width of [1920,1280,900,390]){await admin.setViewportSize({width,height:1080});assert(await admin.locator('#shop-assignment').evaluate(e=>e.getBoundingClientRect().width<=innerWidth+1));}
  assert.deepEqual(errors,[]);
 }finally{await admin.close()}
 await page.locator('#close').click();
}
