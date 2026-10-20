// 三级类目为单选级联；父级选择覆盖其全部下级，节点路径保留唯一ID。
function scpCategoryPicker(state){
 const leaf=scpCategories.find(c=>c.id===state.leaf),text=leaf?leaf.path:state.category==='all'?'全部':[state.category,state.group==='all'?'':state.group].filter(Boolean).join(' / ');
 return `<details class="scp-category-picker"><summary class="unified-input-group" aria-label="合作类目筛选"><span class="unified-field-name">合作类目</span><span class="scp-category-value" title="${esc(text)}">${esc(text)}</span><i aria-hidden="true"></i>${state.category!=='all'?'<button type="button" class="scp-category-clear" data-scp-category-clear aria-label="清除合作类目">×</button>':''}</summary><div class="scp-category-menu">${scpCategoryMenu(state)}</div></details>`;
}
function scpCategoryMenu(state){
 const category=state.navCategory|| (state.category!=='all'?state.category:pfCategories[0]),groups=[...new Set(scpCategories.filter(c=>c.category===category).map(c=>c.group))],group=groups.includes(state.navGroup)?state.navGroup:state.category===category&&groups.includes(state.group)?state.group:groups[0];
 state.navCategory=category;state.navGroup=group;
 const row=(level,value,label,selected,branch=false)=>`<div class="scp-category-option ${branch&&((level===1&&value===category)||(level===2&&value===group))?'active':''}"><input type="radio" name="scp-cooperation-category" data-scp-category-level="${level}" value="${esc(value)}" aria-label="${esc(label)}" ${selected?'checked':''}><button type="button" ${branch?`data-scp-category-branch="${level}"`:'data-scp-category-leaf'} data-value="${esc(value)}"><span>${esc(label)}</span>${branch?'<i aria-hidden="true">›</i>':''}</button></div>`;
 return `<div class="scp-cascade-column" role="group" aria-label="一级类目"><button type="button" class="scp-category-all" data-scp-category-clear>全部类目</button>${pfCategories.map(name=>row(1,name,name,state.category===name&&state.group==='all'&&state.leaf==='all',true)).join('')}</div><div class="scp-cascade-column" role="group" aria-label="二级类目">${groups.map(name=>row(2,name,name,state.category===category&&state.group===name&&state.leaf==='all',true)).join('')}</div><div class="scp-cascade-column" role="group" aria-label="三级类目">${scpCategories.filter(c=>c.category===category&&c.group===group).map(c=>row(3,c.id,c.name,state.leaf===c.id)).join('')}</div>`;
}
function scpCategoryApply(state,level,value){
 if(level===1)Object.assign(state,{category:value,group:'all',leaf:'all',navCategory:value,navGroup:''});
 else if(level===2)Object.assign(state,{category:state.navCategory,group:value,leaf:'all',navGroup:value});
 else{const c=scpCategories.find(c=>c.id===value);if(c)Object.assign(state,{category:c.category,group:c.group,leaf:c.id,navCategory:c.category,navGroup:c.group})}
 state.page=1;state.scrollTop=0;
}
function scpCategoryBrowse(state,button){
 if(button.dataset.scpCategoryBranch==='1'){if(state.navCategory===button.dataset.value)return;state.navCategory=button.dataset.value;state.navGroup=''}
 else{if(state.navGroup===button.dataset.value)return;state.navGroup=button.dataset.value}
 const focus=document.activeElement===button,menu=button.closest('.scp-category-menu'),level=button.dataset.scpCategoryBranch,value=button.dataset.value;menu.innerHTML=scpCategoryMenu(state);
 if(focus)[...menu.querySelectorAll('[data-scp-category-branch]')].find(node=>node.dataset.scpCategoryBranch===level&&node.dataset.value===value)?.focus({preventScroll:true});
}
document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.scp-category-picker[open]'))if(!event.composedPath().includes(menu))menu.open=false});
window.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const menu=document.querySelector('.scp-category-picker[open]');if(menu){menu.open=false;menu.querySelector('summary').focus();event.preventDefault();event.stopImmediatePropagation()}},true);
