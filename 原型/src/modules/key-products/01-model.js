// 关键产品经营取所选期间；SABC从月销门槛换算，库存固定最新公司快照。
const kpmGrades={S:'头部利润支柱',A:'高销低利',B:'潜力利润品',C:'尾部无竞争力'};
const kpmFilters={query:'',brand:'all',category:'all',season:'all',price:'all',min:'',max:''};
// sales沿用表头字段键，实际排序值为GSV原始金额。
const kpmDefaultSort=Object.freeze({key:'sales',direction:'desc'});
const kpmSort={...kpmDefaultSort};
const kpmPage={value:1,key:''};
function kpmPageSize(){return listPageSize('matrix-product-pager',10)}
function kpmRows(){
 const platform=kpmBusinessPlatforms(),range=upWindow(),previousEnd=shiftDate(range.start,-1),previousStart=shiftDate(range.start,-aiFlowDayDiff(range.start,range.end)-1);
 const stockBySpu=upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF},()=>new Map(inventoryProductLedger().map(r=>[r.spuId,upStockFacts(r)])));
 return productRows(false).map(p=>{
  const identity=upIdentity(p),observed=upSummary(identity,range.start,range.end,platform),stock=stockBySpu.get(p.spuId)||null;
  const {gmvCents,refundCents,gsvCents,profitRate,profitCents,sales:units,returned,received,returnRate,receivedRate}=observed;
  const facts={gmvCents,refundCents,gsvCents,profitRate,profitCents,sales:units,returned,received,netSales:units-returned,returnRate,receivedRate};
  const sales=facts.gsvCents/1000000,profit=facts.profitRate,base={...p,sales,profit,guidePriceCents:upProduct(identity).guidePriceCents};
  const assessment=kpmGradeComparison(identity,range.end,platform,periodFor('matrix').mode,range.start),level=assessment.current.level;
  const priceStart=shiftDate(range.end,-29),priceFacts=range.start===priceStart?observed:upSummary(identity,priceStart,range.end,platform),priceCents=priceFacts.sales>0?Math.round(priceFacts.gmvCents/priceFacts.sales):null;
  const earlier=upSummary(identity,previousStart,previousEnd,platform),previous={gsvCents:earlier.gsvCents,sales:earlier.sales,returned:earlier.returned,received:earlier.received,returnRate:earlier.returnRate,receivedRate:earlier.receivedRate,netSales:earlier.sales-earlier.returned,profitRate:earlier.profitRate},targets=upReturnTargets({product:identity},{platform,start:range.start,end:range.end});
  return {...base,returnRate:returnRate??0,receivedRate,units,facts,stock,level,assessment,priceCents,category:pfCategory(p),season:pfIdentity(p).attribute,brand:pfIdentity(p).brand,previous,...targets,
   state:nspSalesState(p.state,stock),stockRisks:upStockRiskTags(stock)};
 });
}
function kpmFilterRows(rows,grade=true,change=true,filters=kpmFilters){
 const query=filters.query.trim().toLocaleLowerCase();
 return rows.filter(p=>(!query||[p.name,p.spuCode,p.model].some(v=>String(v||'').toLocaleLowerCase().includes(query)))
  &&kpmPriceMatch(p,filters)&&pfIncludes(filters.brand,p.brand)&&pfIncludes(filters.category,p.category)&&pfIncludes(filters.season,p.season)
  &&(!grade||kpmSelectedGrade==='all'||(p.level||'unrated')===kpmSelectedGrade)&&(!grade||!kpmSelectedOperating||p.level===kpmSelectedOperating&&brcProductOperatingMatch(p.level,p.assessment.current.profitRate))
  &&(!change||kpmMatchesSignal(p,kpmSelectedChange)));

}
let kpmSelectedGrade='all',kpmSelectedOperating=null;
function kpmValue(p,key){return ({sales:p.facts.gsvCents,profit:p.facts.profitRate,units:p.facts.netSales,
 returns:p.facts.returnRate,received:p.facts.receivedRate,unreceived:upUnreceivedRate(p.facts),total:p.stock?.totalUnits,
 warehouse:p.stock?.warehouse,coverage:p.stock?.coverage15,days:p.days,guidePrice:p.guidePriceCents})[key]}
function kpmSortedRows(rows){return rpSortRows(kpmFilterRows(rows),kpmSort,kpmValue)}
window.dashboardKeyProductsSnapshot=()=>withPeriod('matrix',()=>{
 const rows=kpmRows();return {scope:kpmBusinessScope,platforms:kpmBusinessPlatforms(),period:{...periodFor('matrix')},range:upWindow(),gradeRules:brcGradeRules(periodFor('matrix').mode),change:kpmSelectedChange,filters:{...kpmFilters},grade:kpmSelectedGrade,operating:kpmSelectedOperating,
  structure:kpmManagementStructure(kpmFilterRows(rows,false,false)),sort:{...kpmSort},page:kpmPage.value,size:kpmPageSize(),rows,base:kpmFilterRows(rows,false,false),visible:kpmSortedRows(rows)};
});
