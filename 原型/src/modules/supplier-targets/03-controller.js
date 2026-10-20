// 自动保存时只更新汇总与隐藏看板，保留当前输入焦点。
function stApplyInput(input){
 if(!input.isConnected)return;const scope=JSON.parse(input.dataset.stValue),value=input.value===''?0:Number(input.value),valid=!input.validity.badInput&&stInteger(value)&&(scope.type!=='standards'||value>0);
 const result=valid?stSetValue(scope,value):{ok:false,error:scope.type==='standards'?'标准须为1至99,999的整数':'目标须为0至99,999的整数'};
 input.setAttribute('aria-invalid',String(!result.ok));input.setCustomValidity(result.ok?'':result.error);input.classList.toggle('lt-input-empty',result.ok&&value===0);stEditor.error=result.ok?'':result.error;stRenderFeedback();
 if(result.ok){if(scope.type!=='standards'){const key=scope.brand?[scope.brand,scope.category||''].join('|'):'machine',node=[...$('#st-table').querySelectorAll('[data-st-total]')].find(el=>el.dataset.stTotal===key);if(node)node.innerHTML=stSummary(scope.type==='machine'?stMachine(scope.year):stMaterial(scope.year,scope.brand,scope.category))}if(result.changed)renderSuppliers()}
}
$('#st-target-page').addEventListener('input',event=>{if(event.target.matches('[data-st-value]'))stApplyInput(event.target)});
$('#st-target-page').addEventListener('change',event=>{
 const input=event.target;
 if(input.id==='st-year'){stEditor.year=Number(input.value);stEditor.materialPage=1;stEditor.error='';stRenderPage()}
 else if(input.matches('[data-st-value]'))stApplyInput(input);
 else if(input.hasAttribute('data-st-grade')){const result=stSetGrade(input.dataset.stGrade,input.value);stEditor.error=result.ok?'':result.error;if(!result.ok)input.value=stGrade(input.dataset.stGrade);stRenderFeedback();if(result.changed)renderSuppliers()}
});
$('#st-target-page').addEventListener('focusout',event=>{const input=event.target;if(input.matches('[data-st-value]')&&input.value===''&&!input.validity.badInput){const scope=JSON.parse(input.dataset.stValue);if(scope.type!=='standards')input.value='0'}});
$('#st-target-page').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.stTab){stEditor.type=button.dataset.stTab;stEditor.error='';stRenderPage()}
 else if(button.dataset.stBrand){const brand=button.dataset.stBrand;stEditor.openBrands.has(brand)?stEditor.openBrands.delete(brand):stEditor.openBrands.add(brand);stRenderPage();$('#st-table').querySelector(`[data-st-brand="${brand}"]`)?.focus({preventScroll:true})}
 else if(button.hasAttribute('data-st-expand')){stEditor.openBrands=new Set(stEditor.openBrands.size===stBrands.length?[]:stBrands.map(([brand])=>brand));stRenderPage();$('#st-table [data-st-expand]').focus({preventScroll:true})}
});
$('#st-tabs').addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const index=stTabs.findIndex(([key])=>key===stEditor.type);event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?stTabs.length-1:(index+(event.key==='ArrowLeft'?-1:1)+stTabs.length)%stTabs.length;stEditor.type=stTabs[next][0];stEditor.error='';stRenderPage();$('#st-tabs').querySelector(`[data-st-tab="${stEditor.type}"]`).focus({preventScroll:true});
});
