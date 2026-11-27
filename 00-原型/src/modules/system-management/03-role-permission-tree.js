function rmOptions(options,value){
 return options.map(([key,label])=>`<option value="${esc(key)}"${value===key?' selected':''}>${esc(label)}</option>`).join('');
}
function rmCheckbox(markup,attrs='',checked=false){
 return `<label><input type="checkbox" ${attrs}${checked?' checked':''}> ${esc(markup)}</label>`;
}
function rmPermissionHelp(label,text){
 return `<button type="button" class="metric-help" aria-label="查看${esc(label)}说明" data-rm-help-base="${esc(text)}" data-metric-rule="${esc(text)}"></button>`;
}
function rmOriginalMenuMarkup(id,label,children,checked){
 const checkbox=rmCheckbox(label,`data-rm-menu="${esc(id)}"`,checked.has(id));
 if(!children.length)return `<div class="rm-tree-leaf">${checkbox}</div>`;
 const branches=children.map(item=>{
  const [name,items]=Array.isArray(item)?item:[item,[]];
  return rmOriginalMenuMarkup(id+'/'+name,name,items,checked);
 }).join('');
 return `<details data-rm-tree-node data-rm-menu-group><summary>${checkbox}</summary><div class="rm-tree-children">${branches}</div></details>`;
}
function rmRoleTreeMarkup(role){
 const checked=new Set(role.menus||[]);
 const roots=rmOriginalMenus.map(([id,label,children])=>rmOriginalMenuMarkup(id,label,children,checked)).join('');
 const activeBoard=rmBoards.find(board=>role.dashboards[board.id].modules.length)||rmBoards[0];
 return `<section class="rm-permission-field" aria-labelledby="rm-permission-title" data-rm-permission-tree>
  <h4 id="rm-permission-title" class="rm-permission-title">权限配置</h4>
  <header class="rm-permission-header">
   <div class="rm-permission-tabs" role="tablist" aria-label="权限配置" data-rm-tabs>
    <button type="button" role="tab" id="rm-menu-tab" aria-controls="rm-menu-panel" aria-selected="true" tabindex="0">菜单权限</button>
    <button type="button" role="tab" id="rm-dashboard-tab" aria-controls="rm-dashboard-panel" aria-selected="false" tabindex="-1">产品链看板</button>
   </div>
   <div class="rm-tree-toolbar">
    <span class="rm-menu-tree-controls">
     ${rmCheckbox('父子联动','data-rm-link',role.menuLink!==false)}
     ${rmCheckbox('展开/折叠全部','data-rm-expand-all')}
    </span>
    <span class="rm-board-tree-controls">${rmCheckbox('展开/折叠全部','data-rm-expand-board',true)}</span>
    ${rmCheckbox('全选/清除全选','data-rm-all')}
   </div>
  </header>
  <div class="rm-permission-panel" id="rm-menu-panel" role="tabpanel" aria-labelledby="rm-menu-tab">
   <div class="rm-menu-tree">${roots}</div>
  </div>
  <div class="rm-permission-panel" id="rm-dashboard-panel" role="tabpanel" aria-labelledby="rm-dashboard-tab" hidden>
   <div class="rm-board-tabs" role="tablist" aria-label="产品链看板" data-rm-tabs>
    ${rmBoards.map(({id,name})=>`<button type="button" role="tab" id="rm-board-tab-${id}" aria-controls="rm-board-${id}" aria-label="${name}" aria-describedby="rm-board-state-${id}" aria-selected="${id===activeBoard.id}" tabindex="${id===activeBoard.id?0:-1}">
     ${name}<span id="rm-board-state-${id}" class="rm-board-state"></span>
    </button>`).join('')}
   </div>
   ${rmBoards.map(board=>rmBoardTreeMarkup(board,role.dashboards[board.id],board===activeBoard)).join('')}
  </div>
 </section>`;
}
function rmBoardTreeMarkup(board,access,active){
 const rows=rmBoardModuleEntries(board.modules).map(({item,parents})=>rmPermissionRow(board,item,access,parents));
 return `<div class="rm-board-panel" id="rm-board-${board.id}" role="tabpanel" aria-labelledby="rm-board-tab-${board.id}" data-rm-board="${board.id}"${active?'':' hidden'}>
  <table class="rm-board-table" aria-label="${board.name}权限树">
   <thead><tr><th scope="col">权限项</th><th scope="col">数据范围
    ${rmPermissionHelp('数据范围','数据范围决定用户在可见模块中能查看哪些数据。按部门配置时，只能查看已选部门的数据。选择「按用户关联链群」时，只能查看该用户在「链群配置」中关联的链群数据。')}
   </th></tr></thead><tbody>${rows.join('')}</tbody>
  </table>
 </div>`;
}
function rmPermissionRow(board,item,access,parents){
 const help=item.note?rmPermissionHelp(item.name,item.note+'。'):'';
 const fold=item.children?`<button type="button" class="rm-board-fold" data-rm-board-fold="${item.id}" aria-label="${esc(item.name)}" aria-expanded="true" aria-controls="${rmBoardModuleEntries(item.children).map(({item:child})=>`rm-${board.id}-row-${child.id}`).join(' ')}"></button>`:'';
 const toggleLabel=item.type==='brand'?'显示下钻':item.type?item.name+'可见':'全选'+item.name+'模块';
 const toggleKind=item.type?`data-rm-module-toggle="${item.id}"`:'data-rm-group-toggle';
 const lineage=parents.length?` data-rm-parent="${parents.at(-1)}" data-rm-ancestors="${parents.join(' ')}" style="--rm-node-depth:${parents.length}"`:'';
 return `<tr id="rm-${board.id}-row-${item.id}" data-rm-module="${item.id}"${lineage}>
  <th scope="row"><div class="rm-permission-name">${fold}<label><input type="checkbox" ${toggleKind} aria-label="${esc(toggleLabel)}"><span>${esc(item.name)}</span></label>${help}</div></th>
  <td>${rmPermissionSetting(board,item,access)}</td>
 </tr>`;
}
function rmPermissionSetting(board,item,access){
 const label=board.name+' · '+item.name;
 if(item.type==='report'){
  const reports=board.department?rmDepartmentReportNames:rmReportNames;
  const options=reports.map(name=>[name,name==='产品链总周报'?name:name.replace(/周报$/,'')]);
  return rmDepartmentPicker(board.id+'-reports',label,options,access.reportScope,'data-rm-report-scope');
 }
 if(item.type==='department')return rmDepartmentSetting(board,item,access,label);
 if(item.type==='department-picker'){
  const options=item.departmentOptions();
  const saved=access.departments[item.id];
  const previous=access.scopes[item.id]==='full'?options.map(([id])=>id):[];
  const selected=saved?Object.keys(saved):previous;
  return rmDepartmentPicker(board.id+'-'+item.id,label,options,selected,'data-rm-department-grants');
 }
 if(!item.type||item.type==='shared'||item.type==='brand')return '';
 return rmChainSelect(label,`data-rm-scope="${esc(item.id)}"`,access.scopes[item.id]||'chain');
}
function rmDepartmentPicker(id,label,options,selected,attrs=''){
 const popupId='rm-departments-'+id;
 return `<div class="pf-multi rm-department-picker" data-rm-picker ${attrs}>
  <button type="button" class="rm-department-trigger" popovertarget="${popupId}" aria-label="${esc(label)}部门" aria-describedby="${popupId}-value" data-rm-picker-trigger>
   <span class="rm-scope-label">部门</span><span class="pf-multi-value" id="${popupId}-value" data-rm-picker-value></span><i class="ui-dropdown-icon" aria-hidden="true"></i>
  </button>
  <div class="pf-multi-menu rm-department-options" id="${popupId}" popover="auto" role="group" aria-label="${esc(label)}部门选项">
   <label class="pf-multi-option">${rmPickerCheckbox('全部','data-rm-picker-all')}</label>
   ${options.map(([value,name])=>`<label class="pf-multi-option">${rmPickerCheckbox(name,`value="${esc(value)}" data-rm-picker-option`,selected.includes(value))}</label>`).join('')}
  </div>
 </div>`;
}
function rmPickerCheckbox(label,attrs,checked=false){
 return `<input type="checkbox" ${attrs}${checked?' checked':''}><span>${esc(label)}</span>`;
}
function rmDepartmentSetting(board,item,access,label){
 const departments=access.departments[item.id]||{};
 const field=rmDepartmentPicker(board.id+'-'+item.id,label,rmDepartmentNames.map(name=>[name,name]),Object.keys(departments));
 const emptyScope='<option value="" hidden data-rm-scope-placeholder>请先选择部门</option>';
 return `<div class="rm-dept-fields" data-rm-dept-editor="${item.id}">${field}
  ${rmChainSelect(label,'data-rm-dept-chain','chain',emptyScope)}
 </div>`;
}
function rmChainSelect(label,attrs,scope,placeholder=''){
 return `<label class="rm-scope-select"><span class="rm-scope-label">链群</span><select ${attrs} aria-label="${esc(label)}链群">${placeholder}${rmOptions(rmChainScopes,scope)}</select></label>`;
}

