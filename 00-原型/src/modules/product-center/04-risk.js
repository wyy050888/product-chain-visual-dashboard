// 产品中心专属分组与总看板复用榜并列；切换平台/季品仅替换有变化的复用榜。
const pcRiskSharedKinds=[...rpHomeQualityKinds,2];
let pcCurrentRiskData=null;
const pcRiskRender=renderRisks,pcOpenRisk=openRisk,pcRankingTabs=rpAvailableRankingTabs;
const pcNativeRiskRows=rpRowsForPlatform,pcNativeListRows=rpListRows;
function pcRiskScopeRows(kind,rows){
 if(pcChain()===null)return rows;
 return rows.filter(row=>kind===1
  ?pcUnscoped(()=>rpShopCoreFacts(row).products.some(({product})=>pfCategory(product)===pcManagerCategory))
  :pfCategory(rpProduct(row)||row)===pcManagerCategory);
}
rpRowsForPlatform=function(kind,...args){
 if(pcChain()===null)return pcNativeRiskRows(kind,...args);
 return pcRiskScopeRows(kind,pcUnscoped(()=>pcNativeRiskRows(kind,...args)));
};
rpListRows=function(kind){
 return kind===0?pcRiskScopeRows(kind,pcUnscoped(()=>pcNativeListRows(kind))):pcNativeListRows(kind);
};
openRisk=function(kind,...args){
 return pcIsActive()&&pcRiskSharedKinds.includes(kind)?rpOpenList(kind,true):pcOpenRisk(kind,...args);
};
rpAvailableRankingTabs=function(){
 const shared=pcRankingTabs();
 if(!pcIsActive())return shared;
 const own=Object.entries(pcRiskLabels).map(([key,label])=>({kind:'pc-'+key,label,open:()=>pcRiskOpenList(key)}));
 return [...own,...shared.filter(tab=>pcRiskSharedKinds.includes(tab.kind))];
};
function pcRiskNavigation(){
 const launch=$('#riskrail>.rp-board-group-launch');
 const boards=rpNavigationBoards().filter(node=>!launch?.contains(node)).map(node=>{
  const key=node.dataset.rpBoard;
  return {node,key,label:pcRiskLabels[key.slice(3)]||rpTitles[key]};
 });
 if(launch)boards.unshift({node:launch,key:'pc-launch',label:launch.querySelector('.rp-group-title').textContent});
 return boards;
}
renderRisks=function(changedKinds,...args){
 if(!pcIsActive())return pcRiskRender(changedKinds,...args);
 return rpWithCardRows(()=>withPeriod('risk',()=>{
  const rail=$('#riskrail'),partial=Array.isArray(changedKinds)&&rail.querySelector('[data-rp-board="pc-delayed"]');
  const kinds=partial?pcRiskSharedKinds.filter(kind=>changedKinds.includes(kind)):pcRiskSharedKinds,{cards,rules}=rpHomeCards(kinds);
  if(partial){
   for(const [kind,markup] of cards){const board=rail.querySelector('[data-rp-board="'+kind+'"]');if(board)board.outerHTML=markup}
  }else{
   pcCurrentRiskData=pcRiskData();
   for(const key of Object.keys(pcCurrentRiskData))rules.set('pc-'+key,pcRiskCardNotice(key));
   const own=key=>pcRiskBoard(key,pcRiskBoardData(key));
   rail.innerHTML=rpHomeGroup('launch','上品计划预警',pcRiskFilterBoards.launch.map(own).join(''),pcRiskFilterBar('launch','上品计划预警'))+
    rpHomeGroup('initiation','立项规划预警',own('initiation'))+
    rpHomeGroup('quality','品质风险榜',rpHomeQualityKinds.map(kind=>cards.get(kind)).join(''))+cards.get(2);
  }
  $('#risk .sectionhead h2').firstChild.textContent='产品中心风险预警';
  const sub=$('#risk .sectionhead .sub');if(sub)sub.textContent='9 个预警榜单 · TOP 6';
  rpFinishHomeCards(rail,kinds,rules);
  rpMountGroupNavigation(pcRiskNavigation,dpView.querySelector('.pc-navigation-toolbar'));
 }));
};
window.productCenterRiskAudit=()=>pcIsActive()?pcCurrentRiskData:null;
