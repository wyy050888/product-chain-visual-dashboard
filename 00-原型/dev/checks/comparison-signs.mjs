import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';
import {violationComparisonModel} from './violation-comparison-model.mjs';

function comparisonModels(){
 const ctx=businessRuleContext({boundedCache:()=>new Map(),filterCatalog:{platforms:[]},fmt:(v,d=0)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}),upMoney:String,upPercent:v=>Number.isFinite(v)?v.toFixed(1)+'%':'—'});
 const source=file=>fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8');
 for(const file of ['risk-presentation/01-quality.js','risk-presentation/01-loss.js','unified-product/05-operating-view.js'])vm.runInContext(source(file),ctx);
 for(const [raw,text] of [[2,'↑ 2.0%'],[-2,'↓ 2.0%'],[0,'持平'],[-.01,'持平'],[null,'—'],[NaN,'—']])assert.equal(ctx.periodRateGrowthText(raw),text);
 for(const [now,before,text,tone] of [[1,0,'环比 +1次','red'],[0,1,'环比 -1次','green'],[3,3,'环比 持平','gray'],[101,100,'环比 +1次','red'],[99,100,'环比 -1次','green'],[null,1,'环比 —','gray'],[1,null,'环比 —','gray']]){
  const result=ctx.rpCountComparison(now,before);assert.equal(result.target,text);assert.equal(result.targetTone,'rp-quality-'+tone);
 }
 assert.equal(ctx.rpCountComparison(2,1,'个').target,'环比 +1个');
 assert.match(ctx.rpLossAmountComparison(-60,-100).target,/↓/,'亏损金额保留箭头');
 ctx.upReturnTargets=()=>({returnTarget:null,receivedTarget:null});
 const previous={gsvCents:100,sales:100,returned:0,expenseCents:50,feeRate:10,profitRate:10};
 const current={...previous,gsvCents:200,sales:200,expenseCents:100,feeRate:20,profitRate:12};
 const fields=Object.fromEntries(Array.from(ctx.upOperatingMetrics({current,previous},{}),f=>[f.key,f]));
 assert.equal(fields.margin.target,'环比 ↑ 20.0%');assert.equal(fields.feeRate.target,'环比 ↑ 100.0%');
 for(const key of ['gsv','sales','netSales','expense'])assert.match(fields[key].target,/↑/,'金额/销量保留箭头');
 assert.equal(ctx.rpNetMarginComparison(-12,-10).target,'环比 ↓ 20.0%');
 const nsp=source('new-products/01-model.js');vm.runInContext(nsp.slice(nsp.indexOf('function nspComparison('),nsp.indexOf('function nspMetrics(')),ctx);
 assert.equal(ctx.nspComparison(12,10,{margin:true}).target,'环比 ↑ 20.0%');
 assert.match(ctx.nspComparison(12,10).target,/↑/);
 violationComparisonModel();
}

const compact=text=>text.replace(/\s+/g,'');
const arrowRate=text=>assert.match(compact(text),/^环比(?:[↑↓][\d,.]+%|持平|—)$/);
async function verifyRates(locator){const texts=await locator.allTextContents();assert(texts.length>0,'应存在率类环比');for(const text of texts)arrowRate(text)}
async function verifyCounts(locator){const texts=(await locator.allTextContents()).map(compact).filter(t=>t.startsWith('环比'));assert(texts.length>0,'应存在次数差');for(const text of texts)assert.match(text,/^环比(?:[+-][\d,]+次|持平|—)$/)}

export async function comparisonSigns(page){
 comparisonModels();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await verifyRates(page.locator('.rp-loss-card [data-rp-field="margin"] small'));
 await verifyCounts(page.locator('.rp-quality-entry [data-rp-field="offShelf"] small'));
 await page.locator('.rp-loss-card [data-risk="2"]').click();
 const table=page.locator('.rp-loss-table');await table.waitFor();
 const index=await table.locator('[data-rp-sort="margin"]').evaluate(n=>n.closest('th').cellIndex);
 await verifyRates(table.locator('tbody tr td:nth-child('+(index+1)+') em'));
 await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
 await page.locator('[data-drawer-tab="operating"]').click();
 const metrics=await page.locator('.up-operating-kpis .up-metric').evaluateAll(nodes=>nodes.map(n=>({name:n.querySelector('small')?.textContent.trim(),target:n.querySelector('.up-operating-comparison')?.textContent||''})));
 for(const name of ['费率','利润率']){const field=metrics.find(f=>f.name===name);assert(field,'产品详情 '+name);arrowRate(field.target)}
 await page.locator('#close').click();await page.locator('#close').click();
 const url=new URL(page.url());url.hash='new';await page.goto(url.href,{waitUntil:'domcontentloaded'});
 await page.locator('#newtable tbody tr').first().waitFor();
 const marginIndex=await page.locator('#newtable th').evaluateAll(nodes=>nodes.findIndex(n=>n.textContent.includes('利润率')));assert(marginIndex>=0);
 await verifyRates(page.locator('#newtable tbody tr td:nth-child('+(marginIndex+1)+') em'));
 url.hash='matrix';await page.goto(url.href,{waitUntil:'domcontentloaded'});
 await page.locator('#matrixtable [data-kpm-metric="profit"]').first().waitFor();
 for(const key of ['profit','unreceived'])await verifyRates(page.locator('#matrixtable [data-kpm-metric="'+key+'"] em'));
 console.log('通过：率类涨跌箭头、次数差/个数差、零基数及缺失、普通金额销量箭头，卡片/榜单/产品详情/新品/关键产品一致');
}
