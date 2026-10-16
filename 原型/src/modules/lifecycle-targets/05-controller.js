// 不重绘正在输入的表格，避免逐字自动保存打断焦点与光标。
function ltApplyInput(input){
 if(!input.isConnected)return;
 const year=Number(input.dataset.ltYear),category=Number(input.dataset.ltCategoryIndex);
 const [plan,quarter]=input.dataset.ltNumber.split(':').map(Number),value=input.value===''?0:Number(input.value);
 const valid=!input.validity.badInput&&ltNumeric(value);
 input.classList.toggle('lt-input-empty',valid&&value===0);
 input.setCustomValidity(valid?'':'请输入0至99,999的整数');input.setAttribute('aria-invalid',String(!valid));
 const result=valid?ltSetTarget(year,category,plan,quarter,value):{ok:false,error:'目标须为0至99,999的整数'};
 if(year!==ltEditor.year||category!==ltEditor.category)return;
 ltEditor.error=result.ok?'':result.error;
 $(`[data-lt-row-total="${plan}"]`).innerHTML=ltSummaryCell(ltYearValues(year)[category][plan]);
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
document.addEventListener('focusout',e=>{
 const input=e.target;if(input.matches('#lt-system [data-lt-number]')&&input.value===''&&!input.validity.badInput)input.value='0';
});
document.addEventListener('click',e=>{
 const button=e.target.closest('#lt-system button');if(!button)return;
 if(button.dataset.ltCategory!==undefined){ltEditor.category=Number(button.dataset.ltCategory);ltEditor.error='';ltRenderPage()}
});
