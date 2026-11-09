import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const platformKeys={抖音:['frozen','offShelf','limited','problemSpus'],快手:['fine','offShelf','problemSpus'],视频号:['fine','offShelf','limited','problemSpus'],天猫:['fine','offShelf','problemSpus'],京东:['fine','offShelf','limited','problemSpus'],拼多多:['frozen','fine','offShelf','drop','problemSpus']};
function verifyPlatformModel(){
 const types=['fine','frozen','offShelf','drop','limited'],ctx=vm.createContext({DATA_CUTOFF:'2026-10-28',fmt:String,
  rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),brcNumber:()=>3,
  riskRange:(start,end)=>({start,end}),riskShopPeriod:()=>({events:[{date:'2026-10-05',amount:100}]}),
  sampleShopNonQualityEvents:()=>types.map(type=>({type,reasonType:'operations'})),
  riskMonthShift:month=>month==='2026-10'?'2026-11':'2026-12'});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-shop.js',import.meta.url),'utf8'),ctx);
 for(const [platform,keys] of Object.entries(platformKeys)){
  assert.deepEqual(Array.from(ctx.rpShopMetricKeys(platform)),keys);
  const events=ctx.rpShopPeriodEvents({id:3,channel:platform,frozenAmount:100},'2026-10-01','2026-10-28',false);
  assert.deepEqual([...new Set(events.map(event=>event.type))].sort(),keys.filter(key=>key!=='problemSpus').sort(),'事件和统计只纳入平台支持的类型');
  for(const type of types)assert.equal(ctx.rpShopMetricAllowed(type,platform),keys.includes(type));
  if(platform==='视频号')assert(['score','productScore','logisticsScore','serviceScore'].every(key=>Array.from(ctx.rpShopColumns(platform)).includes(key)));
  const columns=Array.from(ctx.rpShopColumns(platform)).filter(key=>types.includes(key)||key==='problemSpus');assert.deepEqual(columns,keys,'完整榜单顺序一致');
 }
 ctx.rpShopReturnProducts=(_shop,end)=>Array.from({length:end==='current'?2:0},()=>({target:10,current:15,previous:14}));ctx.brcMatch=(_key,value)=>value>3;
 let field=ctx.rpShopProblemField({},'current','previous');assert.equal(field.value,'2个');assert.equal(field.target,'环比 +2个');assert.equal(field.targetTone,'rp-quality-red');
 field=ctx.rpShopProblemField({},'previous','current');assert.equal(field.target,'环比 -2个');assert.equal(field.targetTone,'rp-quality-green');
 field=ctx.rpShopProblemField({},'current','current');assert.equal(field.target,'环比 持平');assert.equal(field.targetTone,'rp-quality-gray');
}

