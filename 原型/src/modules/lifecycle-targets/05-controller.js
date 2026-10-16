function ltSave(){
 const result=ltPersist();
 if(!result.ok){
  ltEditor.error=result.error;
  if(result.invalid){const {year,c,p,q}=result.invalid;ltEditor.year=year;ltEditor.category=c;ltEditor.view='quarter';ltRenderPage();$(`[data-lt-number="${p}:${q}"]`)?.focus()}
  else ltRenderFeedback();
  return false;
 }
 ltRenderPage();if(result.changed)toast('目标已保存');return true;
}
document.addEventListener('change',e=>{
 const target=e.target;if(!target.closest('#lt-system'))return;
 if(target.id==='lt-year'){ltEditor.year=Number(target.value);ltEditor.error='';ltRenderPage();return}
 if(target.dataset.ltState){
  const [p,q]=target.dataset.ltState.split(':').map(Number),row=ltDraft()[ltEditor.category][p];
  row[q]=target.value==='target'?(ltNumeric(row[q])?row[q]:0):target.value==='missing'?null:target.value;
  ltMarkDirty();ltEditor.error='';ltRenderPage();
  if(target.value==='target')$(`[data-lt-number="${p}:${q}"]`)?.focus();
 }
});
document.addEventListener('input',e=>{
 const input=e.target;if(!input.matches('#lt-system [data-lt-number]'))return;
 const [p,q]=input.dataset.ltNumber.split(':').map(Number),row=ltDraft()[ltEditor.category][p];
 row[q]=input.value===''?'':Number(input.value);const valid=ltNumeric(row[q]);
 input.setCustomValidity(valid?'':'请输入0至99,999的整数');input.setAttribute('aria-invalid',String(!valid));
 ltMarkDirty();ltEditor.error=valid?'':'目标须为0至99,999的整数';
 $(`[data-lt-row-total="${p}"]`).innerHTML=ltSummaryCell(row);ltRenderFeedback();
});
document.addEventListener('click',e=>{
 const button=e.target.closest('#lt-system button');if(!button)return;
 if(button.dataset.ltCategory!==undefined){ltEditor.category=Number(button.dataset.ltCategory);ltEditor.error='';ltRenderPage()}
 if(button.dataset.ltView){ltEditor.view=button.dataset.ltView;ltEditor.error='';ltRenderPage()}
});
