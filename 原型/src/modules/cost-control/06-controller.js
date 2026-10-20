// 保留公共时间渲染入口；使用新模块而不是叠加旧降本表格。
$('#cost').classList.add('cc-workspace');
$('#cost .titlegroup').insertAdjacentHTML('afterend','<button type="button" class="btn" id="cc-import-data">导入数据</button>');
$('#cc-import-data').onclick=()=>smNavigate(cecRoute);
$('#costopportunity').onclick=()=>withPeriod('cost',ccOpenOpportunity);
$('#costtable').addEventListener('click',event=>{
 const sort=event.target.closest('[data-cc-sort]');
 if(sort){const key=sort.dataset.ccSort;rpSortCycle(ccDepartmentSort,key);ccRenderDepartments();$('#costtable').querySelector(`[data-cc-sort="${key}"]`)?.focus({preventScroll:true});return}
 const button=event.target.closest('[data-cc-department]');if(button)ccOpenDepartment(button.dataset.ccDepartment);
});
costDetail=function(index){const dept=ccDepartments[index];if(dept)ccOpenDepartment(dept.id)};

$('#dialogbody').addEventListener('drawer:restored',()=>$('#dialogbody>.cc-drawer')?.ccRefresh?.());