export async function shopPlatformMetrics(page){
 verifyPlatformModel();await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const board=page.locator('#riskrail [data-rp-board="1"]'),violationKeys=['fine','frozen','offShelf','drop','limited','problemSpus'];
 for(const [platform,keys] of Object.entries(platformKeys)){
  await board.locator('[data-rp-platform-option="'+platform+'"]').click();
  const cards=board.locator('.rp-shop-entry');assert(await cards.count()>0,platform+'保留可核对的店铺样例');
  for(const card of await cards.all()){
   if(platform==='视频号'){
    assert.equal(await card.locator('.rp-shop-scores [data-rp-field]').count(),4,'视频号卡片保留四项评分');
    assert.equal(await card.locator('.rp-shop-scores .rp-quality-red,.rp-shop-scores .rp-quality-yellow,.rp-shop-scores .rp-quality-green').count(),0,'视频号评分不判灯');
   }
   assert.deepEqual(await card.locator('.rp-shop-values [data-rp-field]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpField)),keys,platform+'卡片字段及顺序');
   for(const key of keys){
    const metric=card.locator('.rp-shop-metric[data-rp-field="'+key+'"]'),value=await metric.locator(':scope>strong').innerText(),comparison=await metric.locator(':scope>small').innerText();
    if(['fine','frozen'].includes(key)){assert(!/次/.test(value));assert.match(comparison,/^[\d,]+次$/)}
    else if(key==='problemSpus'){assert.match(value,/^[\d,]+个$/);assert.match(comparison,/^环比\s(?:持平|[+-][\d,]+个)$/)}
    else {assert.match(value,/^[\d,]+次$/);assert.match(comparison,/^环比/)}
   }
  }
  const first=cards.first(),firstId=await first.getAttribute('data-rp-row'),values={};
  for(const key of keys)values[key]={value:await first.locator('[data-rp-field="'+key+'"]>strong').innerText(),target:await first.locator('[data-rp-field="'+key+'"]>small').innerText()};
  await board.locator('[data-risk="1"]').click();
  const table=page.locator('#dialogbody .rp-shop-table');
  if(platform==='视频号')assert.equal(await table.locator('[data-rp-sort="score"],[data-rp-sort="productScore"],[data-rp-sort="logisticsScore"],[data-rp-sort="serviceScore"]').count(),4,'视频号完整榜单保留四项评分列');
  assert.deepEqual(await table.locator('thead [data-rp-sort]').evaluateAll((nodes,allowed)=>nodes.map(node=>node.dataset.rpSort).filter(key=>allowed.includes(key)),violationKeys),keys,'完整榜单隐藏不适用列并遵守平台顺序');
  const headers=await table.locator('thead [data-rp-sort]').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>[node.dataset.rpSort,node.closest('th').cellIndex]))),row=table.locator('tbody tr').filter({has:page.locator('[data-riskitem="'+firstId.replace(':',',')+'"]')});
  assert.equal(await row.count(),1);
  for(const key of keys){const cell=row.locator('td').nth(headers[key]);assert.equal(await cell.locator('strong').innerText(),values[key].value);assert.equal(await cell.locator('em').innerText(),values[key].target)}
  await page.locator('#close').click();
  await cards.first().locator('.rp-detail-link').click();await page.locator('.sd-detail [data-drawer-tab="violations"]').click();
  const root=page.locator('.sd-detail');
  assert.deepEqual(await root.locator('.sd-violation-stats [data-up-quality-metric]').evaluateAll(nodes=>nodes.map(node=>node.dataset.upQualityMetric)),['violations',...keys]);
  assert.deepEqual(await root.locator('[data-sd-type]').evaluateAll(nodes=>nodes.map(node=>node.dataset.sdType)),['all',...keys.filter(key=>key!=='problemSpus')]);
  for(const key of keys){const metric=root.locator('.sd-violation-stats [data-up-quality-metric="'+key+'"]');assert.equal((await metric.locator('strong').innerText()).replace(/元$/,''),values[key].value);assert.equal(await metric.locator('.up-quality-comparison').innerText(),values[key].target)}
  const total=Number((await root.locator('[data-up-quality-metric="violations"] strong').innerText()).replace(/[,次]/g,''));assert.equal(await root.locator('[data-sd-violation-table] tbody tr').count(),total,'统计数和允许类型的事件明细一致');
  await root.locator('[data-sd-violation-quality]').uncheck();assert.equal(await root.locator('[data-sd-type]').count(),keys.length,'全部原因不重新引入不支持的类型');
  await page.locator('#close').click();
 }
 for(const width of [1920,1280,390,320]){
  await page.setViewportSize({width,height:1080});
  assert(await board.locator('.rp-shop-entry').first().evaluate(card=>[...card.querySelectorAll('.rp-shop-metric')].every(metric=>metric.getBoundingClientRect().right<=card.getBoundingClientRect().right+1)),'不同指标数自适应卡片宽度');
 }
 console.log('通过：六平台卡片/完整榜单/店铺详情类型、顺序、主辅值及问题SPU数量变化。');
}
