const qcPreviewAccountId=new URLSearchParams(location.search).get('qc-account');
const qcRiskPermissions={0:'violation',6:'returns-worse',8:'returns-gap',1:'store-risk'};
const qcDiagnosisPermissions={coordination:'key-work',resource:'deviation',execution:'weekly-report',tasks:'tasks'};
const qcModulePermissions={risk:Object.values(qcRiskPermissions),ai:Object.values(qcDiagnosisPermissions),management:['rating','people-metrics'],new:['new'],projects:['projects','project-risk'],'cost-benefit':['cost-benefit'],lifecycle:['lifecycle'],matrix:['key-products'],cost:['cost']};
let qcAccess;

function qcResolveAccess(){
 const {roles}=rmReadRoles(),board=rmBoards.find(board=>board.id==='quality');
 const account=qcPreviewAccountId===null?null:rmSystemAccounts().find(account=>account.id===qcPreviewAccountId);
 const assigned=roles.filter(role=>role.status==='enabled'&&(qcPreviewAccountId===null?role.code==='director':account&&rmRoleHasAccount(role,account)));
 const dashboards=assigned.map(role=>role.dashboards.quality);
 const modules=new Set(dashboards.flatMap(access=>access.modules)),scopes={},departments={};
 const {groups}=smReadChainMemberships();
 for(const item of rmDashboardItems(board)){
  if(!modules.has(item.id)||!['chain','department','department-picker'].includes(item.type))continue;
  const grants=dashboards.filter(access=>access.modules.includes(item.id));
  if(item.type==='department-picker'){
   departments[item.id]=Object.fromEntries(item.departmentOptions().flatMap(([id])=>
    grants.some(access=>access.departments[item.id]?.[id]==='full')?[[id,null]]:[]));
   continue;
  }
  const chains=account?smChainAccessRows(account,board,item,assigned,groups):[];
  const linked=department=>{
   const membership=chains.find(row=>row.department===department)?.chains||[];
   return pfCategories.filter(chain=>chain==='个护&健康'?['个护','健康'].every(value=>membership.includes(value)):membership.includes(chain));
  };
  if(item.type==='chain'){
   if(!grants.some(access=>access.scopes[item.id]==='full'))scopes[item.id]=linked(board.department);
   continue;
  }
  departments[item.id]=Object.fromEntries(rmDepartmentNames.flatMap(department=>{
   const choices=grants.map(access=>access.departments[item.id]?.[department]);
   if(choices.includes('full'))return [[department,null]];
   return choices.includes('chain')?[[department,linked(department)]]:[];
  }));
 }
 const reports=new Set(dashboards.filter(access=>access.modules.includes('weekly-report')).flatMap(access=>access.reportScope));
 return {modules:[...modules].sort(),scopes,departments,reports:gdWeeklyReportScopes.filter(([key,name])=>key!=='chain'&&reports.has(name+'周报')),accountName:account?.name};
}

function qcCan(permission){return !qcIsActive()||qcAccess.modules.includes(permission)}
function qcAllowedDepartments(permission){return Object.keys(qcAccess.departments[permission]||{})}
function qcScope(permission){
 if(!qcIsActive())return null;
 return qcCan(permission)?qcAccess.scopes[permission]??null:[];
}
function qcIncludesChain(permission,value){
 const allowed=qcScope(permission);
 return allowed===null||allowed.includes(filterCatalog.normalizeChain(value==='厨房'?'厨电':value));
}
