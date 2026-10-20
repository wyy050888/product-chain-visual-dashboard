import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../../'+name,import.meta.url),'utf8');
export function verifyLifecycleFacts(){
 const ctx=vm.createContext({window:{},chains:['清洁链','厨房链','环境链','个护 & 健康链'],ltDashboardActive:()=>false,lifeNames:Array.from({length:8},(_,i)=>"业务计划"+i),
  names:Array.from({length:4},(_,chain)=>Array.from({length:6},(_,i)=>'测试产品'+chain+'-'+i)),sampleSpuByName:name=>({name}),sampleSpuFields:row=>row});
 vm.runInContext(read('src/data/filter-catalog.js')+'\nconst channels=filterCatalog.platforms;',ctx);
 const period=read('src/modules/period/01.js');vm.runInContext(period.slice(0,period.indexOf('const shiftedDates=')),ctx);
 vm.runInContext(read('src/modules/sales-target/01.js').split('\n').filter(line=>line.startsWith('function targetSum(')||line.startsWith('function splitTarget(')).join('\n'),ctx);
 vm.runInContext(read('src/data/lifecycle-facts.js')+'\n'+read('src/modules/lifecycle-task/00-facts.js'),ctx);
 const model=read('src/modules/lifecycle-task/01.js');vm.runInContext(model.slice(0,model.indexOf('// 年度累计')),ctx);
 const products=read('src/modules/lifecycle-products/01.js');vm.runInContext(products.slice(0,products.indexOf('// Outstanding')),ctx);
 const periods=[{year:2025,mode:'year',value:1},{year:2026,mode:'month',value:10},{year:2026,mode:'quarter',value:4},{year:2026,mode:'year',value:1},{year:2027,mode:'year',value:1}];
 for(const p of periods)for(let stage=0;stage<8;stage++){
  const chains=ctx.lifeBaseChainRows(stage,p),platforms=ctx.lifeChannelRows(stage,p);
  assert.equal(platforms.length,6);assert(platforms.every(row=>Object.values(row).every(value=>typeof value==='string'||Number.isFinite(value))));
  for(const key of ['target','actual','yearTarget','yearActual'])assert.equal(platforms.reduce((n,row)=>n+row[key],0),chains.reduce((n,row)=>n+row[key],0),key+'按平台与品链汇总相等');
  for(const scope of ['period','year']){
   const rows=ctx.lifecycleCompletionProducts(stage,scope,p),key=scope==='year'?'yearActual':'actual';
   assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,'下钻记录不重复');
   chains.forEach((row,i)=>assert.equal(rows.filter(record=>record.chain===i).length,row[key],'按品链下钻数量一致'));
   platforms.forEach((row,i)=>assert.equal(rows.filter(record=>record.channel===i).length,row[key],'按平台下钻数量一致'));
   assert(rows.every(row=>row.channel>=0&&row.channel<6),'记录仅关联公共六平台');
  }
 }
 Object.assign(ctx,{brands:['测试品牌'],salesCrossData:()=>[[{sku:7,sale:100.23,target:99.77,annual:500.21,ytd:350.3,gross:-20.12}]]});
 const allocation=read('src/modules/channel-allocation/01.js');vm.runInContext(allocation.slice(0,allocation.indexOf('const chainRenderNewBase=')),ctx);
 const rows=ctx.salesChannelData({name:'公司整体'});assert.equal(rows.length,6);
 for(const [key,value] of Object.entries({sku:7,sale:100.23,target:99.77,annual:500.21,ytd:350.3,gross:-20.12}))assert(Math.abs(rows.reduce((n,row)=>n+row[key],0)-value)<1e-8,key+'金额、数量守恒');
 assert(rows.every(row=>!Object.hasOwn(row,'crossSplit')),'不保留跨境拆分结构');
 console.log('通过：生命周期品链/六平台/完成明细守恒、未来无实际、六平台金额及数量守恒');
}
