const rmStorageKey='pc-system-roles-v1';
const rmRoleStatus=[['enabled','正常'],['disabled','停用']];
const rmRoleDataScopes=[['all','全部数据权限'],['custom','自定数据权限'],['department','本部门数据权限'],['department-tree','本部门及以下数据权限'],['self','仅本人数据权限']];
function rmSystemAccounts(){
 const latestWeek=Object.keys(pcPeopleWeeklyReports).sort().at(-1);
 return (pcPeopleWeeklyReports[latestWeek]||[]).map(({name,chains})=>({id:`product-center:${name}`,name,chains}));
}
function rmRoleHasAccount(role,account){
 return (role.users||[]).some(value=>value===account.id||value===account.name);
}

function rmNewRole(){
 return {name:'',code:'',order:0,status:'enabled',remark:'',menus:[],menuLink:true,dataScope:'all',dataDepartments:[],users:[],
  dashboards:Object.fromEntries(rmBoards.map(board=>[board.id,rmNewDashboardAccess(board)]))};
}
function rmExampleRoles(){
 return [['director','总监'],['chain-owner','链主']].map(([code,name],index)=>({
  ...rmNewRole(),id:index+1,code,name,order:index+1,created:DATA_CUTOFF+' 09:00:00',
  dashboards:Object.fromEntries(rmBoards.map(board=>[board.id,rmExampleDashboardAccess(board,code)]))
 }));
}
function rmReadRoles(){
 let raw=null,data;
 try{raw=localStorage.getItem(rmStorageKey);data=JSON.parse(raw)}catch(_){/* 退回演示角色，保存时再校验浏览器存储。 */}
 const roles=Array.isArray(data)?data:rmExampleRoles();
 for(const role of roles){
  const scopes=role.dashboards?.product?.scopes;
  if(scopes?.rating==='personnel')scopes.rating='full';
  for(const board of rmBoards){
   const access=role.dashboards?.[board.id];
   if(!access)continue;
   rmMigrateProjectAccess(board,access);
   if(!Array.isArray(access.modules))rmMigrateModuleAccess(board,access);
   if(!Array.isArray(access.reportScope)){
    access.reportScope=access.reports?.length?access.reports:rmDefaultReportScope(board);
    delete access.reports;
   }
   rmNormalizeChainScopes(board,access);
  }
 }
 return {raw,roles};
}
function rmNormalizeChainScopes(board,access){
 const modules=new Set(access.modules);
 for(const item of rmDashboardItems(board)){
  if((item.type==='chain'||item.type==='shared')&&!rmHasModuleScope(item,access)){
   delete access.scopes[item.id];
   modules.delete(item.id);
  }
  if(item.type!=='department')continue;
  const grants=access.departments[item.id];
  if(!grants&&board.department){
   access.departments[item.id]=rmDefaultDepartmentScopes(board);
   modules.delete(item.id);
   continue;
  }
  if(board.department&&grants?.[board.department]==='none')modules.delete(item.id);
  if(grants)for(const [department,scope] of Object.entries(grants)){
   if(scope!=='full'&&scope!=='chain')delete grants[department];
  }
 }
 access.modules=[...modules];
}
function rmMigrateModuleAccess(board,access){
 access.modules=access.enabled?rmDashboardItems(board).filter(item=>{
  if(item.type==='brand')return access.brand;
  if(item.type==='report')return board.department?access.reports?.includes(board.department+'周报'):access.reports?.length;
  return rmHasModuleScope(item,access);
 }).map(item=>item.id):[];
 delete access.enabled;
 delete access.brand;
}
function rmMigrateProjectAccess(board,access){
 const previous=access?.departments?.projects;
 if(!previous)return;
 const departments=board.department?[board.department]:rmDepartmentNames;
 const scopes=departments.map(department=>previous[department]);
 // 仅在原权限覆盖该看板所有部门时沿用进度层范围。整部门风险分析沿用原来的全部授权。
 if(scopes.every(scope=>scope==='full'))access.scopes.projects??='full';
 else if(scopes.every(scope=>scope==='full'||scope==='chain'))access.scopes.projects??='chain';
 access.departments['project-risk']??=rmDepartmentGrants(ppDepartments.filter(department=>previous[department]==='full'));
 delete access.departments.projects;
}
function rmWriteRoles(snapshot,roles){
 if(localStorage.getItem(rmStorageKey)!==snapshot.raw)throw Error('角色已在其他页面更新，请关闭弹窗后重试');
 localStorage.setItem(rmStorageKey,JSON.stringify(roles));
}
function rmSaveRole(snapshot,role){
 if(snapshot.roles.some(item=>item.id!==role.id&&item.code.toLowerCase()===role.code.toLowerCase()))throw Error('权限字符已存在');
 if(role.id==null){
  const id=Math.max(0,...snapshot.roles.map(item=>item.id))+1;
  const created=new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'});
  rmWriteRoles(snapshot,[...snapshot.roles,{...role,id,created}]);
  return;
 }
 rmWriteRoles(snapshot,snapshot.roles.map(item=>item.id===role.id?role:item));
}
