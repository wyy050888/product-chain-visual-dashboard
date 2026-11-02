// 明细栏不再提供重置入口，既有检查通过各筛选项恢复初始条件。
export async function clearKeyProductFilters(page){
 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>dashboardKeyProductsSnapshot());
 let state=await snapshot();
 if(state.filters.query)await root.locator('[data-kpm-search]').fill('');
 if(state.filters.brand!=='all')await root.locator('[data-kpm-filter="brand"]').selectOption('all',{force:true});
 for(const key of ['category','season'])if(state.filters[key]!=='all')await root.locator('[data-kpm-scope-filter="'+key+'"][data-kpm-scope-value="all"]').click();
 const price=root.locator('[data-kpm-price-host="main"]');
 if(state.filters.min||state.filters.max){
  if(await price.locator('[data-kpm-price-trigger]').getAttribute('aria-expanded')!=='true')await price.locator('[data-kpm-price-trigger]').click();
  await price.locator('[data-kpm-price-min]').fill('');await price.locator('[data-kpm-price-max]').fill('');
 }
 if((await snapshot()).filters.price!=='all'){
  if(await price.locator('[data-kpm-price-trigger]').getAttribute('aria-expanded')!=='true')await price.locator('[data-kpm-price-trigger]').click();
  await price.locator('[data-kpm-price-preset="all"]').click();
 }
 state=await snapshot();
 if(state.grade!=='all')await root.locator('[data-kpm-grade="'+state.grade+'"]').click();
 if(state.change!=='all'){
  const button=root.locator('[data-kpm-change="all"]');
  await button.click();if((await snapshot()).change!=='all')await button.click();
 }
 for(let i=0;i<3;i++){
  const {sort}=await snapshot();if(sort.key==='sales'&&sort.direction==='desc')break;
  await root.locator('[data-kpm-sort="sales"]').click();
 }
 await page.keyboard.press('Escape');
}
