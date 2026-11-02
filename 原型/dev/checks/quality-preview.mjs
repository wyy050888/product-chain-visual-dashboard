import {violationComparisonModel} from './violation-comparison-model.mjs';
import {businessRuleContext} from './business-rules-context.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
function qualityModel(){
 const earlier=[{type:'下架',reasonType:'quality'}],ctx=businessRuleContext({
  rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),
  fmt:(n,d)=>d===undefined?String(n):Number(n).toFixed(d),rpCount:n=>n+'件',pfMoneyYuan:n=>n+'元',upPercent:n=>n.toFixed(1)+'%',
  pfIdentity:r=>r,qrObservation:()=>({monthly:{events:earlier}}),upProduct:p=>p,upIdentity:r=>r,
 });
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/quality-monthly/00-contact.js',import.meta.url),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-quality.js',import.meta.url),'utf8'),ctx);
 const events=[{type:'罚款',amount:7000},{type:'资金冻结',amount:3000},{type:'下架',amount:0},{type:'掉权',amount:0}].map(e=>({...e,reasonType:'quality'}));
 const record={platform:'拼多多',monthly:{events,fine:7000,frozen:3000}};
 const current={sales:100,returned:20,gsvCents:80000,profitRate:20,contactRate:10,badRate:3,returnRate:10.5,receivedRate:8.2};
 const previous={sales:100,returned:10,gsvCents:100000,profitRate:10,contactRate:20,badRate:2,start:'2026-09-01',end:'2026-09-10'};
 const rows=ctx.rpQualityFields(record,[...['gsv','margin','contact','bad','return','received','fine','frozen'].map(key=>({key})),{key:'returnTarget',sortValue:10},{key:'receivedTarget',sortValue:8}],current,previous);
 const fields=Object.fromEntries(Array.from(rows,f=>[f.key,f]));
 assert.equal(fields.netSales.sortValue,80);
 assert.equal(fields.contact.target,'环比 -10.0%');assert.equal(fields.bad.target,'环比 +1.0%');
 for(const [now,before,expected] of [[4,3,'环比 +1.0%'],[3,4,'环比 -1.0%'],[4,0,'环比 +4.0%'],[0,4,'环比 -4.0%'],[0,0,'环比 持平'],[4,null,'环比 —'],[null,4,'环比 —']])assert.equal(ctx.rpRateDeltaComparison(now,before).target,expected);
 for(const [now,before,tone] of [[4,3,'red'],[3,4,'green'],[4,4,'gray'],[.1,0,'red'],[0,.1,'green'],[4.049,4,'gray'],[3.951,4,'gray'],[4.051,4,'red'],[3.949,4,'green'],[4,null,'gray'],[null,4,'gray']])assert.equal(ctx.rpRateDeltaComparison(now,before).targetTone,'rp-quality-'+tone,'进线/差评按显示的%差判色');
 assert.match(fields.bad.hint,/本期差评率－上期差评率/);assert.doesNotMatch(fields.bad.hint,/÷上期/);
 for(const [current,previous,hit] of [[30,10,false],[30.1,10,true],[20,0,false],[20.1,0,true],[10.1,.1,false],[20.1,.1,false],[5,10,false],[null,0,false],[30,null,false]])assert.equal(ctx.qrbContactDecision(current,previous).hit,hit);
 for(const count of [0,1,11,100])for(let seed=0;seed<5;seed++){const split=ctx.qrbContactSplit(count,seed);assert.equal(split.qualityContacts+split.experienceContacts,count);assert(Number.isInteger(split.qualityContacts)&&Number.isInteger(split.experienceContacts))}
 assert.equal(ctx.qrbContactDecision(30,10).growth,20);

 const productFields=ctx.rpQualityProductFields({attribute:'冬季品',isNew:true,clearance:true});
 assert.equal(productFields[0].value,'冬季品');
 assert.equal(productFields[1].value,'新品、清仓品');
 assert.equal(ctx.rpQualityProductFields({isNew:false})[1].value,'老品');
 assert.equal(ctx.rpQualityProductFields({})[1].value,'—');
 assert.equal(fields.gsv.target,'环比 ↓ 20.0%');
 assert.equal(fields.margin.target,'环比 +10.0%');
 assert.equal(fields.violations.targetTone,'rp-quality-red');assert.equal(fields.down.targetTone,'rp-quality-red');
 assert.equal(fields.violations.sortValue,4);assert.equal(fields.violations.target,'环比 +3次');
 assert.equal(fields.sanctions.sortValue,10000);assert.equal(fields.sanctions.target,'2次');
 assert.equal(fields.down.value,'2次');assert.equal(fields.down.sortValue,2);assert.equal(fields.down.target,'环比 +1次');
 assert.equal(fields.offShelf.value,'1次');assert.equal(fields.offShelf.target,'环比 持平');
 assert.equal(fields.drop.value,'1次');assert.equal(fields.drop.target,'环比 +1次');
 assert.equal(fields.fine.target,'1次');assert.equal(fields.frozen.target,'1次');
 const expected={抖音:['资金冻结','下架'],快手:['罚款','下架'],视频号:['资金冻结','下架'],天猫:['罚款','下架'],京东:['罚款','下架'],拼多多:['罚款','资金冻结','下架','掉权'],all:['罚款','资金冻结','下架','掉权']};
 for(const [platform,types] of Object.entries(expected)){
  assert.deepEqual(Array.from(ctx.rpPlatformViolationEvents(events,platform,platform),e=>e.type),types);
 }
 assert.equal(ctx.rpViolationMetricAllowed('fine',['抖音','快手']),true);
 assert.equal(ctx.rpViolationMetricAllowed('drop',['抖音','快手']),false);
 const scoped=Object.fromEntries(Array.from(ctx.rpQualityFields({...record,platform:'抖音'},[{key:'fine'},{key:'frozen'}],current,previous,true,'all'),f=>[f.key,f]));
 assert.equal(scoped.violations.sortValue,2);assert.equal(scoped.sanctions.sortValue,3000);assert.equal(scoped.sanctions.target,'1次');
 assert.equal(scoped.fine.value,'--');assert.equal(scoped.fine.sortValue,null);assert.equal(scoped.fine.target,'');assert.equal(scoped.drop.value,'--');
 const empty=Object.fromEntries(Array.from(ctx.rpQualityFields({...record,monthly:{events:[]}},[{key:'fine'}],current,previous,true,'all'),f=>[f.key,f]));assert.equal(empty.fine.sortValue,0);assert.notEqual(empty.fine.value,'--');

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
 for(const [change,tone] of [[-10.01,'red'],[-10,'gray'],[-5,'gray'],[5,'gray'],[10,'gray'],[10.01,'green'],[null,'gray'],[NaN,'gray']])assert.equal(ctx.rpComparisonTone(change),'rp-quality-'+tone,'涨跌均按原始幅度判灰色边界');
 assert.match(ctx.rpComparisonRuleText(),/涨绿降红/);
 assert.match(ctx.rpComparisonRuleText(),/10/);
 assert.equal(ctx.rpComparisonText(0.051),'环比 ↑ 0.1%');
 assert.equal(ctx.rpComparisonText(-0.051),'环比 ↓ 0.1%');
 // 使用原值判断阈值，覆盖正负边界、缺失和各自目标。
 for(const [now,before,tone] of [[100.1,100,'gray'],[105,100,'gray'],[110,100,'gray'],[100,100,'gray'],[95,100,'gray'],[90,100,'gray'],[110.01,100,'green'],[89.99,100,'red'],[0,0,'gray'],[null,10,'gray'],[10,null,'gray']])
  assert.equal(ctx.rpQualityChangeTone(now,before),'rp-quality-'+tone);
 for(const [actual,target,kind,tone] of [[9,10,'return','normal'],[10,10,'return','normal'],[10.9999,10,'return','normal'],[11,10,'return','yellow'],[12,10,'return','yellow'],[12.0001,10,'return','red'],[8.2999,8,'received','normal'],[8.3,8,'received','yellow'],[8.5,8,'received','yellow'],[8.5001,8,'received','red'],[8.49,8,'received','yellow'],[0,0,'return','normal'],[1,0,'return','yellow'],[3,0,'return','red'],[null,8,'return','gray'],[8,null,'received','normal']]){
  const rule=ctx.rpQualityReturnRule(actual,target,kind);
  assert.equal(rule.tone,'rp-quality-'+tone);assert.equal(rule.targetTone,!Number.isFinite(target)?'rp-quality-gray':tone==='normal'?'rp-quality-green':rule.tone);
 }
 assert.equal(ctx.rpQualityReturnRule(10.5,10).tone,'rp-quality-normal');
 assert.equal(ctx.rpQualityReturnRule(10,10).targetTone,'rp-quality-green');
 assert.equal(fields.return.tone,'rp-quality-normal');
 assert.equal(fields.received.tone,'rp-quality-normal');
 assert.equal(fields.gsv.targetTone,'rp-quality-red');
 assert.equal(fields.margin.targetTone,'rp-quality-green');
 assert.equal(fields.contact.targetTone,'rp-quality-green');
 assert.equal(fields.bad.targetTone,'rp-quality-red');
 assert.equal(fields.violations.targetTone,'rp-quality-red');

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
 assert.equal(quality.violations.target,'环比 +3次');assert.equal(all.violations.target,'环比 +7次');
 assert.equal(quality.down.sortValue,2);assert.equal(all.down.sortValue,4);
 assert.equal(quality.offShelf.sortValue,1);assert.equal(all.offShelf.sortValue,2);
 assert.equal(quality.drop.sortValue,1);assert.equal(all.drop.sortValue,2);
 assert.equal(record.monthly.events.length,4,'口径切换不能改写原始事件');


}
// 新增趋势按当天原始分子/分母计算，零基数保留暂无数据。
function qualityTrendModel(){
 const daily=[{date:'2026-10-09',sales:200,contacts:30,qualityContacts:20,experienceContacts:10,reviews:40,bad:3,returned:10,received:5,gsvCents:10000,profitCents:1000},
  {date:'2026-10-10',sales:0,contacts:0,qualityContacts:0,experienceContacts:0,reviews:0,bad:0,returned:0,received:0,gsvCents:0,profitCents:0}];
 const ctx=businessRuleContext({riskRange:()=>({end:'2026-10-10'}),shiftDate:()=> '2026-10-04',upIdentity:r=>r,
  upSummary:()=>({points:daily}),rpQualityEvents:()=>[],rpPlatformViolationEvents:rows=>rows,qrState:{listPlatform:'all'}});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/03-trends.js',import.meta.url),'utf8'),ctx);
 const points=ctx.rpTrendPoints(0,{spuId:'test',platform:'抖音'});
 assert.equal(points[0].contact,15);assert.equal(points[0].qualityContact,10);assert.equal(points[0].experienceContact,5);assert.equal(points[0].bad,7.5);
 assert.equal(points[1].contact,null);assert.equal(points[1].bad,null);
 ctx.rpQualityEvents=(_record,_start,_end,qualityOnly)=>qualityOnly?[{date:'2026-10-09'}]:[{date:'2026-10-09'},{date:'2026-10-09'}];
 assert.equal(ctx.rpTrendPoints(0,{spuId:'test',platform:'抖音'},true)[0].violations,1);
 assert.equal(ctx.rpTrendPoints(0,{spuId:'test',platform:'抖音'},false)[0].violations,2);

}
async function verifyQualityColors(page,selector){
 const colors={red:'rgb(195, 61, 86)',green:'rgb(0, 164, 134)',yellow:'rgb(251, 189, 35)',gray:'rgb(134, 147, 164)'};
 Object.assign(colors,await page.evaluate(()=>{const css=getComputedStyle(document.documentElement),sample=document.createElement('span'),result={};for(const [tone,token] of [['red','--red'],['green','--green'],['yellow','--orange']]){sample.style.color=css.getPropertyValue(token).trim();result[tone]=sample.style.color;}return result;}));
 const primary=await page.evaluate(()=>{const sample=document.createElement('span');sample.style.color=getComputedStyle(document.documentElement).getPropertyValue('--color-primary-data').trim();return sample.style.color});
 const rendered=await page.locator(selector).evaluateAll(nodes=>nodes.flatMap(n=>[...n.querySelectorAll('strong,small,em')].map(el=>({tone:[...el.classList].find(c=>/^rp-quality-(red|green|yellow|gray|normal)$/.test(c)),tag:el.tagName,color:getComputedStyle(el).color}))));
 assert.ok(rendered.some(item=>item.tone));
 for(const item of rendered)if(item.tone)assert.equal(item.color,item.tone==='rp-quality-normal'?(item.tag==='STRONG'?primary:colors.gray):colors[item.tone.replace('rp-quality-','')]);
}

