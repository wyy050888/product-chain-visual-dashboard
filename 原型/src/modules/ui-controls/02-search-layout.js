// 只调整既有业务筛选的视觉布局，原输入节点和业务事件保持不变。
const uiBusinessBars='.rp-list-tools,.life-products-filters,.dp-filter,.pb-filters,.cw-toolbar,.sw-controls,.ai-dimension-filters,.unified-filter-extras,.pf-tools';
function uiProductSearchMatch(record,query){
 const p=upIdentity(record);
 return [record.name,record.spuCode||p?.spuCode,record.model||p?.model].filter(Boolean).join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
function uiArrangeBusinessFilters(root){
 for(const bar of root.querySelectorAll(uiBusinessBars)){
  bar.classList.add('ui-business-filters');
  for(const input of bar.querySelectorAll(':scope > input')){
   if(input.type==='hidden'||input.type==='checkbox')continue;
   const field=document.createElement('label');input.before(field);field.append(input);
   groupFilterField(field,input.type==='search'||/搜索|名称|型号|SPU|关键字/.test(input.placeholder)?'搜索':'');
  }
  for(const field of bar.querySelectorAll(':scope > label'))groupFilterField(field);
  pfMultiMount(bar);
  const search=bar.querySelector('input[type="search"],input[placeholder*="搜索"],input[placeholder*="名称"],input[placeholder*="型号"],#projectsearch,#pdp-projectsearch');
  if(search){
   search.type='search';
   const field=search.closest('.unified-input-group,.ui-search-field')||search;
   field.classList.add('ui-business-search');
   if(bar.firstElementChild!==field)bar.prepend(field);
  }
 }
}
let uiBusinessLayoutScheduled=false;
const uiSearchNodes='input[type=search],.ui-search-field,.kpm-search,.up-todo-search';
const uiBusinessLayoutObserver=new MutationObserver(records=>{
 if(uiBusinessLayoutScheduled||!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches(uiBusinessBars+','+uiSearchNodes)||n.querySelector(uiBusinessBars+','+uiSearchNodes)))))return;
 uiBusinessLayoutScheduled=true;queueMicrotask(()=>{uiBusinessLayoutScheduled=false;uiArrangeBusinessFilters(document);uiNormalizeSearchFields(document)});
});
uiBusinessLayoutObserver.observe(document.body,{childList:true,subtree:true});
uiArrangeBusinessFilters(document);uiNormalizeSearchFields(document);
