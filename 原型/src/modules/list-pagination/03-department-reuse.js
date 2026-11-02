// 部门通过 innerHTML 复用模块，原节点的事件不会被复制；页长与翻页使用各自的重绘入口。
function listReusePage(module,state,refresh,page,key){
 if(state)state.page=page;
 if(key==='gd-pager')gdState.pages[gdState.part+'|'+gdState.tabs[gdState.part]]=page;
 if(key==='wf-records')wfState.page=page;
 if(key==='pp-projects')ppState.page=page;
 if(key==='pp-analysis')ppAnalysisState.page=page;
 if(key==='department-projects')pdpState.departmentPage=page;
 refresh(module);
}
const listDxRender=dxRender;
dxRender=function(module){return listWithPageScope('department-'+dwActive+'-'+module,
 (page,key)=>listReusePage(module,dxStates[module],dxRefresh,page,key),()=>listDxRender(module))};
const listPpRender=ppRenderProductModule;
ppRenderProductModule=function(module){return listWithPageScope('procurement-'+module,
 (page,key)=>listReusePage(module,ppStates[module],ppRefresh,page,key),()=>listPpRender(module))};
const listPdpRender=pdpRender;
pdpRender=function(){return listWithPageScope('procurement-projects',
 (page,key)=>listReusePage('projects',pdpState,pdpRefresh,page,key),()=>listPdpRender())};
pbRenderers.projects=pdpRender;
function listReuseHandler(nav){return nav&&!nav.listOnPage?listPageReuseHandlers.get(nav.dataset.listSizeKey):null}
document.addEventListener('click',e=>{
 const button=e.target.closest('.list-pagination [data-list-page]');if(!button||button.disabled)return;
 const nav=button.closest('.list-pagination'),onPage=listReuseHandler(nav);if(!onPage)return;
 e.preventDefault();e.stopPropagation();const page=Number(button.dataset.listPage);
 if(page!==Number(nav.dataset.listCurrent))listNavigate(nav,page,onPage);
},true);
function listReuseJump(e){
 if(!e.target.matches('.list-page-jump input')||(e.type==='keydown'&&e.key!=='Enter'))return;
 const nav=e.target.closest('.list-pagination'),onPage=listReuseHandler(nav);if(!onPage)return;
 e.preventDefault();e.stopPropagation();listJump(nav,e.target,onPage);
}
document.addEventListener('change',listReuseJump,true);
document.addEventListener('keydown',listReuseJump,true);
