const smChainMembershipKey='pc-system-chain-memberships-v1';
const smMembershipChains=filterCatalog.chains.flatMap(chain=>chain==='个护&健康'?['个护','健康']:[chain]);

function smReadChainMemberships(){
 let raw=null;
 try{
  raw=localStorage.getItem(smChainMembershipKey);
  const groups=JSON.parse(raw);
  if(groups&&typeof groups==='object'&&!Array.isArray(groups))return {raw,groups};
 }catch{/* 无法读取的配置回退为空配置或本地样例。 */}
 const groups=raw===null?{产品中心:{环境:rmSystemAccounts().filter(account=>account.chains?.includes('环境')).map(account=>account.id)}}:{};
 return {raw,groups};
}

function smChainMembers(groups,department,chain){
 const links=groups[department];
 const members=links?.[chain]??(['个护','健康'].includes(chain)?links?.['个护&健康']:undefined);
 return Array.isArray(members)?members:[];
}

function smSaveChainMembers(snapshot,department,chain,accountIds){
 if(localStorage.getItem(smChainMembershipKey)!==snapshot.raw)throw Error('链群配置已在其他页面更新，请取消后重新编辑');
 const members=rmSystemAccounts().filter(account=>accountIds.includes(account.id)).map(account=>account.id);
 const groups={...snapshot.groups,[department]:{...snapshot.groups[department],[chain]:members}};
 localStorage.setItem(smChainMembershipKey,JSON.stringify(groups));
}

// 看板按角色授权和部门归属计算可见链群，账号归属本身不授予访问权。
function smChainAccessRows(account,board,item,roles,groups){
 const grants=roles.filter(role=>role.status==='enabled'&&rmRoleHasAccount(role,account))
  .map(role=>role.dashboards?.[board.id]).filter(access=>access?.modules?.includes(item.id));
 const departments=board.department&&item.type!=='department'?[board.department]:rmDepartmentNames;
 return departments.map(department=>{
  const scopes=grants.map(access=>item.type==='department'?access.departments[item.id]?.[department]:access.scopes[item.id]);
  const chains=smMembershipChains.filter(chain=>scopes.includes('full')||
   (scopes.includes('chain')&&smChainMembers(groups,department,chain).includes(account.id)));
  return {department,chains};
 });
}
