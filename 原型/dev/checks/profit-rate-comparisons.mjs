import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

function profitModel(){
 const source=file=>fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8');
 const ctx=businessRuleContext({boundedCache:()=>new Map(),window:{},filterCatalog:{platforms:[],dashboardBrands:[]},
  fmt:(n,d=0)=>Number(n).toFixed(d),upPercent:n=>Number.isFinite(n)?n.toFixed(1)+'%':'—',upMoney:String,pfMoneyYuan:n=>n+'元',esc:String,
  upIdentity:p=>p,upProduct:p=>p,pfIdentity:p=>p,qrObservation:()=>({monthly:{events:[]}}),rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),sampleSpus:[],salesChannelRows:()=>[],upGrid:items=>items.join(''),numberSignalMain:f=>f.value,rpTargetText:f=>f.target,
  upSalesTrend:()=>'',upChannelContributionNote:()=>'',upChannelTable:()=>'',upChannelContributionView:()=>'',upGradeTrendView:()=>''});
 for(const file of ['quality-monthly/00-contact.js','risk-presentation/01-quality.js','risk-presentation/01-loss.js','sales-review/01-model.js','unified-product/05-operating-view.js'])vm.runInContext(source(file),ctx);
 const nsp=source('new-products/01-model.js');vm.runInContext(nsp.slice(nsp.indexOf('function nspComparison('),nsp.indexOf('function nspMetrics(')),ctx);
 ctx.upReturnTargets=()=>({returnTarget:null,receivedTarget:null});ctx.msInlineDeviation=()=>'';
 return ctx;
}

// 使用页面实际模型：负数、跨零、零基数与灰色边界不能按相对增幅计算。
export async function profitRateComparisons(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const ctx=profitModel(),pairs=[[-8,-10],[-10,-8],[2,0],[0,2],[2,-2],[0,0],[null,2],[10,0],[10.1,0]];
 const result=pairs.map(([now,before])=>({normal:ctx.rpProfitRateComparison(now,before),net:ctx.rpNetMarginComparison(now,before),newProduct:ctx.nspComparison(now,before,{margin:true,signed:true}),
  detail:ctx.upOperatingMetrics({current:{profitRate:now},previous:{profitRate:before}},{}).find(f=>f.key==='margin')}));
 const text=['环比 +2.0%','环比 -2.0%','环比 +2.0%','环比 -2.0%','环比 +4.0%','环比 持平','环比 —','环比 +10.0%','环比 +10.1%'];
 for(const [i,row] of result.entries()){
  for(const key of ['normal','net','newProduct','detail'])assert.equal(row[key].target,text[i],key+' 第'+i+'组');
  for(const key of ['normal','newProduct','detail'])assert.equal(row[key].targetTone,'rp-quality-'+(['green','red','green','red','green','gray','gray','green','green'][i]));
  assert.equal(row.net.targetTone,'rp-quality-'+(['green','red','green','red','green','gray','gray','green','green'][i]));
 }
 const quality=ctx.rpQualityFields({platform:'拼多多',monthly:{events:[]}},[{key:'margin'}],{profitRate:-8,sales:10,returned:0},{profitRate:-10,sales:10,returned:0,start:'2026-09-01',end:'2026-09-30'}).find(f=>f.key==='margin');
 assert.equal(quality.target,'环比 +2.0%','品质榜负利润率使用差值，不显示无可比数据');
 // 真正的新品/关键产品行使用两期差值，不只测试格式化函数。
 for(const [hash,selector] of [['new','#newtable'],['matrix','#matrixtable']]){
  const url=new URL(page.url());url.hash=hash;await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await page.locator(selector+' tbody tr').first().waitFor();
  const facts=await page.evaluate(hash=>{
   const snapshot=hash==='new'?dashboardNewProductsSnapshot():dashboardKeyProductsSnapshot();
   return snapshot.visible.map(p=>({now:(p.current||p.facts).profitRate,before:p.previous.profitRate}));
  },hash);
  const index=hash==='new'?await page.locator('#newtable th').evaluateAll(ns=>ns.findIndex(n=>n.textContent.includes('利润率'))):null;
  const labels=hash==='new'?await page.locator('#newtable tbody tr td:nth-child('+(index+1)+') em').allTextContents():await page.locator('#matrixtable [data-kpm-metric="profit"] em').allTextContents();
  assert(labels.length>0);
  const expected=facts.map(p=>ctx.rpProfitRateComparison(p.now,p.before).target);
  assert.deepEqual(labels.map(s=>s.replace(/\s+/g,'')),expected.slice(0,labels.length).map(s=>s.replace(/\s+/g,'')));
 }
 // 在真实详情布局中验证绿/黄/红及缺目标灰色，不修改全局样例数据。
 const cases=[65,55,40,null].map(rate=>{
  const attainment={prefix:'10月',progress:60,targets:{targetCents:100000,targetProfitCents:rate===null?0:10000},actual:{profitCents:rate===null?null:10000*rate/100}};
  return {rate,tone:ctx.msTone(rate===null?null:rate-60),html:ctx.upOperatingView({product:{cohort:'new'},current:{},previous:{},platformRows:[],attainment},{platform:'all'})};
 });
 const colors=await page.evaluate(cases=>{
  const root=document.querySelector('#dialogbody');
  return cases.map(({rate,tone,html})=>{
   const template=document.createElement('template');template.innerHTML=html;
   const block=template.content.querySelector('.up-attainment');root.append(block);
   const bar=block.querySelector('.up-attainment-progress i');
   const probe=document.createElement('i');probe.style.color='var(--'+tone+')';root.append(probe);
   const result={rate,actual:getComputedStyle(bar).backgroundColor,expected:getComputedStyle(probe).color,width:bar.style.width};
   block.remove();probe.remove();return result;
  });
 },cases);
 for(const row of colors){assert.equal(row.actual,row.expected,'详情规模偏差 '+row.rate);assert.equal(row.width,(row.rate??0)+'%')}
 console.log('通过：利润率/净利润率两期差值、负数/跨零/零基数、新品/关键产品实际行、详情规模进度条红黄绿及缺目标灰色。');
}
