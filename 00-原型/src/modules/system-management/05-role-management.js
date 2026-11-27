// 角色管理复用系统管理导航，单独登记角色列表和编辑操作。
const rmRoleRoute='#system-roles',rmPagerKey='system-roles';
const rmListHeaders=['角色编号','角色名称','权限字符','显示顺序','状态','创建时间'];
let rmPageNumber=1,rmFilters={};
const rmRolePage=smRegisterPage({
 route:rmRoleRoute,id:'system-role-page',title:'角色管理',onShow:rmRenderRoles,
 markup:`<header class="lt-page-head"><h2 class="sm-page-title">角色管理</h2></header>
  <section class="lt-panel">
   <div class="rm-search-view"><form id="rm-filter">
    <label class="rm-search-item"><span>角色名称</span><input name="name" type="text" placeholder="请输入"></label>
    <label class="rm-search-item"><span>权限字符</span><input name="code" type="text" placeholder="请输入"></label>
    <label class="rm-search-item"><span>状态</span><select name="status">${rmOptions([['','请选择'],...rmRoleStatus],'')}</select></label>
    <div class="rm-search-item rm-search-dates">
     <span>创建时间</span><input name="start" type="date" aria-label="创建开始日期"><span aria-hidden="true">~</span><input name="end" type="date" aria-label="创建结束日期">
    </div>
    <button type="reset" class="rm-button rm-button-reset">重置</button>
   </form></div>
   <div class="rm-table-content"><div class="rm-list-actions"><button type="button" class="rm-button" data-rm-new><span aria-hidden="true">＋</span> 新增</button>
    ${smDataAction('export','导出','data-rm-export')}</div>
    <div class="tablewrap" id="rm-list"></div><div id="rm-pager"></div>
   </div>
  </section>`
});

function rmVisibleRoles(roles){
 const contains=(value,query)=>!query||value.toLowerCase().includes(query.toLowerCase());
 return roles.filter(role=>contains(role.name,rmFilters.name)&&contains(role.code,rmFilters.code)&&
  (!rmFilters.status||role.status===rmFilters.status)&&(!rmFilters.start||role.created.slice(0,10)>=rmFilters.start)&&
  (!rmFilters.end||role.created.slice(0,10)<=rmFilters.end)).sort((a,b)=>a.order-b.order||a.id-b.id);
}
function rmListValues(role){return [role.id,role.name,role.code,role.order,role.status==='enabled'?'正常':'停用',role.created]}
function rmRowActions(role){
 return `<div class="rm-row-actions"><button type="button" class="link" data-rm-edit="${role.id}">修改</button>
  <button type="button" class="link" data-rm-delete="${role.id}">删除</button>
  <button type="button" class="link" popovertarget="rm-more-${role.id}">更多<span aria-hidden="true">»</span></button>
  <div class="rm-more-menu" id="rm-more-${role.id}" popover>
   <button type="button" class="link" data-rm-data="${role.id}">数据权限</button>
   <button type="button" class="link" data-rm-users="${role.id}">分配用户</button>
  </div></div>`;
}
function rmRoleCells(role){
 const values=rmListValues(role).map(esc);
 values[4]=`<button type="button" class="rm-status-switch" role="switch" aria-label="${esc(role.name)}状态" aria-checked="${role.status==='enabled'}" data-rm-status="${role.id}"></button>`;
 values[5]=`<time data-date-raw>${values[5]}</time>`;
 return [...values,rmRowActions(role)];
}
function rmRenderRoles(){
 const rows=rmVisibleRoles(rmReadRoles().roles),size=listPageSize(rmPagerKey,10);
 rmPageNumber=Math.max(1,Math.min(rmPageNumber,Math.ceil(rows.length/size)));
 const visible=rows.slice((rmPageNumber-1)*size,rmPageNumber*size);
 $('#rm-list').innerHTML=table([...rmListHeaders,'操作'],visible.map(rmRoleCells),'rm-role-table');
 const pager=$('#rm-pager');pager.innerHTML=listPager(rows.length,rmPageNumber,size);
 bindListPager(pager,page=>{rmPageNumber=page;rmRenderRoles()},rmPagerKey);
}

