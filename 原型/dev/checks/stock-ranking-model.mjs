import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

export function assertRankingOrder(rows,tuple){
 for(let i=1;i<rows.length;i++){
  const a=tuple(rows[i-1]),b=tuple(rows[i]);let comparison=0;
  for(let j=0;j<a.length&&!comparison;j++)comparison=a[j]-b[j];
  assert(comparison<=0,'榜单排序错误：'+JSON.stringify([rows[i-1].skuCode,rows[i].skuCode,a,b]));
 }
}
export const shortageTuple=r=>[r.shortageType,r.shortageType===1?r.sellableCoverage15:r.totalCoverage15,-r.dailyNet15,-r.goodsValueCents].map(v=>Number.isFinite(v)?v:Infinity);
export const warningTuple=r=>[-r.coverage15,-r.staleValueCents,r.dailyNet15].map(v=>Number.isFinite(v)?v:Infinity);
export const agedTuple=r=>[-r.staleValueCents,-r.staleMaxAgeDays,-r.staleUnits/r.totalUnits].map(v=>Number.isFinite(v)?v:Infinity);

export function verifyStockRankingModel(){
 const ctx=businessRuleContext({window:{},pfIdentity:r=>r,ipSeasonLedger:rows=>rows.filter(r=>r.attribute==='夏季品')});
 for(const file of ['risk-presentation/01-stock-skus.js','risk-presentation/01-shortage.js','risk-presentation/01-stagnant.js','inventory-period/02-stagnant-top-model.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 const short=(sellable,total,patch={})=>({skuCode:'SKU',warehouse:sellable*10,transit:0,factoryAvailable:0,dailyNet15:10,totalUnits:total*10,totalCoverage15:total,goodsValueCents:100,...patch});
 for(const [r,hit] of [[short(15,100),true],[short(15.00001,45),true],[short(16,45.00001),false],[short(0,0),true],[short(16,100),false],[short(10,10,{dailyNet15:0}),false],[short(10,10,{dailyNet15:-1}),false],[short(10,10,{state:'下架'}),false],[short(10,10,{clearance:true}),false],[short(10,10,{salesState:'清仓品'}),false],[short(10,null,{warehouse:null}),false],[short(10,45,{warehouse:null}),true]])assert.equal(ctx.rpShortageEligible(r),hit,JSON.stringify(r));
 assert.equal(ctx.rpShortageType(short(15,45)),1,'双命中归第一类');assert.equal(ctx.rpShortageType(short(16,45)),2);
 assert.equal(ctx.rpShortageTone(short(15,100)),'rp-quality-red');assert.equal(ctx.rpShortageTone(short(16,45)),'rp-quality-yellow');
 assert.equal(ctx.rpShortageType(short(10,40,{transit:60})),2,'在途库存必须参与可售天数');
 for(const [a,b] of [[short(15,100),short(16,20)],[short(1,100),short(2,20)],[short(20,30),short(16,40)],[short(10,30,{dailyNet15:20,warehouse:200}),short(10,30)],[short(10,30,{goodsValueCents:101}),short(10,20)],[short(20,40,{dailyNet15:20,warehouse:400}),short(16,40)]])assert(ctx.rpShortageCompare(a,b)<0,'缺货逐级排序不插入另一种天数');
 const ranked=ctx.rpShortageRankSeasons([short(16,30,{skuCode:'a',attribute:'夏季品'}),short(1,100,{skuCode:'b',attribute:'冬季品'})]);assert.deepEqual(Array.from(ranked,r=>r.skuCode),['b','a'],'风险类型优先于季品');
 const warning=(days,patch={})=>({skuCode:'SKU',warehouse:days*10,dailyNet15:10,coverage15:days,staleValueCents:100,...patch});
 for(const [r,hit] of [[warning(59.9999),false],[warning(60),true],[warning(10000),true],[warning(60,{warehouse:0}),false],[warning(60,{dailyNet15:0}),false],[warning(60,{coverage15:null}),false],[warning(60,{clearance:true,state:'下架'}),true]])assert.equal(ctx.rpStagnantEligible(r),hit);
 assert(ctx.rpStagnantCompare(warning(61,{staleValueCents:0}),warning(60,{staleValueCents:999999}))<0);
 assert(ctx.rpStagnantCompare(warning(60,{staleValueCents:101}),warning(60))<0);
 assert(ctx.rpStagnantCompare(warning(60,{dailyNet15:9}),warning(60))<0);
 const aged=(patch={})=>({skuCode:'SKU',staleUnits:10,staleMaxAgeDays:60,staleValueCents:100,totalUnits:100,attribute:'夏季品',warehouse:0,dailyNet15:0,coverage15:null,...patch});
 assert(ctx.ipStagnantEligible(aged()),'零销量、无我司库存仍可存在已发生呆滞');
 assert(ctx.ipStagnantEligible(aged({coverage15:1,dailyNet15:10,warehouse:10})),'短可售天数不排除老库存');
 const common={warehouse:600,dailyNet15:10,coverage15:60};
 assert(ctx.ipStagnantEligible(aged(common)),'含60天库龄边界');
 for(const patch of [{staleMaxAgeDays:59.9999},{staleMaxAgeDays:null},{staleMaxAgeDays:undefined},{staleUnits:0},{staleUnits:null},{staleUnits:-1}])assert(!ctx.ipStagnantEligible(aged({...common,...patch})),'无有效老库存不能入榜');
 assert(!ctx.ipStagnantEligible(aged({...common,coverage15:1000,staleMaxAgeDays:59})),'高可售天数不能替代库龄');
 assert(ctx.ipStagnantEligible(aged({...common,coverage15:0,clearance:true,state:'下架'})),'已发生呆滞不额外排除清仓下架');
 const warningBefore=ctx.rpStagnantEligible(warning(60));
 ctx.brcSaved={conditions:{...vm.runInContext('brcConditions()',ctx),'stock.slowDays':{op:'gte',a:3000,metric:'value'}}};
 assert(ctx.ipStagnantEligible(aged(common)),'可售天数规则不影响Top10');
 assert.equal(ctx.rpStagnantEligible(warning(60)),warningBefore,'Top10与呆滞预警规则各自独立');
 assert(ctx.ipStagnantCompare(aged({staleValueCents:101}),aged({staleMaxAgeDays:999}))<0);
 assert(ctx.ipStagnantCompare(aged({staleMaxAgeDays:61}),aged())<0);
 assert(ctx.ipStagnantCompare(aged({staleUnits:11}),aged())<0,'同金额同库龄按数量占比');
 const fixture=Array.from({length:24},(_,i)=>aged({...common,skuId:String(i),skuCode:String(i),staleValueCents:i,attribute:i<12?'夏季品':'冬季品'})),top=ctx.ipStagnantTopModel(fixture);
 assert.equal(top.count,12);assert.equal(top.rows.length,10);assert.equal(top.rows[0].staleValueCents,11);
 Object.assign(ctx,{boundedCache:()=>new Map(),rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),stockQuantity:n=>Number.isFinite(n)?n+'件':'—',rpQualityMoney:String,fmt:(n,d=0)=>n.toFixed(d),upPercent:n=>n+'%',rpQualityProductFields:()=>[]});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-stock.js',import.meta.url),'utf8'),ctx);
 assert.equal(ctx.rpStagnantSkuFields(aged()).find(f=>f.key==='coverage15').value,'—','已发生老库存无净销量时不伪造0天');
 // 旧库存阈值不覆盖新语义参数，其他业务配置仍保留。
 const rules=businessRuleContext(),values=vm.runInContext('({...brcDefaults})',rules);values['finance.deduction']=7;
 for(const key of ['stock.shortage.sellableDays','stock.shortage.totalDays','stock.warning.coverageDays','stock.top.minAgeDays'])delete values[key];
 Object.assign(values,{'stock.shortage.maxDays':30,'stock.warning.minDays':45,'stock.warning.maxDays':60,'stock.top.redDays':90});
 const saved={version:3,revision:4,gradeRuleRevision:1,returnRuleRevision:1,values};rules.localStorage={getItem:()=>JSON.stringify(saved)};
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/01-store.js',import.meta.url),'utf8'),rules);
 const migrated=rules.brcRead();assert(migrated);assert.equal(migrated.values['stock.shortage.totalDays'],45);assert.equal(migrated.values['stock.warning.coverageDays'],60);assert.equal(migrated.values['stock.top.minAgeDays'],60);assert.equal(migrated.values['finance.deduction'],7);
 console.log('通过：缺货及预警边界、Top10独立库龄条件、金额/库龄/占比排序、季品及旧配置兼容');
}