// 使用实际经营卡片模型验证消耗与费率方向，箭头和数值不随颜色反转。
function operatingComparisonModel(){
 const ctx=businessRuleContext({boundedCache:()=>new Map(),filterCatalog:{platforms:[]},fmt:String,upMoney:String,upPercent:v=>Number.isFinite(v)?v.toFixed(1)+'%':'—'});
 for(const file of ['risk-presentation/01-quality.js','risk-presentation/01-loss.js','unified-product/05-operating-view.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 ctx.upReturnTargets=()=>({returnTarget:null,receivedTarget:null});
 for(const [percent,expenseTone,feeTone] of [[-11,'red','green'],[-10,'gray','gray'],[-5,'gray','gray'],[0,'gray','gray'],[5,'gray','gray'],[10,'gray','gray'],[11,'green','red']]){
  const previous={gsvCents:100,sales:100,returned:10,expenseCents:100,feeRate:10,profitRate:10};
  const current={...previous,expenseCents:100+percent,feeRate:10*(1+percent/100)};
  const fields=Object.fromEntries(Array.from(ctx.upOperatingMetrics({current,previous},{}),f=>[f.key,f]));
  assert.equal(fields.expense.targetTone,'rp-quality-'+expenseTone,'消耗 '+percent+'%');
  assert.equal(fields.feeRate.targetTone,'rp-quality-'+feeTone,'费率 '+percent+'%');
  if(percent){assert.match(fields.expense.target,percent>0?/↑/:/↓/);assert.match(fields.feeRate.target,percent>0?/\+/:/-/);assert.doesNotMatch(fields.feeRate.target,/↑|↓/)}
 }
 for(const feeRate of [null,0]){
  const fields=ctx.upOperatingMetrics({current:{feeRate:12},previous:{feeRate}},{});
  assert.equal(fields.find(f=>f.key==='feeRate').targetTone,'rp-quality-gray','费率无有效对照');
 }
}

export async function qualityPreview(page){
 qualityModel();qualityTrendModel();operatingComparisonModel();violationComparisonModel();
 await page.locator('#riskrail [data-rp-platform-menu="0"] [data-rp-platform-option="all"]').click();
 await page.locator('#riskrail [data-rp-platform-menu="0"] [data-rp-platform-option="抖音"]').click();
 await page.setViewportSize({width:1920,height:1080});
 const card=page.locator('#riskrail .riskcard').first();
 assert.equal(await card.locator('.rp-quality-entry').count(),6);
 assert.equal(await card.locator('[data-quality-rates]').count(),0,'卡片不显示进线率计算口径问号');
 assert.equal(await card.locator('.rp-quality-rate-pair,[data-rp-field="contact"],[data-rp-field="bad"]').count(),0,'卡片移除进线率和差评率');
 assert.deepEqual(await card.locator('.rp-platform-card-head').first().locator('.rp-platform-metric-label').allTextContents(),['平台罚款','资金冻结','链接下架','GSV']);assert.equal(await card.locator('[data-rp-field=gsv]').count(),6);assert.match(await page.locator('#riskrail .rp-shop-card .rhead h3').innerText(),/^店铺风险榜/);
 assert.deepEqual(await card.locator('.rp-quality-entry').first().locator('[data-rp-platform-row]').first().locator('[data-rp-field]').evaluateAll(nodes=>nodes.map(n=>n.dataset.rpField)),['fine','frozen','offShelf','gsv']);
 for(const width of [1440,390,1920]){
  await page.setViewportSize({width,height:1080});
  const overflow=await card.evaluate(c=>[...c.querySelectorAll('.rp-quality-metric')].filter(el=>el.scrollWidth>el.clientWidth+1).length);
  assert.equal(overflow,0,'卡片指标溢出，宽度'+width);
 }
 await verifyQualityColors(page,'.rp-quality-metric');
 assert.ok(await page.locator('#riskrail .rp-quality-metric .rp-comparison-label').evaluateAll(ns=>ns.length>0&&ns.every(n=>getComputedStyle(n).color==='rgb(134, 147, 164)')));
 await card.screenshot({path:fileURLToPath(new URL('../../outputs/quality-card-v2.png',import.meta.url))});
 await page.locator('#riskrail [data-risk="0"]').click();
 assert.equal(await page.locator('#qr-list-table [data-quality-rates]').count(),0,'移除指标对应的表头问号');
 assert.deepEqual(await page.locator('#qr-list-table [data-rp-sort]').evaluateAll(nodes=>nodes.map(n=>n.dataset.rpSort)),['gsv','netSales','margin','return','received','violations','frozen','offShelf']);
 assert.equal(await page.locator('#qr-list-table .rp-list-risks').count(),0);
 const cells=page.locator('#qr-list-table tbody tr').first().locator('td');
 const offShelfIndex=await page.locator('#qr-list-table [data-rp-sort=offShelf]').evaluate(e=>e.closest('th').cellIndex),offShelf=card.locator('.rp-quality-entry [data-rp-field=offShelf]').first();assert.equal(await offShelf.locator('strong').innerText(),await cells.nth(offShelfIndex).locator('strong').innerText());assert.equal((await offShelf.locator('small').innerText()).replace(/\s+/g,' '),(await cells.nth(offShelfIndex).locator('em').innerText()).replace(/\s+/g,' '));
 for(const key of ['frozen']){
  const index=await page.locator('#qr-list-table [data-rp-sort='+key+']').evaluate(e=>e.closest('th').cellIndex),outer=card.locator('.rp-quality-entry [data-rp-field='+key+']').first();
  assert.equal(await outer.locator('strong').innerText(),await cells.nth(index).locator('strong').innerText(),'外侧与完整榜单主值一致 '+key);
  assert.equal((await outer.locator('small').innerText()).replace(/\s+/g,' ').trim(),(await cells.nth(index).locator('em').innerText()).replace(/\s+/g,' ').trim(),'外侧与完整榜单次数/环比一致 '+key);
 }
 const gsvIndex=await page.locator('#qr-list-table [data-rp-sort=gsv]').evaluate(e=>e.closest('th').cellIndex),gsv=card.locator('.rp-quality-entry [data-rp-field=gsv]').first();
 assert.equal(await gsv.locator('strong').innerText(),await cells.nth(gsvIndex).locator('strong').innerText(),'外侧与抽屉GSV数值一致');assert.equal((await gsv.locator('small').innerText()).replace(/\s+/g,' '),(await cells.nth(gsvIndex).locator('em').innerText()).replace(/\s+/g,' '),'外侧与抽屉GSV环比一致');

 await verifyQualityColors(page,'#qr-list-table .rp-list-value');
 assert.ok(await page.locator('#qr-list-table .rp-comparison-label').evaluateAll(ns=>ns.length>0&&ns.every(n=>getComputedStyle(n).color==='rgb(134, 147, 164)')));
 assert.equal(await page.locator('#qr-list-table [data-rp-trend],#qr-list-table .rp-mini-trend').count(),0);
 const headers=await page.locator('#qr-list-table thead th').allTextContents();
 assert(!headers.some(text=>['类目','季品'].includes(text.trim())));assert(headers.includes('属性'));
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
