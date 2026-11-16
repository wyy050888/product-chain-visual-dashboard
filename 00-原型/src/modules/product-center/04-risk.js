// 三榜先提供空态。保留总看板的卡片视觉和期间入口，不把公司预警带入产品中心。
const pcRiskBoards=[['launch','上品计划预警'],['initiation','立项规划预警'],['quality','高危品质风险榜']];
const pcRiskRender=renderRisks;
renderRisks=function(...args){
 if(!pcIsActive())return pcRiskRender(...args);
 $('#riskrail').innerHTML=pcRiskBoards.map(([key,title])=>`<article class="riskcard pc-risk-card" data-rp-board="pc-${key}"><div class="rhead rp-compact-header"><h3>${title}</h3></div><div class="rp-items"><p class="empty">暂无预警数据</p></div></article>`).join('');
 $('#risk .sectionhead h2').firstChild.textContent='产品中心风险预警';
 const sub=$('#risk .sectionhead .sub');if(sub)sub.textContent='3 个预警榜单';
 decorateModule('risk');
};
window.productCenterRiskAudit=()=>pcRiskBoards.map(([kind,title])=>({kind,title,rows:[]}));
