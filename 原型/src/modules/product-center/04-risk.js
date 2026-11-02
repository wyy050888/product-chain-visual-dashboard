// 品质榜复用总看板业务；其余五榜只适配展示结构，保留原数据和事件属性。
const pcRiskRowsForPlatform=rpRowsForPlatform;
const pcDirectorComponents=wfDirector;
wfDirector=function(){return pcIsActive()&&!dxRendering||pcDirectorComponents()};
rpRowsForPlatform=function(kind,platform){
 const rows=pcUnscoped(()=>pcRiskRowsForPlatform(kind,platform));
 if(pcChain()===null)return rows;
 if(kind===1)return rows.filter(shop=>pcUnscoped(()=>rpShopCoreFacts(shop)).products.some(row=>pfCategory(row.product)===pcManagerCategory));
 return rows.filter(row=>pfCategory(rpProduct(row)||row)===pcManagerCategory);
};
const pcRiskRender=renderRisks;
function pcStyleRiskCard(card,index){
 card.className='riskcard pc-risk-card';card.dataset.rpBoard='product-'+index;
 const head=card.querySelector('.dp-risk-head');head.className='rhead';head.querySelector('h3>.red')?.remove();
 const items=document.createElement('div');items.className='rp-items';
 for(const row of card.querySelectorAll('.dp-risk-item')){
  row.className='rp-entry pc-risk-entry';row.querySelector('.dp-rank').className='rank';
  const name=row.querySelector('.dp-risk-name'),info=document.createElement('div');
  name.className='rp-identity';info.append(...name.childNodes);name.append(info);
  const metric=row.querySelector(':scope>strong');metric.className='pc-risk-metric';metric.remove();
  const main=document.createElement('div'),header=document.createElement('header');main.className='rp-entry-main';
  header.append(...row.childNodes);main.append(header,metric);row.append(main);items.append(row);
 }
 const empty=card.querySelector('.dp-empty');if(empty){empty.className='empty';items.append(empty)}
 card.append(items);return card;
}
renderRisks=function(...args){
 const rail=$('#riskrail');
 if(!pcIsActive())return pcRiskRender(...args);
 return rpWithCardRows(()=>withPeriod('risk',()=>{
  // 专属榜与共用品质榜使用同一外层期间，详情仍走各自原处理器。
  dpState.periods.risk={...periodFor()};
  const original=document.createElement('template');original.innerHTML=dpWith('risk',dpRenderRisk);
  const cards=[...original.content.querySelector('.dp-risk-grid').children];
  const quality=document.createElement('article');quality.className='riskcard qr-card';quality.dataset.rpBoard='0';
  quality.innerHTML=rpCard(0,rpCardRows(0),rpCardPlatformControl(0),'品质风险榜');
  rpRenderedCardRules.set(quality,rpCardRuleSummary(0));cards[3]=quality;
  rail.replaceChildren(...cards.map((card,index)=>index===3?card:pcStyleRiskCard(card,index)));
  $('#risk .sectionhead h2').firstChild.textContent='产品中心高危预警';
  const sub=$('#risk .sectionhead .sub');if(sub)sub.textContent='6 大风险榜单 · TOP 6';
  decorateModule('risk');alignRiskCardFilters();pfMultiMount(rail);
 }));
};
const pcRankingAttach=riskRankingAttach;
riskRankingAttach=function(...args){const result=pcRankingAttach(...args);if(pcIsActive()&&$('#dialog').classList.contains('risk-ranking-drawer'))$('#dialogtitle').textContent='产品中心高危预警 · 完整榜单';return result};
// 完整品质榜不提供产品中心不存在的另外五个公司榜入口。
const pcRiskDrawerProfile=drawerProfile;
drawerProfile=function(body,title){
 const profile=pcRiskDrawerProfile(body,title);
 return pcIsActive()&&body.dataset.riskRankingKind==='0'?{...profile,tabs:profile.tabs.filter(tab=>tab.key==='ranking-0').map(tab=>({...tab,label:'品质风险榜'}))}:profile;
};
window.productCenterRiskAudit=()=>withPeriod('risk',()=>dpRiskLists().map((rows,index)=>index===3?
 {kind:0,title:'品质风险榜',rows:rpCardRows(0).map(row=>({id:row.id,category:pfCategory(rpProduct(row)||row)}))}:
 {kind:'product-'+index,title:dpRiskTitles[index],rows:rows.map(row=>({id:row.key,category:pfCategory(row)}))}));
