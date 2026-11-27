// HTML入口只选择工作区；业务数据和组件继续复用同一份源代码。
const dashboardEntryView=document.documentElement.dataset.dashboardView||'director';
const dashboardEntryRoutes={director:'#dashboard',product:'#department',project:'#project-department',quality:'#quality-department',research:'#rd-department',procurement:'#procurement'};
let qualityEntryView;
function showQualityEntry(){
 qcMountWorkspace();
}
function initializeDashboardEntry(){
 for(const entry of dashboardPages){
  const button=dpNavButtons[entry.menu];
  button.disabled=false;button.removeAttribute('title');
  button.onclick=()=>location.assign(entry.file);
 }
 const destination=location.hash||dashboardEntryRoutes[dashboardEntryView];
 if(smPages.has(destination))smShowPage(destination);
 else smRestoreView(destination,false);
}
