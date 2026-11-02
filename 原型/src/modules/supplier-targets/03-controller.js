// 数字目标合法后逐项自动保存，年度切换保留其他年度的生效配置。
function stApplyInput(input){
 if(!input.isConnected)return;const scope=JSON.parse(input.dataset.stValue),value=input.value===''?null:Number(input.value);
 const result=input.validity.badInput?{ok:false,error:'请输入整数目标'}:stSetValue(scope,value);
 input.setAttribute('aria-invalid',String(!result.ok));input.setCustomValidity(result.ok?'':result.error);stEditor.error=result.ok?'':result.error;stRenderFeedback();
 if(result.ok&&result.changed)renderSuppliers();
}
$('#st-target-page').addEventListener('input',event=>{if(event.target.matches('[data-st-value]'))stApplyInput(event.target)});
$('#st-target-page').addEventListener('change',event=>{
 const input=event.target;
 if(input.id==='st-year'){stEditor.year=Number(input.value);stEditor.error='';stRenderPage()}
 else if(input.matches('[data-st-value]'))stApplyInput(input);
});
