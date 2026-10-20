// 关键产品经营取所选期间；SABC取截止日近30天，库存固定最新公司快照。
const kpmGrades={S:'头部利润支柱',A:'高销低利',B:'潜力利润品',C:'尾部无竞争力'};
const kpmFilters={query:'',brand:'all',category:'all',season:'all',price:'all',min:'',max:''};
const kpmSort={key:'sales',direction:'desc'};
const kpmPage={value:1,key:''},KPM_PAGE_SIZE=10;
function kpmRows(){
 const platform=kpmBusinessPlatforms(),range=upWindow(),previousEnd=shiftDate(range.start,-1),previousStart=shiftDate(range.start,-aiFlowDayDiff(range.start,range.end)-1);
 const stockBySpu=upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF},()=>new Map(inventoryProductLedger().map(r=>[r.spuId,upStockFacts(r)])));
 return productRows(false).map(p=>{
  const identity=upIdentity(p),observed=upSummary(identity,range.start,range.end,platform),stock=stockBySpu.get(p.spuId)||null;
  const {gmvCents,refundCents,gsvCents,profitRate,profitCents,sales:units,returnRate,receivedRate}=observed;
  const facts={gmvCents,refundCents,gsvCents,profitRate,profitCents,sales:units,returnRate,receivedRate};
  const sales=facts.gsvCents/1000000,profit=facts.profitRate,base={...p,sales,profit};
  const assessment=kpmGradeComparison(identity,range.end,platform),level=assessment.current.level;
  const priceFacts=range.start===assessment.current.start?observed:upSummary(identity,assessment.current.start,range.end,platform),priceCents=priceFacts.sales>0?Math.round(priceFacts.gmvCents/priceFacts.sales):null;
  const earlier=upSummary(identity,previousStart,previousEnd,platform),previous={gsvCents:earlier.gsvCents,sales:earlier.sales,profitRate:earlier.profitRate},returnTarget=rpLossReturnTarget(identity,platform,range.start,range.end);
  return {...base,returnRate:returnRate??0,receivedRate,units,facts,stock,level,assessment,priceCents,category:pfCategory(p),season:pfIdentity(p).attribute,brand:pfIdentity(p).brand,previous,returnTarget,
   state:nspSalesState(p.state,stock),stockRisks:upStockRiskTags(stock)};
 });
}
function kpmFilterRows(rows,grade=true,change=true,filters=kpmFilters){
 const query=filters.query.trim().toLocaleLowerCase();
 return rows.filter(p=>(!query||[p.name,p.spuCode,p.model].some(v=>String(v||'').toLocaleLowerCase().includes(query)))
  &&kpmPriceMatch(p,filters)&&pfIncludes(filters.brand,p.brand)&&pfIncludes(filters.category,p.category)&&pfIncludes(filters.season,p.season)
  &&(!grade||kpmSelectedGrade==='all'||(p.level||'unrated')===kpmSelectedGrade)
  &&(!change||kpmMatchesChange(p.assessment,kpmSelectedChange,kpmSelectedTransition)));

}
let kpmSelectedGrade='all';
function kpmValue(p,key){return ({sales:p.facts.gsvCents,profit:p.facts.profitRate,units:p.facts.sales,
 returns:p.facts.returnRate,received:p.facts.receivedRate,total:p.stock?.totalUnits,
 warehouse:p.stock?.warehouse,coverage:p.stock?.coverage15})[key]}
function kpmSortedRows(rows){return rpSortRows(kpmFilterRows(rows),kpmSort,kpmValue)}
window.dashboardKeyProductsSnapshot=()=>withPeriod('matrix',()=>{
 const rows=kpmRows();return {scope:kpmBusinessScope,platforms:kpmBusinessPlatforms(),period:{...periodFor('matrix')},range:upWindow(),gradeRules:kpmGradeRules,change:kpmSelectedChange,transition:kpmSelectedTransition,filters:{...kpmFilters},grade:kpmSelectedGrade,
  sort:{...kpmSort},page:kpmPage.value,size:KPM_PAGE_SIZE,rows,base:kpmFilterRows(rows,false),visible:kpmSortedRows(rows)};
});
