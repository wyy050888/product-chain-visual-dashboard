// HTML入口只选择工作区；业务数据和组件继续复用同一份源代码。
const dashboardEntryView=document.documentElement.dataset.dashboardView||'director';
const dashboardEntryRoutes={director:'#dashboard',product:'#department',project:'#project-department',quality:'#quality-department',research:'#rd-department',procurement:'#procurement'};
let qualityEntryView;
function showQualityEntry(){
 if(!qualityEntryView){
  qualityEntryView=document.createElement('section');qualityEntryView.id='quality-department';qualityEntryView.className='section';
  qualityEntryView.setAttribute('aria-label','品质中心看板');
  qualityEntryView.innerHTML='<div class="sectionhead"><div class="titlegroup"><h2>品质中心看板</h2></div></div><p>页面待设计</p>';
  dpMain.append(qualityEntryView);
 }
 for(const node of dpMain.children)node.hidden=node!==qualityEntryView;
 dpState.view='quality';
 dpNavButtons.forEach((button,index)=>{
  button.classList.toggle('active',index===3);
  if(index===3)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 });
}
function initializeDashboardEntry(){
 for(const entry of dashboardPages){
  const button=dpNavButtons[entry.menu];
  button.disabled=false;button.removeAttribute('title');
  button.onclick=()=>location.assign(entry.file);
 }
 const destination=location.hash||dashboardEntryRoutes[dashboardEntryView];
 if(smPages.has(destination))smShowPage(destination);
 else smRestoreView(destination);
}
