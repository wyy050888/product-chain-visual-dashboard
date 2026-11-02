import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 批次只能消除同一次同步分析的重复扫描，不能缓存后续业务操作的库存或规则。
export function verifyCompanyStockBatch(){
 let version=1,ledgerCalls=0,riskCalls=0,activeRange=null;
 const products=['A','B','missing'].map(spuId=>({spuId}));
 const context=vm.createContext({window:{},DATA_CUTOFF:'2026-10-26',sbDecide(){},sbRules(){},qrbMonthly(){},
  shiftDate:(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10),
  upWithRange:(range,read)=>{const previous=activeRange;activeRange=range;try{return read()}finally{activeRange=previous}},
  inventoryProductLedger:()=>{ledgerCalls++;return [{spuId:'A',warehouse:10*version},{spuId:'B',warehouse:20*version}]},
  upPlatformStockFacts:(row,platform)=>({...row,platform}),upSpus:new Map(products.map(row=>[row.spuId,row])),
  upSummary:(product,start,end,platform)=>({spuId:product.spuId,start,end,platform,version})
 });
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/product-filters/03-confirmed-risk.js',import.meta.url),'utf8'),context);
 context.rpCompanyStockRows=()=>{riskCalls++;return [{spuId:'A',risk:version}]};
 const plain=value=>JSON.parse(JSON.stringify(value)),read=()=>products.map(state=>context.pfCompanyStockModel(state));
 const expected=plain(read());assert.equal(ledgerCalls,3);assert.equal(riskCalls,3);
 ledgerCalls=riskCalls=0;
 const result=context.pfWithCompanyStockBatch(()=>{
  const first=read();assert.deepEqual(plain(context.pfWithCompanyStockBatch(read)),plain(first));return first;
 });
 assert.deepEqual(plain(result),expected,'批量与独立读取的原始库存、风险和期间完全一致');
 assert.equal(ledgerCalls,1);assert.equal(riskCalls,1);assert.equal(activeRange,null);
 version=2;
 const changed=context.pfWithCompanyStockBatch(read);
 assert.equal(changed[0].stock.warehouse,20);assert.equal(changed[0].highStock.risk,2,'新批次读取最新规则结果');
 assert.equal(changed[2].stock,null);assert.equal(changed[2].highStock,null,'缺失产品不补造库存');
 assert.throws(()=>context.pfWithCompanyStockBatch(()=>{read();throw new Error('batch failed')}),/batch failed/);
 version=3;
 assert.equal(context.pfCompanyStockModel(products[0]).stock.warehouse,30,'失败批次也释放快照');
 assert.equal(activeRange,null,'嵌套期间始终恢复');
}