function rmSelectedDepartments(field){
 return [...field.querySelectorAll('[data-rm-picker-option]:checked')].map(input=>input.value);
}
function rmSyncDepartmentPicker(picker){
 const options=[...picker.querySelectorAll('[data-rm-picker-option]')];
 const selected=options.filter(input=>input.checked);
 const all=picker.querySelector('[data-rm-picker-all]');
 all.checked=selected.length===options.length;
 all.indeterminate=!all.checked&&selected.length>0;
 const value=picker.querySelector('[data-rm-picker-value]');
 value.textContent=all.checked?'全部':selected.map(input=>input.nextElementSibling.textContent).join('、')||'请选择部门';
 value.title=value.textContent;
}
function rmBindDepartmentPopups(form){
 const body=form.querySelector('.rm-dialog-body');
 const toolbar=form.querySelector('.rm-permission-header');
 const openPopup=()=>form.querySelector('.rm-department-options:popover-open');
 const position=()=>{
  const popup=openPopup();
  if(!popup)return;
  const anchor=popup.previousElementSibling.getBoundingClientRect();
  const bounds=body.getBoundingClientRect();
  const visibleTop=Math.max(bounds.top,toolbar.getBoundingClientRect().bottom);
  if(anchor.bottom<=visibleTop||anchor.top>bounds.bottom){popup.hidePopover();return}
  const width=Math.min(Math.max(154,anchor.width),innerWidth-20);
  popup.style.width=width+'px';
  const below=bounds.bottom-anchor.bottom-8,above=anchor.top-visibleTop-8;
  const openBelow=below>=popup.scrollHeight+2||below>=above;
  popup.style.maxHeight=Math.min(330,Math.max(10,openBelow?below:above))+'px';
  popup.style.left=Math.max(10,Math.min(anchor.left,innerWidth-width-10))+'px';
  popup.style.top=(openBelow?anchor.bottom+4:anchor.top-popup.offsetHeight-4)+'px';
 };
 for(const trigger of form.querySelectorAll('[data-rm-picker-trigger]'))trigger.addEventListener('click',event=>{
  event.preventDefault();
  const popup=trigger.nextElementSibling;
  if(popup.matches(':popover-open')){popup.hidePopover();return}
  // 同一次点击内完成显示和定位，避免等到 toggle 时才摆正下拉。
  popup.showPopover({source:trigger});
  position();
 });
 body.addEventListener('scroll',position);
 const observer=new ResizeObserver(()=>{
  body.style.scrollPaddingTop=toolbar.offsetHeight+'px';
  position();
 });
 observer.observe(body);
 observer.observe(toolbar);
 form.closest('dialog').addEventListener('close',()=>observer.disconnect(),{once:true});
 form.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const popup=openPopup();
  if(!popup)return;
  event.preventDefault();event.stopPropagation();
  popup.hidePopover();popup.previousElementSibling.focus({preventScroll:true});
 },true);
}
function rmSyncBoardTree(pane,access){
 const modules=new Set(access.modules);
 const hasLifecycle=modules.has('lifecycle');
 for(const toggle of pane.querySelectorAll('[data-rm-module-toggle]')){
  const id=toggle.dataset.rmModuleToggle;
  toggle.checked=modules.has(id);
  toggle.disabled=id==='brand'&&!hasLifecycle;
  const settings=toggle.closest('th').nextElementSibling;
  for(const control of settings.querySelectorAll('select,input,[data-rm-picker-trigger]'))control.disabled=!toggle.checked;
  if(!toggle.checked)settings.querySelector(':popover-open')?.hidePopover();
 }
 for(const toggle of pane.querySelectorAll('[data-rm-group-toggle]')){
  rmSyncCheckboxGroup(toggle,rmGroupModuleChecks(pane,toggle));
 }
 const state=pane.parentElement.querySelector(`#rm-board-state-${pane.dataset.rmBoard}`);
 const granted=access.modules.some(id=>id!=='brand'||hasLifecycle);
 state.textContent=granted?'已授权':'未授权';
 state.classList.toggle('is-granted',granted);
 for(const picker of pane.querySelectorAll('[data-rm-picker]'))rmSyncDepartmentPicker(picker);
 for(const field of pane.querySelectorAll('[data-rm-dept-editor]')){
  const grants=access.departments[field.dataset.rmDeptEditor]||{};
  const departments=rmSelectedDepartments(field);
  const chain=field.querySelector('[data-rm-dept-chain]');
  const scopes=new Set(departments.map(name=>grants[name]||'chain'));
  const placeholder=chain.querySelector('[data-rm-scope-placeholder]');
  if(placeholder)placeholder.textContent=departments.length?'范围不一致':'请先选择部门';
  chain.disabled=!modules.has(field.dataset.rmDeptEditor)||!departments.length;
  chain.value=scopes.size===1?[...scopes][0]:'';
 }
}
function rmGroupModuleChecks(pane,toggle){
 const group=toggle.closest('tr').dataset.rmModule;
 return pane.querySelectorAll(`[data-rm-ancestors~="${group}"] [data-rm-module-toggle]`);
}
function rmSetModuleChecks(pane,access,checks,checked){
 const board=rmBoards.find(item=>item.id===pane.dataset.rmBoard);
 const items=rmDashboardItems(board);
 const modules=new Set(access.modules);
 for(const check of checks){
  const id=check.dataset.rmModuleToggle;
  if(!checked){modules.delete(id);continue}
  modules.add(id);
  const item=items.find(item=>item.id===id);
  if(item.type==='chain')access.scopes[id]??='chain';
  if(item.type==='shared')access.scopes[id]='full';
 }
 access.modules=[...modules];
}
function rmSyncCheckboxGroup(toggle,checks){
 const selected=Array.from(checks).filter(check=>check.checked).length;
 toggle.checked=selected===checks.length;
 toggle.indeterminate=selected>0&&!toggle.checked;
}
function rmChangeBoardPermission(pane,access,target){
 if(target.matches('[data-rm-module-toggle]'))rmSetModuleChecks(pane,access,[target],target.checked);
 if(target.matches('[data-rm-group-toggle]'))rmSetModuleChecks(pane,access,rmGroupModuleChecks(pane,target),target.checked);
 if(target.matches('[data-rm-scope]'))access.scopes[target.dataset.rmScope]=target.value;
 const picker=target.closest('[data-rm-picker]');
 if(picker){
  if(target.matches('[data-rm-picker-all]')){
   for(const option of picker.querySelectorAll('[data-rm-picker-option]'))option.checked=target.checked;
  }
  const module=picker.closest('[data-rm-module]').dataset.rmModule;
  if(picker.hasAttribute('data-rm-report-scope'))access.reportScope=rmSelectedDepartments(picker);
  if(picker.closest('[data-rm-dept-editor]')){
   const grants=access.departments[module]||{};
   access.departments[module]=Object.fromEntries(rmSelectedDepartments(picker).map(name=>[name,grants[name]||'chain']));
  }
  if(picker.hasAttribute('data-rm-department-grants')){
   access.departments[module]=rmDepartmentGrants(rmSelectedDepartments(picker));
   delete access.scopes[module];
  }
 }
 if(target.matches('[data-rm-dept-chain]')){
  const field=target.closest('[data-rm-dept-editor]');
  const grants=access.departments[field.dataset.rmDeptEditor]??={};
  for(const department of rmSelectedDepartments(field))grants[department]=target.value;
 }
 rmSyncBoardTree(pane,access);
}
function rmSyncMenuChecks(tree,linked){
 for(const group of Array.from(tree.querySelectorAll('[data-rm-menu-group]')).reverse()){
  const [parent,...children]=group.querySelectorAll('[data-rm-menu]');
  const count=children.filter(input=>input.checked).length;
  if(linked)parent.checked=count===children.length;
  parent.indeterminate=linked&&count>0&&count<children.length;
 }
}
function rmSyncBoardRowVisibility(board){
 const collapsed=new Set([...board.querySelectorAll('[data-rm-board-fold][aria-expanded="false"]')].map(button=>button.dataset.rmBoardFold));
 for(const row of board.querySelectorAll('[data-rm-ancestors]')){
  row.hidden=row.dataset.rmAncestors.split(' ').some(id=>collapsed.has(id));
  if(row.hidden)row.querySelector(':popover-open')?.hidePopover();
 }
}
function rmBindRoleTree(form,role){
 const tree=form.querySelector('[data-rm-permission-tree]');
 const linked=tree.querySelector('[data-rm-link]');
 const boards=Array.from(tree.querySelectorAll('[data-rm-board]'));
 const expandBoard=tree.querySelector('[data-rm-expand-board]');
 const master=tree.querySelector('[data-rm-all]');
 const activeBoard=()=>boards.find(board=>!board.hidden);
 const menuActive=()=>!tree.querySelector('#rm-menu-panel').hidden;
 const activeChecks=()=>menuActive()?tree.querySelectorAll('[data-rm-menu]'):activeBoard().querySelectorAll('[data-rm-module-toggle]');
 const syncBulk=()=>rmSyncCheckboxGroup(master,activeChecks());
 const activeGroups=()=>[...activeBoard().querySelectorAll('[data-rm-board-fold]')];
 const syncBoardExpand=()=>{
  const groups=activeGroups(),expanded=groups.filter(button=>button.getAttribute('aria-expanded')==='true').length;
  expandBoard.checked=expanded===groups.length;
  expandBoard.indeterminate=expanded>0&&!expandBoard.checked;
 };
 rmBindDepartmentPopups(form);
 for(const tabList of tree.querySelectorAll('[data-rm-tabs]'))smBindTabs(tree,tabList,()=>{syncBoardExpand();syncBulk()});
 const syncBoards=()=>boards.forEach(pane=>rmSyncBoardTree(pane,role.dashboards[pane.dataset.rmBoard]));
 tree.addEventListener('click',event=>{
  const fold=event.target.closest('[data-rm-board-fold]');
  if(!fold)return;
  fold.setAttribute('aria-expanded',String(fold.getAttribute('aria-expanded')==='false'));
  rmSyncBoardRowVisibility(fold.closest('[data-rm-board]'));
  syncBoardExpand();
 });
 tree.addEventListener('change',({target})=>{
  if(target.matches('[data-rm-expand-all]')){
   for(const node of tree.querySelectorAll('[data-rm-tree-node]'))node.open=target.checked;
   return;
  }
  if(target===expandBoard){
   for(const button of activeGroups())button.setAttribute('aria-expanded',String(target.checked));
   rmSyncBoardRowVisibility(activeBoard());
   syncBoardExpand();
   return;
  }
  if(target===master){
   if(menuActive()){
    for(const input of activeChecks())input.checked=target.checked;
   }else{
    const pane=activeBoard(),access=role.dashboards[pane.dataset.rmBoard];
    rmSetModuleChecks(pane,access,activeChecks(),target.checked);
    rmSyncBoardTree(pane,access);
   }
  }
  if(linked.checked&&target.matches('[data-rm-menu-group] > summary input')){
   const [, ...children]=target.closest('[data-rm-menu-group]').querySelectorAll('[data-rm-menu]');
   for(const child of children)child.checked=target.checked;
  }
  const board=target.closest('[data-rm-board]');
  if(board)rmChangeBoardPermission(board,role.dashboards[board.dataset.rmBoard],target);
  role.menuLink=linked.checked;
  rmSyncMenuChecks(tree,linked.checked);
  role.menus=Array.from(tree.querySelectorAll('[data-rm-menu]:checked'),input=>input.dataset.rmMenu);
  syncBulk();
 });
 syncBoards();rmSyncMenuChecks(tree,linked.checked);syncBulk();
}
