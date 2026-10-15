import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
function qualityModel(){
 const earlier=[{type:'下架',reasonType:'quality'}],ctx=vm.createContext({
  rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),
  fmt:n=>String(n),rpCount:n=>n+'件',pfMoneyYuan:n=>n+'元',upPercent:n=>n.toFixed(1)+'%',
  pfIdentity:r=>r,qrObservation:()=>({monthly:{events:earlier}}),upProduct:p=>p,upIdentity:r=>r,
 });
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-quality.js',import.meta.url),'utf8'),ctx);
 const events=[{type:'罚款',amount:7000},{type:'资金冻结',amount:3000},{type:'下架',amount:0},{type:'掉权',amount:0}].map(e=>({...e,reasonType:'quality'}));
 const record={platform:'抖音',monthly:{events,fine:7000,frozen:3000}};
 const current={sales:100,returned:20,gsvCents:80000,profitRate:20,contactRate:10,badRate:3,returnRate:10.5,receivedRate:8.2};
 const previous={sales:100,returned:10,gsvCents:100000,profitRate:10,contactRate:20,badRate:2,start:'2026-09-01',end:'2026-09-10'};
 const rows=ctx.rpQualityFields(record,[...['gsv','margin','contact','bad','return','received','fine','frozen'].map(key=>({key})),{key:'returnTarget',sortValue:10},{key:'receivedTarget',sortValue:8}],current,previous);
 const fields=Object.fromEntries(Array.from(rows,f=>[f.key,f]));
 assert.equal(fields.netSales.sortValue,80);
 const productFields=ctx.rpQualityProductFields({attribute:'冬季品',isNew:true,clearance:true});
 assert.equal(productFields[0].value,'冬季品');
 assert.equal(productFields[1].value,'新品、清仓品');
 assert.equal(ctx.rpQualityProductFields({isNew:false})[1].value,'老品');
 assert.equal(ctx.rpQualityProductFields({})[1].value,'—');
 assert.equal(fields.gsv.target,'环比 ↓ 20.0%');
 assert.equal(fields.margin.target,'环比 ↑ 100.0%');
 assert.equal(fields.violations.sortValue,4);assert.equal(fields.violations.target,'环比 ↑ 300.0%');
 assert.equal(fields.sanctions.sortValue,10000);assert.equal(fields.sanctions.target,'1次/1次');
 assert.equal(fields.down.value,'2次');assert.equal(fields.down.sortValue,2);assert.equal(fields.down.target,'环比 ↑ 100.0%');
 assert.equal(fields.offShelf.value,'1次');assert.equal(fields.offShelf.target,'环比 持平');
 assert.equal(fields.drop.value,'1次');assert.equal(fields.drop.target,'环比 --');
 assert.equal(fields.fine.target,'1次');assert.equal(fields.frozen.target,'1次');
 assert.equal(ctx.rpQualityChange(5,0),'环比 --');
 assert.equal(ctx.rpQualityChange(0,0),'环比 持平');
 assert.equal(ctx.rpQualityChange(10,10),'环比 持平');
 assert.equal(ctx.rpQualityChange(5,null),'环比 --');
 assert.equal(ctx.rpQualityChange(null,5),'环比 --');
 assert.equal(ctx.rpQualityChange(9.99999,10),'环比 持平');
 for(const value of [-0.049,-0.001,0,0.001,0.049]){
  assert.equal(ctx.rpComparisonText(value),'环比 持平');
  assert.equal(ctx.rpComparisonTone(value),'rp-quality-gray');
 }
 assert.equal(ctx.rpComparisonText(0.051),'环比 ↑ 0.1%');
 assert.equal(ctx.rpComparisonText(-0.051),'环比 ↓ 0.1%');
 // 使用原值判断阈值，覆盖正负边界、缺失和各自目标。
 for(const [now,before,tone] of [[100.1,100,'green'],[105,100,'green'],[110,100,'green'],[100,100,'gray'],[95,100,'gray'],[90,100,'gray'],[110.01,100,'green'],[89.99,100,'red'],[0,0,'gray'],[null,10,'gray'],[10,null,'gray']])
  assert.equal(ctx.rpQualityChangeTone(now,before),'rp-quality-'+tone);
 for(const [actual,target,tone] of [[9,10,'normal'],[10,10,'gray'],[10.49,10,'yellow'],[10.5,10,'red'],[10.51,10,'red'],[8.4,8,'red'],[null,8,'gray'],[8,null,'gray'],[0,0,'gray'],[1,0,'red']]){
  const rule=ctx.rpQualityReturnRule(actual,target);
  assert.equal(rule.tone,'rp-quality-'+tone);assert.equal(rule.targetTone,tone==='normal'?'rp-quality-green':rule.tone);
 }
 assert.equal(fields.return.tone,'rp-quality-red');
 assert.equal(fields.received.tone,'rp-quality-yellow');
 assert.equal(fields.gsv.targetTone,'rp-quality-red');
 assert.equal(fields.margin.targetTone,'rp-quality-green');
 assert.equal(fields.contact.targetTone,'rp-quality-red');
 assert.equal(fields.bad.targetTone,'rp-quality-green');
 assert.equal(fields.violations.targetTone,'rp-quality-green');
 assert.equal(fields.bad.target,'环比 ↑ 50.0%');
 for(const value of [0,null,undefined])assert.equal(ctx.rpQualityAmountTone(value),'rp-quality-gray');
 assert.equal(ctx.rpQualityAmountTone(1),'rp-quality-red');
 // 混合原因验证：未分类也只进入全部口径，金额、次数与环比使用同一批事件。
 const mixed={...record,monthly:{...record.monthly,allEvents:[...events,{type:'罚款',amount:100,reasonType:'logistics'},{type:'罚款',amount:50},{type:'资金冻结',amount:200,reasonType:'operations'},{type:'下架',amount:0,reasonType:'operations'},{type:'掉权',amount:0,reasonType:'operations'}]}};
 earlier.push({type:'下架',reasonType:'operations'});
 const scopeFields=qualityOnly=>Object.fromEntries(Array.from(ctx.rpQualityFields(mixed,[{key:'fine'},{key:'frozen'}],current,previous,qualityOnly),f=>[f.key,f]));
 const quality=scopeFields(true),all=scopeFields(false);
 assert.equal(quality.fine.sortValue,7000);assert.equal(all.fine.sortValue,7150);
 assert.equal(quality.fine.target,'1次');assert.equal(all.fine.target,'3次');
 assert.equal(quality.frozen.sortValue,3000);assert.equal(all.frozen.sortValue,3200);
 assert.equal(quality.violations.sortValue,4);assert.equal(all.violations.sortValue,9);
 assert.equal(quality.violations.target,'环比 ↑ 300.0%');assert.equal(all.violations.target,'环比 ↑ 350.0%');
 assert.equal(quality.down.sortValue,2);assert.equal(all.down.sortValue,4);
 assert.equal(quality.offShelf.sortValue,1);assert.equal(all.offShelf.sortValue,2);
 assert.equal(quality.drop.sortValue,1);assert.equal(all.drop.sortValue,2);
 assert.equal(record.monthly.events.length,4,'口径切换不能改写原始事件');


}
// 新增趋势按当天原始分子/分母计算，零基数保留暂无数据。
function qualityTrendModel(){
 const daily=[{date:'2026-10-09',sales:200,contacts:30,reviews:40,bad:3,returned:10,received:5,gsvCents:10000,profitCents:1000},
  {date:'2026-10-10',sales:0,contacts:0,reviews:0,bad:0,returned:0,received:0,gsvCents:0,profitCents:0}];
 const ctx=vm.createContext({riskRange:()=>({end:'2026-10-10'}),shiftDate:()=> '2026-10-04',upIdentity:r=>r,
  upSummary:()=>({points:daily}),rpQualityEvents:()=>[]});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/03-trends.js',import.meta.url),'utf8'),ctx);
 const points=ctx.rpTrendPoints(0,{spuId:'test',platform:'抖音'});
 assert.equal(points[0].contact,15);assert.equal(points[0].bad,7.5);
 assert.equal(points[1].contact,null);assert.equal(points[1].bad,null);
 ctx.rpQualityEvents=(_record,_start,_end,qualityOnly)=>qualityOnly?[{date:'2026-10-09'}]:[{date:'2026-10-09'},{date:'2026-10-09'}];
 assert.equal(ctx.rpTrendPoints(0,{spuId:'test',platform:'抖音'},true)[0].violations,1);
 assert.equal(ctx.rpTrendPoints(0,{spuId:'test',platform:'抖音'},false)[0].violations,2);

}
async function verifyQualityColors(page,selector){
 const colors={red:'rgb(195, 61, 86)',green:'rgb(0, 164, 134)',yellow:'rgb(184, 122, 32)',gray:'rgb(134, 147, 164)'};
 const rendered=await page.locator(selector).evaluateAll(nodes=>nodes.flatMap(n=>[...n.querySelectorAll('strong,small,em')].map(el=>({tone:[...el.classList].find(c=>/^rp-quality-(red|green|yellow|gray|normal)$/.test(c)),tag:el.tagName,color:getComputedStyle(el).color}))));
 assert.ok(rendered.some(item=>item.tone));
 for(const item of rendered)if(item.tone)assert.equal(item.color,item.tone==='rp-quality-normal'?(item.tag==='STRONG'?'rgb(82, 101, 125)':colors.gray):colors[item.tone.replace('rp-quality-','')]);
}
export async function qualityPreview(page){
 qualityModel();qualityTrendModel();
 await page.setViewportSize({width:1920,height:1080});
 const card=page.locator('#riskrail .riskcard').first();
 assert.equal(await card.locator('.rp-quality-entry').count(),6);
 assert.deepEqual(await card.locator('.rp-quality-entry').first().locator('[data-rp-field]').evaluateAll(nodes=>nodes.map(n=>n.dataset.rpField)),['gsv','return','received','sanctions','contact']);
 for(const width of [1440,390,1920]){
  await page.setViewportSize({width,height:1080});
  const overflow=await card.evaluate(c=>[...c.querySelectorAll('.rp-quality-metric')].filter(el=>el.scrollWidth>el.clientWidth+1).length);
  assert.equal(overflow,0,'卡片指标溢出，宽度'+width);
 }
 await verifyQualityColors(page,'.rp-quality-metric');
 assert.ok(await page.locator('#riskrail .rp-quality-metric .rp-comparison-label').evaluateAll(ns=>ns.length>0&&ns.every(n=>getComputedStyle(n).color==='rgb(134, 147, 164)')));
 await card.screenshot({path:fileURLToPath(new URL('../../outputs/quality-card-v2.png',import.meta.url))});
 await page.locator('#riskrail [data-risk="0"]').click();
 assert.deepEqual(await page.locator('#qr-list-table [data-rp-sort]').evaluateAll(nodes=>nodes.map(n=>n.dataset.rpSort)),['gsv','sales','netSales','margin','return','received','violations','fine','frozen','offShelf','drop','contact','bad']);
 assert.equal(await page.locator('#qr-list-table .rp-list-risks').count(),0);
 const cardPair=card.locator('.rp-quality-rate-pair').first();
 assert.equal(await cardPair.getAttribute('aria-label'),'进线率/差评率');
 const cells=page.locator('#qr-list-table tbody tr').first().locator('td');
 for(const key of ['contact','bad']){
  const index=await page.locator('#qr-list-table [data-rp-sort="'+key+'"]').evaluate(el=>el.closest('th').cellIndex);
  assert.equal(await cardPair.locator('[data-rp-pair-value="'+key+'"]').innerText(),await cells.nth(index).locator('strong').innerText());
  const comparison=(await cells.nth(index).locator('em').innerText()).replace(/^环比\s*/,'');
  assert.equal(await cardPair.locator('[data-rp-pair-change="'+key+'"]').innerText(),comparison);
 }

 await verifyQualityColors(page,'#qr-list-table .rp-list-value');
 assert.ok(await page.locator('#qr-list-table .rp-comparison-label').evaluateAll(ns=>ns.length>0&&ns.every(n=>getComputedStyle(n).color==='rgb(134, 147, 164)')));
 const options=page.locator('[data-rp-trend]');
 assert.deepEqual(await options.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value)),['gsv','netSales','margin','return','received','violations','contact','bad']);
 for(const metric of ['gsv','netSales','margin','return','received','violations','contact','bad']){
  await options.selectOption(metric);
  const points=page.locator('#qr-list-table tbody tr').first().locator('[data-rp-trend-point]');
  assert.equal(await points.count(),7);
  await points.first().focus();
  assert.equal(await page.locator('#rp-trend-tooltip').isVisible(),true);
  const values=await points.evaluateAll(nodes=>nodes.map(n=>n.dataset.trendValue));
  assert.ok(values.every(v=>metric==='violations'||metric==='netSales'?/^[\d,]+$/.test(v):metric==='gsv'?/^-?[\d.]+w?$/.test(v):/%$/.test(v)));
 }
 await options.selectOption('gsv');
 const headers=await page.locator('#qr-list-table thead th').allTextContents();
 assert.deepEqual(headers.slice(-4,-2),['季品','属性']);
 const menu=page.locator('#dialogbody .pf-attribute');
 for(const [value,label] of [['new','新品'],['old','老品']]){
  if(!(await menu.evaluate(el=>el.open)))await menu.locator('summary').click();
  await menu.locator('[data-pf-attribute-key="productType"][data-pf-attribute-choice="all"]').click();
  await menu.locator('[data-pf-attribute-key="productType"][data-pf-attribute-choice="'+value+'"]').click();
  const rows=page.locator('#qr-list-table tbody tr');assert(await rows.count()>0);
  assert.equal(await rows.locator('.rp-product-tag--'+value).count(),await rows.count());
  assert((await rows.locator('.rp-product-tag--'+value).allTextContents()).every(t=>t.includes(label)));
 }
 await page.locator('[data-rp-reset]').click();
 await page.locator('#qr-list-table').evaluate(el=>el.scrollLeft=el.scrollWidth);
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/quality-drawer-v2.png',import.meta.url))});
 await page.locator('#close').click();
}
