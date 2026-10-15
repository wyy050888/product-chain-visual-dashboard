// 集中摆放已有筛选节点，保留 ID、事件处理器及各模块的独立统计周期。
function attachFilterField(extras,id,title){
  const select=$('#'+id);
  if(!select)return;
  const multi=select.closest('.pf-multi');if(multi){if(multi.parentElement!==extras)extras.append(multi);return}
  let field=select.closest('.unified-filter-field');
  if(!field){
    field=document.createElement('label');
    field.className='unified-filter-field';
    const name=document.createElement('span');
    name.textContent=title;
    field.append(name,select);
  }
  if(field.parentElement!==extras)extras.append(field);
}
// 将字段名与原控件合并为一个可聚焦的视觉单元，不重建业务控件。
function groupFilterField(field,title){
  const control=field.querySelector('input,select');
  if(!control||control.type==='checkbox'||control.type==='radio')return;
  // 搜索复用独立输入框；字段名分栏只用于业务筛选。
  if(control.matches('input')&&(control.type==='search'||/搜索|名称|型号|SPU|关键字/.test(control.placeholder))){
    for(const node of [...field.childNodes]){
      if(node.nodeType===3||node.nodeType===1&&node.classList.contains('unified-field-name'))node.remove();
    }
    field.classList.add('unified-input-group','ui-search-field','ui-business-search');
    if(!control.hasAttribute('aria-label'))control.setAttribute('aria-label',title||'搜索');
    return;
  }
  if(field.classList.contains('unified-input-group'))return;
  const name=document.createElement('span');
  name.className='unified-field-name';
  if(title)name.textContent=title;
  else {
    const parts=[...field.childNodes].filter(node=>node!==control&&!node.contains?.(control));
    name.textContent=parts.map(node=>node.textContent).join('').trim();
    for(const node of parts)node.remove();
  }
  if(!name.textContent)return;
  field.prepend(name);
  field.classList.add('unified-input-group');
}
function decorateFilterFields(bar){
  for(const field of bar.querySelectorAll('label'))groupFilterField(field);
  pfMultiMount(bar);
  const search=bar.querySelector('.ui-search-field');
  if(search)groupFilterField(search,'项目搜索');
}
// 日期位于标题右侧，业务筛选独立排列，所有重置均在业务条件之后。
function headerTimeArea(section){
  const head=section.querySelector(':scope > .sectionhead');
  let area=head.querySelector(':scope > .module-header-time');
  if(!area){
    area=document.createElement('div');
    area.className='module-header-time';
    area.setAttribute('role','group');
    area.setAttribute('aria-label',moduleNames[section.id]+'时间筛选');
    head.querySelector('.titlegroup').after(area);
  }
  return area;
}
function moveFilterNode(node,parent){if(node&&node.parentElement!==parent)parent.append(node)}
function arrangeDashboardFilters(){
  for(const id of moduleIds){
    if(id==='ai')continue;
    const section=$('#'+id),bar=section.querySelector(':scope > .module-timebar');
    if(!bar)continue;
    bar.classList.add('unified-filter-bar');
    bar.setAttribute('role','group');
    bar.setAttribute('aria-label',moduleNames[id]+'筛选');
    const area=headerTimeArea(section);
    moveFilterNode($('#time-'+id),area);
    moveFilterNode($('#time-note-'+id),area);
    decorateFilterFields(area);
    // 项目全景使用独立两行筛选，保留旧节点供采购工作台的隔离克隆使用。
    if(id==='projects'&&section.classList.contains('pp-main')){bar.hidden=true;continue}
    if(!['new','projects'].includes(id)){bar.hidden=true;continue}
    bar.hidden=false;
    let extras=bar.querySelector('.unified-filter-extras');
    if(!extras){extras=document.createElement('div');extras.className='unified-filter-extras';bar.append(extras)}
    if(id==='new'){
      attachFilterField(section.querySelector('.titlegroup'),'newchain','');
      attachFilterField(section.querySelector('.titlegroup'),'newseason','');
      $('#newchain').setAttribute('aria-label','新品类目');
      $('#new-reset')?.remove();
      bar.hidden=true;
    }else {
      attachFilterField(extras,'projectchain','链群');
      attachFilterField(extras,'projecttype','项目类型');
      moveFilterNode($('#projectsearch')?.closest('.ui-search-field'),extras);
      moveFilterNode($('#project-reset'),extras);
      const search=$('#projectsearch')?.closest('.ui-search-field');if(search&&extras.firstElementChild!==search)extras.prepend(search);
    }
    decorateFilterFields(bar);
  }
  const aiFilters=$('#ai-inline-controls');
  if(aiFilters){
    aiFilters.classList.add('unified-filter-bar');
    aiFilters.setAttribute('role','group');
    aiFilters.setAttribute('aria-label','AI诊断筛选');
    const area=headerTimeArea($('#ai'));
    moveFilterNode(aiFilters.querySelector('.ai-time-main'),area);
    const labels=[...$('#ai-inline-details').querySelectorAll('.ap-tools label')].filter(label=>label.querySelector('select'));
    if(labels.length){
      let extras=aiFilters.querySelector('.unified-ai-extra-filters');
      if(!extras){extras=document.createElement('div');extras.className='unified-ai-extra-filters';aiFilters.append(extras)}
      for(const label of labels){label.classList.add('unified-filter-field');extras.append(label)}
    }
    const reset=aiFilters.querySelector('#ai-reset,[data-wf-reset]');
    if(reset&&aiFilters.lastElementChild!==reset)aiFilters.append(reset);
    if(reset?.id==='ai-reset')reset.onclick=()=>{
      aiView.chain=aiView.department=aiView.owner='全部';
      apState.season=apState.scope='all';apState.page=1;
      renderInlineAI();
    };
    decorateFilterFields(aiFilters);
    decorateFilterFields(area);
  }
}
// AI 每次重绘会重新绑定日期事件，先清除标题里的旧控件以避免重复 ID。
const filterLayoutRenderAI=renderInlineAI;
renderInlineAI=function(...args){
  $('#ai .module-header-time')?.replaceChildren();
  const result=filterLayoutRenderAI(...args);
  arrangeDashboardFilters();
  return result;
};
renderAI=renderInlineAI;
let filterLayoutScheduled=false;
const filterLayoutObserver=new MutationObserver(records=>{
  if(filterLayoutScheduled||!records.some(record=>record.addedNodes.length))return;
  if(records.every(record=>record.target.closest?.('.metric-help,.metric-tooltip,.portal-header')))return;
  filterLayoutScheduled=true;
  queueMicrotask(()=>{filterLayoutScheduled=false;arrangeDashboardFilters()});
});
filterLayoutObserver.observe($('.page'),{childList:true,subtree:true});
arrangeDashboardFilters();
