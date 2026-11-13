// 只管理控件的呈现、可访问状态和键盘操作，不复制业务数据。
const projectSearchInput=$('#projectsearch');
const projectSearchField=document.createElement('div');
projectSearchField.className='ui-search-field';
projectSearchInput.before(projectSearchField);
projectSearchField.append(projectSearchInput);
const projectSearchClear=document.createElement('button');
projectSearchClear.type='button';
projectSearchClear.className='ui-search-clear';
projectSearchClear.setAttribute('aria-label','清空项目搜索');
projectSearchClear.textContent='×';
projectSearchField.append(projectSearchClear);
projectSearchClear.onclick=()=>{
  projectSearchInput.value='';
  projectSearchInput.dispatchEvent(new Event('input',{bubbles:true}));
  projectSearchInput.focus();
};
const projectResetButton=document.createElement('button');
projectResetButton.type='button';
projectResetButton.id='project-reset';
projectResetButton.className='link ui-filter-reset';
projectResetButton.textContent='重置筛选';
projectSearchField.after(projectResetButton);
projectResetButton.onclick=()=>{
  $('#projectchain').value='全部';
  $('#projecttype').value='全部';
  projectSearchInput.value='';
  projectStatus='all';
  projectPage=1;
  renderProjects();
  polishDashboardControls($('#projects'));
};
const uiFilterSelector='#newchain,#projectchain,#projecttype,#ai-chain,#ai-department,#ai-owner,.ai-dimension-filters select';
function polishDashboardControls(root){
  for(const button of root.querySelectorAll('.tabs>button,.filtertabs>button,.stat[data-status],.dept[data-dept]')){
    const selected=button.classList.contains('active')||button.classList.contains('selected');
    if(button.getAttribute('aria-pressed')!==String(selected))button.setAttribute('aria-pressed',String(selected));
  }
  for(const select of root.querySelectorAll(uiFilterSelector)){
    const filtered=!['全部','all',''].includes(select.value);
    if(select.classList.contains('ui-filter-active')!==filtered)select.classList.toggle('ui-filter-active',filtered);
  }
  const hideClear=!projectSearchInput.value,disableReset=hideClear&&$('#projectchain').value==='全部'&&$('#projecttype').value==='全部'&&projectStatus==='all';
  if(projectSearchClear.hidden!==hideClear)projectSearchClear.hidden=hideClear;
  if(projectResetButton.disabled!==disableReset)projectResetButton.disabled=disableReset;
}
// 按左右键切换时，业务渲染可能替换按钮；下一帧把焦点还给相同选项。
document.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const button=event.target.closest?.('button');
  const group=button?.parentElement;
  if(!group?.matches('.tabs,.period-segment'))return;
  const buttons=[...group.children].filter(n=>n.matches('button:not(:disabled)')&&n.checkVisibility());
  if(buttons.length<2)return;
  event.preventDefault();
  const index=buttons.indexOf(button),step=event.key==='ArrowLeft'?-1:1;
  const target=buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+step+buttons.length)%buttons.length];
  const section=group.closest('section.section,#dialogbody')||group.parentElement;
  const groupIndex=[...section.querySelectorAll('.tabs,.period-segment')].indexOf(group);
  const targetIndex=buttons.indexOf(target);
  target.click();
  requestAnimationFrame(()=>{
    const replacement=group.isConnected?group:section.querySelectorAll('.tabs,.period-segment')[groupIndex];
    [...(replacement?.children||[])].filter(n=>n.matches('button:not(:disabled)'))[targetIndex]?.focus({preventScroll:true});
  });
});
document.addEventListener('change',event=>{
  if(event.target.matches?.(uiFilterSelector)&&event.target.parentElement)polishDashboardControls(event.target.parentElement);
});
const uiControlsObserver=new MutationObserver(records=>{
  const scopes=new Set();
  for(const record of records){
    if(record.target.closest?.('.metric-help,.metric-tooltip,.portal-header,.ui-year-field'))continue;
    if(record.type==='childList'&&!record.addedNodes.length)continue;
    if(record.type==='childList'&&[...record.addedNodes].every(node=>node.nodeType===1&&node.matches('.ui-column-handle,colgroup,col,.metric-help,.metric-tooltip,.ui-year-field')))continue;
    const scope=record.type==='attributes'?record.target.parentElement:record.target;
    if(scope?.querySelectorAll)scopes.add(scope);
  }
  for(const scope of scopes)if(scope.isConnected&&![...scopes].some(parent=>parent!==scope&&parent.contains(scope)))polishDashboardControls(scope);
});
uiControlsObserver.observe(document.querySelector('.page'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
uiControlsObserver.observe($('#dialogbody'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
polishDashboardControls(document.body);
