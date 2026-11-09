// 公共搜索外壳：复用原输入节点和事件，边框、图标与聚焦只由容器承担。
function uiMountSearchField(input,field=null){
 if(!input||!input.matches('input'))return null;
 if(!field){
  const parent=input.parentElement;
  field=parent?.matches('label,.ui-search-field,.unified-input-group')&&parent.querySelectorAll('input,select,textarea').length===1?parent:null;
 }
 if(!field){field=document.createElement('span');field.dataset.uiSearchShell='';input.before(field);field.append(input)}
 field.classList.add('ui-search-field','unified-input-group');
 input.classList.add('ui-search-input');
 if(!input.hasAttribute('aria-label'))input.setAttribute('aria-label',input.placeholder||'搜索');
 return field;
}
function uiNormalizeSearchFields(root){
 const selector='input[type="search"],.ui-search-field>input,.kpm-search>input,.up-todo-search>input';
 const inputs=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
 for(const input of inputs)uiMountSearchField(input);
}
