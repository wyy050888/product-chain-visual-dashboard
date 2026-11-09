// 产品无重置按钮；检查通过现有控件恢复默认条件，不依赖隐藏入口。
export async function clickDiagnosisStatus(root,key){
 const dropdown=root.locator('[data-gd-status-dropdown]');
 if(await dropdown.count()&&!await dropdown.evaluate(e=>e.open))await dropdown.locator('summary').click();
 await root.locator('[data-gd-status="'+key+'"]').click();
}
export async function resetDiagnosisFilters(root){
 const category=root.locator('[data-gd-category="all"]');if(await category.count()&&await category.getAttribute('aria-pressed')!=='true')await category.click();
 const search=root.locator('[data-gd-search]');if(await search.inputValue())await search.fill('');
 const allReason=root.locator('[data-gd-reason-filter="all"]');if(await allReason.count()&&await allReason.getAttribute('aria-pressed')!=='true')await allReason.click();
 const department=root.locator('[data-gd-department="all"]');if(await department.getAttribute('aria-selected')!=='true')await department.click();
 const priority=root.locator('[data-gd-priority="all"]');if(await priority.getAttribute('aria-selected')!=='true')await priority.click();
 const statusTabs=root.locator('.gd-task-status-tabs');
 const selected=await root.locator('[data-gd-status][aria-pressed="true"]').evaluateAll(es=>es.map(e=>e.dataset.gdStatus));
 if(await statusTabs.count())await clickDiagnosisStatus(root,'all');
 else if(selected.join('|')!=='pending|working'){
  await clickDiagnosisStatus(root,'all');await clickDiagnosisStatus(root,'pending');await clickDiagnosisStatus(root,'working');
 }
 const sort=root.locator('[data-gd-header-sort="priority"]');if(await sort.locator('..').getAttribute('aria-sort')!=='ascending')await sort.click();
}
