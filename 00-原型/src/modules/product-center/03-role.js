// 演示人员只保留两项；产品经理示例固定为环境类。
const pcRoleControl=document.createElement('label');pcRoleControl.className='pc-role-control';pcRoleControl.hidden=true;
pcRoleControl.innerHTML='<span>人员</span><select id="pc-person" aria-label="演示人员"><option value="manager">总监</option><option value="owner">产品经理</option></select>';
$('.headright').prepend(pcRoleControl);
function pcSyncRoleControl(){pcRoleControl.hidden=!pcIsActive();pcRoleControl.querySelector('select').value=dpState.role}
pcRoleControl.querySelector('select').addEventListener('change',event=>{
 dpState.role=event.target.value;
 dpState.chain=dpState.role==='owner'?String(pcManagerChain):'all';
 dpState.pages={};gdState.pages={};kpmPage.value=1;ppState.page=1;
 // 先更新工作区身份再重绘，保证共用数据适配器全程使用同一视角。
 renderDepartment();pcTrimScopedModules();
});
const pcPreviousRenderSales=renderSales;
renderSales=function(...args){const result=pcPreviousRenderSales(...args);if(pcIsActive())pcTrimScopedModules();return result};
