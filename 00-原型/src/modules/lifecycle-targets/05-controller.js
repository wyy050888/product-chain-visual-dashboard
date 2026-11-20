// 不重绘正在输入的表格，避免逐字自动保存打断焦点与光标。
function ltApplyInput(input){
 if(!input.isConnected)return;
 const year=Number(input.dataset.ltYear),category=Number(input.dataset.ltCategoryIndex),brand=input.dataset.ltBrandName;
 const [plan,quarter]=input.dataset.ltNumber.split(':').map(Number),value=input.value===''?null:Number(input.value);
 const limit=ltTargetLimit(category,brand);
 const valid=!input.validity.badInput&&(value===null||ltValidCell(value,category,brand)),message='请输入0至'+limit.toLocaleString('en-US')+'的整数';
 input.classList.toggle('lt-input-empty',valid&&value===null);
 input.setCustomValidity(valid?'':message);input.setAttribute('aria-invalid',String(!valid));
 const result=valid?ltSetTarget(year,category,plan,quarter,value,brand):{ok:false,error:message};
 if(year!==ltEditor.year||category!==ltEditor.category)return;
 ltEditor.error=result.ok?'':result.error;
 input.closest('tr').querySelector('[data-lt-row-total]').innerHTML=ltSummaryCell(ltTargetRows(year,category,brand)[plan]);
 ltRenderFeedback();if(result.changed)renderLife();
}

document.addEventListener('change',e=>{
 const target=e.target;if(!target.closest('#lt-system'))return;
 if(target.id==='lt-year'){ltEditor.year=Number(target.value);ltEditor.error='';ltRenderPage();return}
 if(target.matches('[data-lt-number]'))ltApplyInput(target);
});
document.addEventListener('input',e=>{
 if(e.target.matches('#lt-system [data-lt-number]'))ltApplyInput(e.target);
});
document.addEventListener('click',e=>{
 const button=e.target.closest('#lt-system button');if(!button)return;
 if(button.dataset.ltCategory!==undefined){
  const category=Number(button.dataset.ltCategory);
  if(category!==ltEditor.category)ltEditor.expandedPlans.clear();
  ltEditor.category=category;ltEditor.error='';ltRenderPage();
  return;
 }
 const bulk=button.hasAttribute('data-lt-plan-bulk'),plan=button.dataset.ltPlanToggle;
 if(!bulk&&plan===undefined)return;
 const expanded=button.getAttribute('aria-expanded')==='true';
 for(const index of bulk?ltBrandPlanIndexes:[Number(plan)]){
  if(expanded)ltEditor.expandedPlans.delete(index);
  else ltEditor.expandedPlans.add(index);
 }
 $('#lt-table').innerHTML=ltQuarterTable();
 $(bulk?'[data-lt-plan-bulk]':`[data-lt-plan-toggle="${plan}"]`)?.focus({preventScroll:true});
});
