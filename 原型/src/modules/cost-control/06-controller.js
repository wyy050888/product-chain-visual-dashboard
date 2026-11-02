// 保留公共时间渲染入口；使用新模块而不是叠加旧降本表格。
$('#cost').classList.add('cc-workspace');
$('#cost .titlegroup').insertAdjacentHTML('afterend','<button type="button" class="btn" id="cc-import-data">导入数据</button>');
$('#cc-import-data').onclick=()=>smNavigate(cecRoute);
$('#costtable').insertAdjacentHTML('beforebegin','<div class="tabs cc-view-tabs" role="group" aria-label="降本查看维度"><button type="button" data-cc-view="category" aria-pressed="true" class="active">按分类</button><button type="button" data-cc-view="department" aria-pressed="false">按部门</button></div>');
$('#cost .cc-view-tabs').onclick=event=>{const button=event.target.closest('[data-cc-view]');if(button){ccView=button.dataset.ccView;ccRenderDepartments()}};
$('#costtable').addEventListener('click',event=>{
 const sort=event.target.closest('[data-cc-sort]');
 if(sort){const key=sort.dataset.ccSort;rpSortCycle(ccView==='category'?ccCategorySort:ccDepartmentSort,key);ccRenderDepartments();$('#costtable').querySelector(`[data-cc-sort="${key}"]`)?.focus({preventScroll:true});return}
 const category=event.target.closest('[data-cc-category]');if(category){ccOpenCategory(category.dataset.ccCategory);return}
 const button=event.target.closest('[data-cc-department]');if(button)ccOpenDepartment(button.dataset.ccDepartment);
});
costDetail=function(index){const dept=ccDepartments[index];if(dept)ccOpenDepartment(dept.id)};
