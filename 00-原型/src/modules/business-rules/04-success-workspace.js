// 主页面只读；各状态编辑与新增共用弹窗，删除仅待生效，目标单独保存。
brcPage.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-brcs-kind')){brcSuccessView.kind=button.dataset.brcsKind;brcSuccessView.error='';brcSuccessPaintWorkspace()}
 if(button.hasAttribute('data-brcs-create'))brcSuccessOpenDialog();
 if(button.hasAttribute('data-brcs-edit'))brcSuccessOpenDialog(true);
 if(button.hasAttribute('data-brcs-delete')){
  const kind=brcSuccessView.kind,row=brcSuccessSelected(),revision=brcSaved.revision;
  brcSuccessConfirm('删除这套待生效方案？当前规则和其他生效安排保留。',()=>{brcSuccessDeleteRule(kind,row.from,revision);brcSuccessView.selected[kind]=null;brcSuccessView.error='';brcSuccessPaintWorkspace();brcApply();toast('方案已删除')},'删除');
 }
 if(button.hasAttribute('data-brcs-target-save')){
  try{brcSuccessSaveTarget(brcPage.querySelector('[data-brcs-target]').value);brcDraft['new.successRate']=brcNumber('new.successRate');brcSuccessView.goalDraft=null;brcSuccessView.error='';brcSuccessPaintWorkspace();brcApply();toast('目标已保存')}
  catch(error){brcSuccessView.error=error.message;brcPage.querySelector('.brcs-page-error').textContent=error.message}
 }
});
brcPage.addEventListener('change',event=>{if(event.target.hasAttribute('data-brcs-record')){brcSuccessView.selected[brcSuccessView.kind]=event.target.value;brcSuccessView.error='';brcSuccessPaintWorkspace()}});
brcPage.addEventListener('input',event=>{if(event.target.hasAttribute('data-brcs-target'))brcSuccessView.goalDraft=event.target.value});
