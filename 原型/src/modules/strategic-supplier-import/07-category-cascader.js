// 类目只保存去重的三级身份；上级勾选和半选状态由子级选择派生。
function ssiCategoryBranchIds(path){return scpCategories.filter(row=>[row.category,row.group,row.name].slice(0,path.length).every((name,i)=>name===path[i])).map(row=>row.id)}
function ssiCategoryCheckSync(){
 const selected=new Set(ssiCategoryIds());
 for(const input of document.querySelectorAll('[data-ssi-category-check]')){
  const ids=ssiCategoryBranchIds(JSON.parse(input.dataset.ssiCategoryCheck)),count=ids.filter(id=>selected.has(id)).length;
  input.checked=ids.length>0&&count===ids.length;input.indeterminate=count>0&&count<ids.length;
 }
}
function ssiCategoryOptions(path=[]){
 const menu=$('.ssi-category-menu'),reference=scpCategoryReference;
 if(!menu.children.length)menu.innerHTML=[0,1,2].map(level=>`<section><div role="group" aria-label="${['一级类目','二级类目','三级类目'][level]}"></div></section>`).join('');
 const lists=[Object.keys(reference),Object.keys(reference[path[0]]||{}),reference[path[0]]?.[path[1]]||[]];
 lists.forEach((names,level)=>{
  const column=menu.children[level].firstElementChild,key=JSON.stringify(path.slice(0,level));
  // 浏览父级只更新下游列，保留鼠标下的复选框和焦点。
  if(column.dataset.branch!==key){
   column.dataset.branch=key;column.innerHTML=names.map((name,index)=>{
    const branch=path.slice(0,level).concat(name),id='ssi-category-'+level+'-'+index;
    return `<div class="ssi-category-option" data-ssi-category-level="${level}" data-ssi-category-name="${esc(name)}"><input type="checkbox" id="${id}" aria-label="选择${esc(name)}" data-ssi-category-check="${esc(JSON.stringify(branch))}">${level<2?`<button type="button" class="ssi-category-label" data-ssi-category-branch><span>${esc(name)}</span><span class="ssi-category-arrow" aria-hidden="true"></span></button>`:`<label class="ssi-category-label" for="${id}">${esc(name)}</label>`}</div>`;
   }).join('');
  }
  for(const option of column.children)option.classList.toggle('is-active',option.dataset.ssiCategoryName===path[level]);
 });
 $('#ssi-category-panel').dataset.path=JSON.stringify(path);ssiCategoryCheckSync();
}
function ssiCategoryPosition(){
 const panel=$('#ssi-category-panel'),anchor=$('[data-ssi-category-trigger]').getBoundingClientRect(),rect=panel.getBoundingClientRect(),left=Math.max(8,Math.min(anchor.left,innerWidth-rect.width-8)),below=anchor.bottom+rect.height+8<=innerHeight;
 panel.style.left=left+'px';panel.style.top=Math.max(8,below?anchor.bottom+8:anchor.top-rect.height-8)+'px';panel.dataset.placement=below?'bottom':'top';panel.style.setProperty('--ssi-category-arrow-left',Math.max(14,Math.min(rect.width-14,anchor.left+anchor.width/2-left))+'px');
}
function ssiCategoryBrowse(option){
 const panel=$('#ssi-category-panel'),level=Number(option.dataset.ssiCategoryLevel),current=JSON.parse(panel.dataset.path||'[]');
 if(level===2||current[level]===option.dataset.ssiCategoryName)return;
 const path=current.slice(0,level);path[level]=option.dataset.ssiCategoryName;
 if(level===0)path[1]=Object.keys(scpCategoryReference[path[0]]||{})[0];ssiCategoryOptions(path);
}
$('#ssi-page').addEventListener('click',event=>{
 const panel=$('#ssi-category-panel');
 if(event.target.closest('[data-ssi-category-clear]')){if(panel.matches(':popover-open'))panel.hidePopover();ssiViewState().category='all';ssiViewState().page=1;ssiSyncCatalogFilters();ssiRenderTable();$('[data-ssi-category-trigger]').focus({preventScroll:true});return}
 if(event.target.closest('[data-ssi-category-trigger]')){
  if(panel.matches(':popover-open')){panel.hidePopover();return}
  const selected=scpCategories.find(row=>ssiCategoryIds().includes(row.id)),first=selected||scpCategories[0];ssiCategoryOptions(first?[first.category,first.group,...(selected?[selected.name]:[])]:[]);panel.showPopover();ssiCategoryPosition();return;
 }
 const option=event.target.closest('[data-ssi-category-level]');if(option&&event.target.closest('[data-ssi-category-branch]'))ssiCategoryBrowse(option);
});
$('#ssi-category-panel').addEventListener('mouseover',event=>{const option=event.target.closest('[data-ssi-category-level]');if(option)ssiCategoryBrowse(option)});
$('#ssi-category-panel').addEventListener('change',event=>{
 const input=event.target.closest('[data-ssi-category-check]');if(!input)return;
 const ids=ssiCategoryBranchIds(JSON.parse(input.dataset.ssiCategoryCheck)),selected=new Set(ssiCategoryIds());for(const id of ids)input.checked?selected.add(id):selected.delete(id);
 ssiViewState().category=selected.size?[...selected]:'all';ssiViewState().page=1;ssiSyncCatalogFilters();ssiRenderTable();
});
$('#ssi-category-panel').addEventListener('toggle',event=>$('[data-ssi-category-trigger]').setAttribute('aria-expanded',String(event.newState==='open')));
