// 库存管控展示已发生呆滞：按真实库存库龄判断，与可售天数预警分离。
const ipStagnantMinAgeDays=60;
let ipStagnantChain='all';
function ipStagnantEligible(row){
 return Number.isFinite(row.staleUnits)&&row.staleUnits>0&&Number.isFinite(row.staleMaxAgeDays)&&row.staleMaxAgeDays>=ipStagnantMinAgeDays;
}
function ipStagnantShare(row){return Number.isFinite(row.staleUnits)&&Number.isFinite(row.totalUnits)&&row.totalUnits>0?row.staleUnits/row.totalUnits:null}
function ipStagnantCompare(a,b){return rpStockNumericCompare(a,b,[['staleValueCents',-1],['staleMaxAgeDays',-1],[ipStagnantShare,-1]])}
function ipStagnantTopModel(rows=rpStockSkuRows()){
 const eligible=ipSeasonLedger(rows).filter(ipStagnantEligible);
 const byChain=new Map(pfCategories.map(chain=>[chain,[]]));
 for(const row of eligible)byChain.get(pfIdentity(row).category)?.push(row);
 const selected=ipStagnantChain==='all'?eligible:byChain.get(ipStagnantChain)||[];
 const counts={all:eligible.length,...Object.fromEntries([...byChain].map(([chain,items])=>[chain,items.length]))};
 return {count:selected.length,rows:selected.sort(ipStagnantCompare).slice(0,10),counts};
}
