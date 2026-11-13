import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=file=>fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8');
// 运行真实的品质/退货适配层；汇总夹具的 getter 计数可发现任一层意外展开全年趋势。
export function verifyLazyRiskFacts(){
 let expansions=0,queries=0;
 const days=(start,end)=>Array.from({length:(Date.parse(end)-Date.parse(start))/86400000+1},(_,i)=>({date:new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10),sales:20+i%3,returned:3,received:2}));
 const summary=(start,end)=>{
  const data=days(start,end),sum=key=>data.reduce((n,row)=>n+row[key],0);let points;
  return {start,end,sales:sum('sales'),returned:sum('returned'),received:sum('received'),returnRate:sum('returned')/sum('sales')*100,badRate:1,
   get points(){if(!points){expansions++;points=data.map(d=>({...d,returnRate:d.returned/d.sales*100}))}return points}};
 };
 const window={start:'2025-01-01',end:'2025-12-31',previousStart:'2024-01-02',previousEnd:'2024-12-31'};
 const ctx=vm.createContext({qrObservation:()=>{},qrPlatforms:['抖音','快手'],qrCatalog:()=>[{id:1,chain:0}],qrState:{platform:'all'},qrWindow:()=>window,riskRange:()=>window,
  qrbRawObservation:p=>({...p,points:[]}),qrbMonthly:(_p,_platform,end,start)=>{queries++;const length=Date.parse(end)-Date.parse(start)+86400000;return {current:summary(start,end),previous:summary(new Date(Date.parse(start)-length).toISOString().slice(0,10),new Date(Date.parse(start)-86400000).toISOString().slice(0,10)),events:[],risks:['进线率恶化'],priority:0,penaltyHit:false,offShelf:0,target:10}},
  qfCompare:(a,b)=>a.id-b.id,qrRate:(n,d)=>d?n/d*100:0,fmt:String,brcResultMatch:()=>true,
  upIdentity:r=>r,upSummary:(_p,start,end)=>{const s=summary(start,end);return Object.assign(s,{gmvCents:s.sales*92900,gsvCents:(s.sales-s.returned)*92900})},
  upWindow:()=>window,periodFor:()=>window,shiftDate:(day,offset)=>new Date(Date.parse(day)+offset*86400000).toISOString().slice(0,10),upProduct:r=>({id:r.productId||r.id,chain:r.chain}),pfReturnCauses:()=>['总退环比恶化'],brcMatch:()=>false});
 vm.runInContext(source('performance/01-cache.js'),ctx);
 vm.runInContext(source('period/00-rate-growth.js'),ctx);
 vm.runInContext('const filterCatalog={normalizeChain:()=>null};'+source('product-filters/00-multiselect.js').split('function pfOptionSelected')[0],ctx);
 const assignment=(file,name)=>source(file).split(/\r?\n/).find(line=>line.startsWith(name+'=function'));
 vm.runInContext(assignment('quality-monthly/01.js','qrObservation'),ctx);
 ctx.qfPreviousObservation=ctx.qrObservation;
 vm.runInContext(assignment('quality-metrics/01.js','qrObservation'),ctx);
 vm.runInContext(assignment('quality-metrics/01.js','qrRows'),ctx);
 const quality=ctx.qrRows();assert.equal(quality.length,2);assert.equal(expansions,0,'品质列表不能生成逐日趋势');
 vm.runInContext(source('return-comparison/01.js').split('const rrPreviousRows=')[0],ctx);
 const adapters=source('unified-product/02-operating-adapters.js');
 vm.runInContext(adapters.slice(adapters.indexOf('const upOriginalReturnRows ='),adapters.indexOf('nsSalesFacts =')),ctx);
 vm.runInContext(source('risk-presentation/01-return.js'),ctx);
 const confirmed=source('product-filters/03-confirmed-risk.js');
 vm.runInContext(confirmed.slice(confirmed.indexOf('rrRows=function'),confirmed.indexOf('function pfReturnCauses')),ctx);
 queries=0;const rows=ctx.rrRows();assert.equal(rows.length,1);assert.equal(queries,5,'保留两平台各两期观察及当前平台的判定入口');
 assert.equal(expansions,0,'退货适配与最终排序不能生成逐日趋势');
 const row=rows[0],points=row.points,previous=row.previous;
 assert.equal(expansions,2,'仅打开该产品的两期趋势才展开');assert.equal(points.length,365);assert.equal(previous.length,365);
 assert.equal(points[0].date,window.start);assert.equal(previous[0].date,window.previousStart);assert.equal(previous.at(-1).date,window.previousEnd);
 assert.equal(row.returned,points.reduce((n,d)=>n+d.returned,0));assert.equal(row.received,points.reduce((n,d)=>n+d.received,0));
 assert.equal(row.previousReturned,previous.reduce((n,d)=>n+d.returned,0));assert.equal(row.prevReceived,previous.reduce((n,d)=>n+d.received,0));
 assert.equal(row.receivedRate,row.received/row.shipped*100);assert.equal(row.previousRate,row.previousReturned/row.previousShipped*100);
 assert(points.every(d=>d.salesAmount===d.sales*row.price/10000));
 assert.equal(row.points,points);assert.equal(row.previous,previous);assert.equal(expansions,2,'重复查看复用同份明细');
 assert(Object.keys(row).includes('points'));assert.equal(JSON.parse(JSON.stringify(row)).points.length,365,'导出仍包含趋势明细');
 // 合并结果允许覆盖普通字段，源对象保持不变；复制本身不能执行 getter。
 const copy=ctx.copyFactRecord(quality[0],{sales:42});assert.equal(copy.sales,42);assert.notEqual(quality[0].sales,42);assert.equal(expansions,2);
 vm.runInContext(adapters.slice(adapters.indexOf('rfReturnFacts = function'),adapters.indexOf('const upOriginalReturnRows =')),ctx);
 const facts=ctx.rfReturnFacts(row);assert.equal(facts.received,row.received);assert.equal(expansions,2,'表格附加金额不能提前读取趋势');
}

export function verifyRiskRenderBatch(){
 let calls=0,version=1;
 const ctx=vm.createContext({qrRows:platform=>{calls++;if(platform==='error')throw Error('fixture');return [{version,platform}]}});
 const text=source('risk-presentation/02-platforms.js');
 vm.runInContext(text.slice(text.indexOf('let rpCardRowBatch='),text.indexOf('function rpCardRows')),ctx);
 const a=ctx.rpWithCardRows(()=>{
  const rows=ctx.rpRowsForPlatform(0,'抖音');assert.equal(ctx.rpRowsForPlatform(0,'抖音'),rows);
  ctx.rpWithCardRows(()=>assert.equal(ctx.rpRowsForPlatform(0,'抖音'),rows));
  ctx.rpRowsForPlatform(0,'快手');return rows;
 });
 assert.equal(calls,2);version++;
 const b=ctx.rpWithCardRows(()=>ctx.rpRowsForPlatform(0,'抖音'));assert.notEqual(a,b);assert.equal(b[0].version,2,'下次操作必须读取新事实');
 assert.throws(()=>ctx.rpWithCardRows(()=>ctx.rpRowsForPlatform(0,'error')),/fixture/);
 version++;assert.equal(ctx.rpWithCardRows(()=>ctx.rpRowsForPlatform(0,'抖音'))[0].version,3,'异常后必须释放整批缓存');
}
