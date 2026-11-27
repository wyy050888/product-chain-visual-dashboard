// 固定范围同时落实到状态、模型和控件生成；重置筛选也不能扩大部门或类目。
function pcApplyFixedSelections(reset=false){
 const manager=dpState.role==='owner';dpState.chain=manager?String(pcManagerChain):'all';
 document.body.classList.toggle('product-center-manager',manager);
 if(reset){kpmFilters.category='all';pfControlSet($('#newchain'),'all')}
 if(manager){kpmFilters.category=pcManagerCategory;pfControlSet($('#newchain'),pcManagerCategory)}
 if(reset)for(const filter of Object.values(gdState.filters)){filter.department=pcFixedDepartment;filter.category=manager?pcManagerCategory:'all'}
}
const pcGdTableFilters=gdTableFilters,pcGdFilterGroup=gdFilterGroup;
gdTableFilters=function(...args){const filter=pcGdTableFilters(...args);if(pcIsActive()){filter.department=pcFixedDepartment;if(pcChain()!==null)filter.category=pcManagerCategory}return filter};
gdFilterGroup=function(label,field,...args){if(pcIsActive()&&(field==='department'||field==='category'&&pcChain()!==null))return '';return pcGdFilterGroup(label,field,...args)};

function pcProjectRole(){
 const code=dpState.role==='owner'?'chain-owner':'director';
 return rmReadRoles().roles.find(role=>role.status==='enabled'&&role.code===code);
}
const pcProjectChains=ppProjectChains;
ppProjectChains=function(){
 if(!pcIsActive()||dpState.role!=='owner')return pcProjectChains();
 const role=pcProjectRole();if(!role)return [];
 const board=rmBoards.find(board=>board.id==='product');
 const item=rmDashboardItems(board).find(item=>item.id==='projects');
 // 原型链主沿用环境链群的产品经理样例，显示范围由角色和链群配置决定。
 const account={id:'product-center:张晓阳',name:'张晓阳'};
 const assignedRole=role.users?.length?role:{...role,users:[account.id]};
 const [membership]=smChainAccessRows(account,board,item,[assignedRole],smReadChainMemberships().groups);
 return pfCategories.filter(chain=>chain==='个护&健康'
  ? ['个护','健康'].every(part=>membership.chains.includes(part))
  : membership.chains.includes(chain));
};
const pcProjectRows=ppRows;
ppRows=function(...args){
 if(!pcIsActive())return pcProjectRows(...args);
 const rows=pcUnscoped(()=>pcProjectRows(...args));
 if(dpState.role!=='owner')return rows;
 const allowed=ppProjectChains();
 return rows.filter(row=>allowed.includes(row.category));
};
const pcProjectRender=renderProjects;
renderProjects=function(...args){
 if(pcChain()!==null){
  const allowed=ppProjectChains();
  ppState.category=ppState.category.filter(chain=>allowed.includes(chain));
 }
 return pcProjectRender(...args);
};
const pcAnalysisDepartments=ppAnalysisDepartments;
ppAnalysisDepartments=function(){
 if(!pcIsActive())return pcAnalysisDepartments();
 const access=pcProjectRole()?.dashboards.product;
 if(!access?.modules.includes('project-risk'))return [];
 const grants=access.departments['project-risk'];
 return ppDepartments.filter(department=>grants?.[department]==='full');
};
const pcAnalysisRows=ppAnalysisRows;
ppAnalysisRows=function(...args){
 if(!pcIsActive())return pcAnalysisRows(...args);
 const allowed=ppAnalysisDepartments();if(!allowed.length)return [];
 return ppAnalysisRowsForDepartments(pcAnalysisRows(...args),allowed);
};

const pcPfFields=pfFields,pcRiskFilterSelect=rpFilterSelect,pcKpmScopeGroup=kpmScopeGroup;
pfFields=function(filters,keys=['brand','chain','attribute','productType'],...args){return pcPfFields(filters,pcChain()!==null?keys.filter(key=>key!=='chain'):keys,...args)};
rpFilterSelect=function(key,...args){return pcChain()!==null&&key==='chain'?'':pcRiskFilterSelect(key,...args)};
kpmScopeGroup=function(rows,key,...args){return pcChain()!==null&&key==='category'?'':pcKpmScopeGroup(rows,key,...args)};
