// 每榜筛选按Tab保存；产品类型包含季品与属性（新品／老品／清仓品），两组组合查询。
const rpQualityAmountKinds=[{value:'fine',label:'平台罚款'},{value:'frozen',label:'资金冻结'}];
const rpProductQualityKinds=[...rpQualityAmountKinds,{value:'offShelf',label:'链接下架'},{value:'drop',label:'链接掉权'}];
const rpShopQualityKinds=[...rpProductQualityKinds,{value:'limited',label:'店铺限单'}];
function rpDefaultFilters(){return {...pfDefaults(),shopCategory:'all',assessed:'all',qualityRisk:'all',returnHit:'all',qualityOnly:true,grade:'all',query:''}}
function rpRankingSupportsGrade(kind){return kind!==1&&kind!==3}
function rpSavedFilters(k){
 const filters=rpListState.filters[k]||(rpListState.filters[k]={...rpDefaultFilters(),...rpCardProductFilters(k)});
 if(!rpRankingSupportsGrade(k)){filters.grade='all';return filters}
 const selected=pfSelected(filters.grade),grades=selected.filter(value=>['S','A','B','C'].includes(value));
 if(grades.length!==selected.length)filters.grade=grades.length?grades:'all';
 return filters;
}
function rpFilterOptions(values,selected){return pfOptions(values,selected)}
function rpFilterSelect(key,label,values,filters){return `<label>${label}<select data-rp-filter="${key}" multiple data-pf-multiple data-pf-label="${esc(label)}" aria-label="${label}">${rpFilterOptions(values,filters[key])}</select></label>`}
function rpQualityHit(k,r,kind,qualityOnly=true){
 const selected=pfSelected(kind);
 if(!selected.length)return true;
 if(k===0)return (r.monthly?.events||[]).some(event=>selected.includes(rpViolationMetricKey(event.type)));
 const {start,end}=riskRange();
 return rpShopPeriodEvents(r,start,end,qualityOnly).some(event=>selected.includes(event.type));
}
function rpFilterTools(k,filters,platform){
 const shop=k===1;
 const search=`<label class="rp-search-label"><input type="search" data-rp-filter="query" aria-label="${shop?'店铺搜索':[3,4].includes(k)?'SKU搜索':'产品搜索'}" placeholder="${shop?'店铺名称 / 店铺ID / 产品名称 / SPU码 / 型号':[3,4].includes(k)?'SKU名称 / SKU编码':'产品名称 / SPU码 / 型号'}" value="${esc(filters.query)}"></label>`;
 return search+(shop?rpFilterSelect('brand','品牌',[...new Set([...sampleShops,...sampleDemoShops].map(p=>p.brand))],filters)+rpFilterSelect('chain','核心主营产品链群',pfCategories,filters)+rpShopAttributeField(filters,platform):pfFields(filters,undefined,'data-rp-filter',true))
 +(rpRankingSupportsGrade(k)?rpFilterSelect('grade','产品分级',['S','A','B','C'],filters):'')
 +([0,1].includes(k)?rpFilterSelect('qualityRisk','风险类型',shop?rpShopQualityKinds:rpProductQualityKinds,filters):'')
 +(k===8?rpFilterSelect('returnHit','命中项',['总退','已收退','两项'],filters):'')
 +'<button type="button" class="link" data-rp-reset>重置筛选</button>';
}
function rpFilterRows(k,rows,filters){const query=(filters.query||'').trim().toLocaleLowerCase();const result=rows.filter(r=>{
 const p=k===1?null:rpProduct(r),identity=p||r,core=k===1?rpShopCoreFacts(r).products.map(row=>row.product):[];
 return (k===1?pfIncludes(filters.brand,r.brand)&&(!pfSelected(filters.chain).length||core.some(product=>pfIncludes(filters.chain,pfCategory(product))))&&pfIncludes(filters.shopCategory,r.shopCategory)&&pfIncludes(filters.assessed,r.assessed?'yes':'no'):pfMatches(r,filters))
 &&(!rpRankingSupportsGrade(k)||pfIncludes(filters.grade,rpRankingGrade(r)))
 &&(![0,1].includes(k)||rpQualityHit(k,r,filters.qualityRisk,filters.qualityOnly))
 &&(k!==8||pfIncludes(filters.returnHit,r.risks.length===2?'两项':r.risks[0]))
 &&(!query||(k===1?[r.name,r.shopId,...core.flatMap(product=>[product.name,product.spuCode,product.model])]:[r.name,r.skuCode,r.skuId,identity.spuCode,identity.model]).some(value=>String(value??'').toLocaleLowerCase().includes(query)));
 });return result;
}

// 统计口径单独成行，紧邻表格。
function rpQualityListChecks(filters){
 return `<div class="rp-quality-list-checks"><label><input type="checkbox" data-rp-filter="qualityOnly" ${filters.qualityOnly?'checked':''}>展示品质违规统计</label></div>`;
}

// 店铺类型复用产品类型双分组菜单，两组条件取交集。
function rpShopAttributeField(filters,platform='all'){
 const available=shcRules.options(platform),selected=pfSelected(filters.shopCategory).filter(value=>available.includes(value));
 filters.shopCategory=selected.length?selected:'all';
 return pfAttributeField(filters,['shopCategory','assessed'],'data-rp-filter',{
  shopCategory:available,
  assessed:[{value:'yes',label:'是'},{value:'no',label:'否'}]
 },{shopCategory:'分类',assessed:'是否考核'},'店铺类型',true);
}
