const suPage=smRegisterPage({
 route:'#system-users',id:'system-user-page',title:'用户管理',onShow:suRenderMemberships,
 markup:`<header class="lt-page-head sm-target-head su-head"><h2 class="sm-page-title">用户管理</h2>
  <div class="sm-page-tabs" role="tablist" aria-label="用户管理">
   <button type="button" role="tab" aria-selected="false" tabindex="-1" disabled>系统账号</button>
   <button type="button" role="tab" aria-selected="false" tabindex="-1" disabled>供应商账号</button>
   <button type="button" role="tab" id="su-tab-chains" aria-controls="su-chains" aria-selected="true" tabindex="0">链群配置</button>
  </div></header>
  <section class="lt-panel su-panel" id="su-chains" role="tabpanel" aria-labelledby="su-tab-chains">
   <div class="tablewrap" id="su-chain-matrix"></div>
  </section>`
});

function suRenderMemberships(){
 const {groups}=smReadChainMemberships(),accounts=rmSystemAccounts();
 const headers=smMembershipChains.map(chain=>`<th scope="col">${esc(chain)}</th>`).join('');
 const rows=rmDepartmentNames.map(department=>`<tr><th scope="row">${esc(department)}</th>${smMembershipChains.map(chain=>{
  const members=smChainMembers(groups,department,chain);
  const names=accounts.filter(account=>members.includes(account.id)).map(account=>account.name).join('、');
  return `<td><button type="button" class="link su-members-button" data-su-department="${esc(department)}" data-su-chain="${esc(chain)}"${names?'':' data-su-unassigned'}
   aria-label="配置${esc(department)} · ${esc(chain)}的用户">${esc(names||'配置用户')}</button></td>`;
 }).join('')}</tr>`).join('');
 $('#su-chain-matrix').innerHTML=`<table class="su-table su-matrix" aria-label="部门与链群用户配置"><thead><tr><th scope="col">部门</th>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

function suEditMembers(department,chain){
 const snapshot=smReadChainMemberships(),accounts=rmSystemAccounts();
 const members=smChainMembers(snapshot.groups,department,chain).filter(id=>accounts.some(account=>account.id===id));
 const label=`${department} · ${chain}`;
 const people=()=>accounts.map(account=>({name:account.id}));
 const personLabel=id=>accounts.find(account=>account.id===id)?.name||id;
 const form=rmShowDialog('选择用户',`<p class="su-member-context">${esc(label)}</p>${upTodoPeopleMultiple()}`,
 ()=>smSaveChainMembers(snapshot,department,chain,picker.upPeopleSelection()),
 {submitLabel:'保存',onSaved:suRenderMemberships,successMessage:'已保存链群配置'});
 const dialog=form.closest('dialog'),picker=form.querySelector('[data-people-multiple]');
 dialog.classList.add('su-member-dialog');
 upBindTodoPeople(form,null,{people,personLabel,bottomBoundary:form.querySelector('.rm-dialog-body')});
 upBindTodoPeopleMultiple(form,null,()=>({selected:members,label:'人员',personLabel,keepOpenFor:node=>Boolean(node?.closest('footer'))}));
 dialog.addEventListener('close',()=>form.upPeopleMultipleCleanup?.(),{once:true});
 dialog.addEventListener('keydown',event=>{
  const display=picker.querySelector('[data-people-display]');
  if(event.key!=='Escape'||!display.hidden)return;
  event.preventDefault();event.stopPropagation();
  picker.upClosePeopleEdit();display.focus();
 },true);
}

smBindTabs(suPage,suPage.querySelector('.sm-page-tabs'));
$('#su-chain-matrix').addEventListener('click',event=>{
 const button=event.target.closest('[data-su-department]');
 if(button)suEditMembers(button.dataset.suDepartment,button.dataset.suChain);
});