function rmShowDialog(title,body,onSubmit,{submitLabel='提交',editor=false,onSaved=rmRenderRoles,successMessage=submitLabel==='删除'?'已删除本地角色':'已保存本地角色'}={}){
 const dialog=document.createElement('dialog');dialog.className=editor?'rm-role-dialog rm-role-editor':'rm-role-dialog';dialog.setAttribute('aria-labelledby','rm-dialog-title');
 dialog.innerHTML=`<header><h3 id="rm-dialog-title">${esc(title)}</h3><button type="button" class="iconbtn" data-rm-cancel aria-label="关闭此对话框">×</button></header>
  <form><div class="rm-dialog-body">${body}</div>
  <footer><p class="rm-dialog-error" role="alert"></p><div class="rm-dialog-actions"><button type="button" class="rm-button rm-button-reset" data-rm-cancel>取消</button><button type="submit" class="rm-button rm-button-primary">${esc(submitLabel)}</button></div></footer></form>`;
 const form=dialog.querySelector('form'),errorMessage=form.querySelector('[role="alert"]');
 for(const button of dialog.querySelectorAll('[data-rm-cancel]'))button.onclick=()=>dialog.close();
 form.addEventListener('input',()=>{errorMessage.textContent=''});
 form.onsubmit=event=>{
  event.preventDefault();
  try{onSubmit(new FormData(form));dialog.close();onSaved();toast(successMessage)}
  catch(error){errorMessage.textContent=error.message||'保存失败，请检查浏览器存储'}
 };
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 document.body.append(dialog);dialog.showModal();return form;
}
function rmEditRole(snapshot,source){
 const role=structuredClone(source||rmNewRole());
 const form=rmShowDialog(source?'修改角色':'新增角色',`<div class="rm-editor-fields">
   <label class="rm-dialog-field"><span>角色名称<span class="rm-required" aria-hidden="true">*</span></span><input name="name" aria-label="角色名称" required value="${esc(role.name)}"></label>
   <label class="rm-dialog-field"><span>权限字符<span class="rm-required" aria-hidden="true">*</span></span><input name="code" aria-label="权限字符" required value="${esc(role.code)}"></label>
   <label class="rm-dialog-field"><span>角色顺序<span class="rm-required" aria-hidden="true">*</span></span><input name="order" aria-label="角色顺序" type="number" min="0" required value="${role.order}"></label>
   <div class="rm-dialog-field" role="group" aria-labelledby="rm-status-label"><span id="rm-status-label">状态</span><div class="rm-role-radios">${rmRoleStatus.map(([value,label])=>`<label><input type="radio" name="status" value="${value}"${role.status===value?' checked':''}> ${label}</label>`).join('')}</div></div>
  </div>${rmRoleTreeMarkup(role)}
  <label class="rm-dialog-field rm-remark-field"><span>备注</span><span class="rm-remark-control"><textarea name="remark" aria-label="备注" maxlength="500">${esc(role.remark)}</textarea><output data-rm-remark-count></output></span></label>`,fields=>{
   const name=fields.get('name').trim(),code=fields.get('code').trim();
   if(!name)throw Error('请输入角色名称');
   if(!code)throw Error('请输入权限字符');
   rmSaveRole(snapshot,{...role,name,code,order:Number(fields.get('order')),status:fields.get('status'),remark:fields.get('remark').trim()});
  },{submitLabel:'保存',editor:true});
 rmBindRoleTree(form,role);
 const remark=form.elements.remark,count=form.querySelector('[data-rm-remark-count]');
 const countRemark=()=>{count.textContent=remark.value.length+' / 500'};
 remark.addEventListener('input',countRemark);countRemark();
}
function rmAssignData(snapshot,role){
 const form=rmShowDialog('分配数据权限',`<div class="rm-editor-fields">
   <label class="rm-dialog-field"><span>角色名称</span><input value="${esc(role.name)}" disabled></label>
   <label class="rm-dialog-field"><span>权限字符</span><input value="${esc(role.code)}" disabled></label>
   <label class="rm-dialog-field"><span>权限范围</span><select name="dataScope">${rmOptions(rmRoleDataScopes,role.dataScope)}</select></label>
  </div><fieldset data-rm-custom><legend>授权部门</legend><div class="inline">${rmDepartmentNames.map(name=>rmCheckbox(name,`name="departments" value="${esc(name)}"`,role.dataDepartments.includes(name))).join('')}</div></fieldset>`,fields=>{
   const dataScope=fields.get('dataScope');
   rmSaveRole(snapshot,{...role,dataScope,dataDepartments:dataScope==='custom'?fields.getAll('departments'):role.dataDepartments});
  });
 const scope=form.elements.dataScope,custom=form.querySelector('[data-rm-custom]');
 const sync=()=>{custom.hidden=scope.value!=='custom';custom.disabled=custom.hidden};
 scope.onchange=sync;sync();
}
function rmAssignUsers(snapshot,role){
 const accounts=rmSystemAccounts();
 const groups=[['product-center','产品中心'],['quality-center',qcDepartment]].map(([id,label])=>`<fieldset><legend>${label}人员</legend><div class="inline">
  ${accounts.filter(account=>account.id.startsWith(id+':')).map(account=>rmCheckbox(account.name,`name="users" value="${esc(account.id)}"`,rmRoleHasAccount(role,account))).join('')}
 </div></fieldset>`).join('');
 rmShowDialog('分配用户',`<p class="note">${esc(role.name)}</p>${groups}`,fields=>rmSaveRole(snapshot,{...role,users:fields.getAll('users')}));
}
function rmDeleteRole(snapshot,role){
 rmShowDialog('删除角色',`<p>是否删除本地角色「${esc(role.name)}」？</p>`,()=>rmWriteRoles(snapshot,snapshot.roles.filter(item=>item.id!==role.id)),{submitLabel:'删除'});
}
function rmChangeStatus(snapshot,role){
 const enabled=role.status==='enabled',label=enabled?'停用':'启用';
 rmShowDialog('提示',`<p>确认要${label}「${esc(role.name)}」角色吗？</p>`,()=>rmSaveRole(snapshot,{...role,status:enabled?'disabled':'enabled'}),{submitLabel:'确定'});
}

const rmSearchForm=rmRolePage.querySelector('#rm-filter');
rmSearchForm.onsubmit=event=>event.preventDefault();
rmSearchForm.oninput=()=>{
 rmFilters=Object.fromEntries(Array.from(new FormData(rmSearchForm),([key,value])=>[key,value.trim()]));
 rmPageNumber=1;rmRenderRoles();
};
rmSearchForm.onreset=()=>{rmFilters={};rmPageNumber=1;rmRenderRoles()};
const rmActions={rmEdit:rmEditRole,rmDelete:rmDeleteRole,rmData:rmAssignData,rmUsers:rmAssignUsers,rmStatus:rmChangeStatus};
rmRolePage.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-rm-new'))return rmEditRole(rmReadRoles());
 if(button.hasAttribute('data-rm-export'))return downloadCsv(rmListHeaders,rmVisibleRoles(rmReadRoles().roles).map(rmListValues),'角色管理');
 const key=Object.keys(rmActions).find(name=>button.dataset[name]);if(!key)return;
 const snapshot=rmReadRoles(),role=snapshot.roles.find(item=>item.id===Number(button.dataset[key]));
 if(role){button.closest('[popover]')?.hidePopover();rmActions[key](snapshot,role)}
});
