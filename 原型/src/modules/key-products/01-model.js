// 关键产品经营取所选期间；SABC取截止日近30天，库存固定最新公司快照。
const kpmGrades={S:'头部利润支柱',A:'高销低利',B:'潜力利润品',C:'尾部无竞争力'};
const kpmRiskNames={stagnant:'滞销',shortage:'缺货',transfer:'调货'};
const kpmFilters={query:'',brand:'all',category:'all',season:'all',channel:'all',risk:'all'};
const kpmSort={key:'sales',direction:'desc'};
const kpmPage={value:1,key:''},KPM_PAGE_SIZE=10;
function kpmRows(){
 const range=upWindow();
 const stockBySpu=upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF},()=>new Map(inventoryProductLedger().map(r=>[r.spuId,upStockFacts(r)])));
 return productRows(false).map(p=>{
  const identity=upIdentity(p),observed=upSummary(identity,range.start,range.end,'all'),stock=stockBySpu.get(p.spuId)||null;
  const {gmvCents,refundCents,gsvCents,profitRate,profitCents,sales:units,returnRate,receivedRate}=observed;
  const facts={gmvCents,refundCents,gsvCents,profitRate,profitCents,sales:units,returnRate,receivedRate};
  const sales=facts.gsvCents/1000000,profit=facts.profitRate,base={...p,sales,profit};
  const assessment=kpmGradeComparison(identity,range.end),level=assessment.current.level;
  const channels=qrPlatforms.filter(channel=>upSummary(identity,range.start,range.end,channel).sales>0);
  return {...base,facts,stock,level,assessment,category:pfCategory(p),season:pfIdentity(p).attribute,brand:pfIdentity(p).brand,channels,
   state:nspSalesState(p.state,stock),stockRisks:upStockRiskTags(stock)};
 });
}
function kpmFilterRows(rows,grade=true,change=true){
 const query=kpmFilters.query.trim().toLocaleLowerCase();
 return rows.filter(p=>(!query||[p.name,p.spuCode,p.model].some(v=>String(v||'').toLocaleLowerCase().includes(query)))
  &&pfIncludes(kpmFilters.brand,p.brand)&&pfIncludes(kpmFilters.category,p.category)&&pfIncludes(kpmFilters.season,p.season)
  &&(!pfSelected(kpmFilters.channel).length||p.channels.some(v=>pfIncludes(kpmFilters.channel,v)))
  &&(!pfSelected(kpmFilters.risk).length||pfSelected(kpmFilters.risk).some(v=>v==='normal'?p.stock&&Number.isFinite(p.stock.coverage15)&&!p.stockRisks.length:p.stockRisks.includes(v)))
  &&(!grade||kpmSelectedGrade==='all'||(p.level||'unrated')===kpmSelectedGrade)
  &&(!change||kpmSelectedChange==='all'||(kpmSelectedChange==='changed'?['up','down'].includes(p.assessment.change):p.assessment.change===kpmSelectedChange)));
}
let kpmSelectedGrade='all';
function kpmValue(p,key){return ({sales:p.facts.gsvCents,profit:p.facts.profitRate,amount:p.facts.profitCents,units:p.facts.sales,
 returns:p.facts.returnRate,received:p.facts.receivedRate,warehouse:p.stock?.warehouse,total:p.stock?.totalUnits,
 coverage:p.stock?.coverage15,totalCoverage:p.stock?.totalCoverage15})[key]}
function kpmSortedRows(rows){return rpSortRows(kpmFilterRows(rows),kpmSort,kpmValue)}
window.dashboardKeyProductsSnapshot=()=>withPeriod('matrix',()=>{
 const rows=kpmRows();return {period:{...periodFor('matrix')},range:upWindow(),thresholds:{salesWan:config.high,profitRate:config.profit},gradeRules:{S:{salesAbove:600,profitAbove:12},A:{salesAbove:300,profitBelow:12},B:{salesAbove:60,salesBelow:300,profitAbove:15},C:{salesBelow:60,profitBelow:12}},change:kpmSelectedChange,filters:{...kpmFilters},grade:kpmSelectedGrade,
  sort:{...kpmSort},page:kpmPage.value,size:KPM_PAGE_SIZE,rows,base:kpmFilterRows(rows,false),visible:kpmSortedRows(rows)};
});
