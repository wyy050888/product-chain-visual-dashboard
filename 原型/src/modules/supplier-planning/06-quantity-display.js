// 供应商数量不带“家”；仅处理数字单位，保留“智能家居”“家用电器”等公司名称
function scpCleanCountText(text){return text.replace(/(\d+(?:\.\d+)?)\s*家/g,'$1').replace(/供应商家数/g,'供应商数量')}
function scpCleanQuantityUnits(){
 const scopes=[$('#suppliers'),$('#purchasing-view')];
 if(!$('#overlay').hidden&&(/供应商|寻源|资源池|类目储备/.test($('#dialogtitle').textContent)||$('#dialogbody .scp-drawer')))scopes.push($('#dialog'));
 for(const root of scopes.filter(Boolean)){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){const value=node.textContent,clean=value.trim()==='家'?'':scpCleanCountText(value);if(clean!==value)node.textContent=clean}
  for(const el of root.querySelectorAll('[aria-label],[title],[data-metric-rule]'))for(const attr of ['aria-label','title','data-metric-rule']){const value=el.getAttribute(attr);if(value&&value!==scpCleanCountText(value))el.setAttribute(attr,scpCleanCountText(value))}
 }
}
let scpUnitQueued=false;
new MutationObserver(records=>{
 if(scpUnitQueued||!records.some(record=>record.target.closest?.('#suppliers,#purchasing-view,#dialog')))return;
 scpUnitQueued=true;queueMicrotask(()=>{scpUnitQueued=false;scpCleanQuantityUnits()});
}).observe(document.body,{childList:true,subtree:true});
