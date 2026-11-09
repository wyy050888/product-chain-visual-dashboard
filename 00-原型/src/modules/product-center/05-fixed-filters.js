// 固定范围同时落实到状态、模型和控件生成；重置筛选也不能扩大部门或类目。
function pcApplyFixedSelections(reset=false){
 const manager=dpState.role==='owner';dpState.chain=manager?String(pcManagerChain):'all';
 document.body.classList.toggle('product-center-manager',manager);
 ppState.department=[pcProjectDepartment];ppState.riskDepartment=pcProjectDepartment;ppAnalysisState.department=pcProjectDepartment;
 if(reset){ppState.category=[];kpmFilters.category='all';pfControlSet($('#newchain'),'all')}
 if(manager){ppState.category=[pcManagerCategory];kpmFilters.category=pcManagerCategory;pfControlSet($('#newchain'),pcManagerCategory);ppState.distribution='type'}
 if(reset)for(const filter of Object.values(gdState.filters)){filter.department=pcFixedDepartment;filter.category=manager?pcManagerCategory:'all'}
}
const pcGdTableFilters=gdTableFilters,pcGdFilterGroup=gdFilterGroup;
gdTableFilters=function(...args){const filter=pcGdTableFilters(...args);if(pcIsActive()){filter.department=pcFixedDepartment;if(pcChain()!==null)filter.category=pcManagerCategory}return filter};
gdFilterGroup=function(label,field,...args){if(pcIsActive()&&(field==='department'||field==='category'&&pcChain()!==null))return '';return pcGdFilterGroup(label,field,...args)};

const pcProjectRows=ppRows,pcProjectSelectedRisks=ppSelectedRisks,pcProjectRender=renderProjects,pcProjectSelect=ppSelect,pcProjectAnalysis=ppAnalysisSelection;
ppRows=function(...args){
 const rows=pcProjectRows(...args);if(!pcIsActive())return rows;
 return rows.filter(row=>ppValues([row.dept,...(row.departments||[]),...row.ledger.flatMap(risk=>ppValues(risk.department))]).some(pcProductDepartment));
};
ppSelectedRisks=function(project,state=ppState){return pcProjectSelectedRisks(project,pcIsActive()?{...state,department:[pcProjectDepartment]}:state)};
renderProjects=function(...args){if(pcIsActive())pcApplyFixedSelections();return pcProjectRender(...args)};
ppSelect=function(key,...args){return pcIsActive()&&(key==='department'||key==='category'&&pcChain()!==null)?'':pcProjectSelect(key,...args)};
ppAnalysisSelection=function(rows,department,mode){return pcProjectAnalysis(rows,pcIsActive()?pcProjectDepartment:department,mode)};

const pcPfFields=pfFields,pcRiskFilterSelect=rpFilterSelect,pcKpmScopeGroup=kpmScopeGroup;
pfFields=function(filters,keys=['brand','chain','attribute','productType'],...args){return pcPfFields(filters,pcChain()!==null?keys.filter(key=>key!=='chain'):keys,...args)};
rpFilterSelect=function(key,...args){return pcChain()!==null&&key==='chain'?'':pcRiskFilterSelect(key,...args)};
kpmScopeGroup=function(rows,key,...args){return pcChain()!==null&&key==='category'?'':pcKpmScopeGroup(rows,key,...args)};
