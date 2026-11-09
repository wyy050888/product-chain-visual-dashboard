import assert from 'node:assert/strict';
export async function supplierMaterialPlan(page){
 const key='supplier-targets-v1',previous=await page.evaluate(key=>localStorage.getItem(key),key);
 const audit=()=>page.evaluate(()=>supplierPlanningAudit());
 try{
  await page.evaluate(key=>localStorage.removeItem(key),key);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  await page.evaluate(()=>location.hash='#suppliers');await page.locator('.scp-resource-card').waitFor();
  const a=await audit();assert(a.projects.some(p=>p.type.startsWith('自研')));assert(a.projects.some(p=>p.type.startsWith('自选')));
  assert.equal(await page.locator('.scp-resource-card [data-scp-annual-group]').count(),1);
  assert.deepEqual(await page.locator('.scp-quarter-card h5').allTextContents(),['Q1 新增合作','Q2 新增合作','Q3 新增合作','Q4 新增合作']);
  assert.equal(await page.locator('[data-scp-period="category"] [data-scp-mode]').count(),0);
  assert.deepEqual(await page.locator('.scp-category-table thead th').allTextContents(),['三级类目','意向储备（总）','准入储备（总）','已合作（总）','26年新增准入','26年新增合作']);
  const annualAdmissions=await page.locator('.scp-category-table tbody tr td:nth-child(5) .scp-count').allTextContents();
  const admissions=annualAdmissions.map(Number);assert(admissions.length>1);
  assert(admissions.every((value,i)=>i===0||value>=admissions[i-1]),'类目预警默认按年度新增准入实际数升序');
  assert.equal(await page.locator('.scp-category-table th').filter({has:page.locator('[data-rp-sort="newAdmitted"]')}).getAttribute('aria-sort'),'ascending');

  assert.equal(a.categoryPeriod.mode,'year');
  assert.deepEqual(await page.locator('.scp-material-summary-table thead th').allTextContents(),['类目','品牌','电机','电池','电源线','线路板','塑料件','包装','操作']);
  assert.equal(await page.locator('[data-scp-material-view]').count(),5);
  assert.equal(await page.locator('[data-scp-period="material"] [data-scp-mode],[data-scp-period="material"] [data-scp-quarter]').count(),0,'二级仅年度');
  const assertTargets=async target=>{const b=await audit();assert.equal(b.materialPeriod.mode,'year');for(const brand of b.materials){assert.equal(brand.categories.length,b.categories.length);for(const row of brand.categories)assert(Object.values(row.stats.targets).every(value=>value===target),'年度目标不累加季度')}for(const row of b.coverage){assert.equal(row.categories.length,b.categories.length);assert(row.categories.every(c=>c.minimum===target))}};
  await assertTargets(5);
  await page.evaluate(()=>location.hash='#system-supplier-targets');
  const input=page.getByRole('spinbutton',{name:'二级供应商年度新增准入目标数量'});await input.waitFor();assert.equal(await input.inputValue(),'5');
  assert.equal(await page.locator('#st-brand,[data-st-plan-picker],[data-st-plan-save],#st-plan-add-category').count(),0,'没有品牌季度计划配置');
  await input.fill('8');await input.press('Tab');assert.equal(await page.evaluate(()=>supplierTargetsAudit().values.standards.materialAdmitted),8);
  await page.evaluate(()=>location.hash='#suppliers');await assertTargets(8);
  await page.locator('[data-scp-material-view]').first().click();assert((await page.locator('.scp-admission-target').allTextContents()).every(t=>t==='8'));await page.keyboard.press('Escape');
  await page.evaluate(()=>location.hash='#system-supplier-targets');
  const saved=await page.evaluate(key=>localStorage.getItem(key),key);
  for(const value of ['0','-1','1.5','100000','']){await input.fill(value);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved,'无效目标不写入');assert.match(await page.locator('#st-error').innerText(),/整数/)}
  await page.evaluate(()=>{window.stNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='supplier-targets-v1')throw Error('full');return window.stNativeSet.call(this,k,v)}});
  await input.fill('9');assert.match(await page.locator('#st-error').innerText(),/保存失败/);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);await page.evaluate(()=>{Storage.prototype.setItem=window.stNativeSet;delete window.stNativeSet});
  await input.fill('8');await page.locator('#st-year').selectOption('2025');assert.equal(await input.inputValue(),'5');await input.fill('6');await page.locator('#st-year').selectOption('2026');assert.equal(await input.inputValue(),'8','年度隔离');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>location.hash='#system-supplier-targets');assert.equal(await input.inputValue(),'8','持久化');
  // 旧季度安排不再限制类目范围或产生年度10/20目标，一级已保存目标保留。
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:7,years:{2026:{resourceAnnual:23,standards:{materialAdmitted:5},materialPlans:{美海:{test:{quarters:[['电机'],['电机'],['电机'],['电机']]}}}}}})),key);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>location.hash='#suppliers');await assertTargets(5);assert.equal((await audit()).annual.target,23);
  await page.evaluate(()=>location.hash='#system-supplier-targets');await input.fill('7');const migrated=await page.evaluate(()=>supplierTargetsAudit().store);assert.equal(migrated.version,8);assert(migrated.legacy.years[2026].materialPlans,'旧配置只归档');assert.equal(migrated.years[2026].materialPlans,undefined);
  for(const width of [1920,1024,390]){await page.setViewportSize({width,height:1080});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'配置页面无横向溢出 '+width)}
 }finally{
  await page.evaluate(({key,previous})=>{if(window.stNativeSet)Storage.prototype.setItem=window.stNativeSet;if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous)},{key,previous});await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 }
 console.log('通过：二级仅年度目标、全目录年度覆盖、修改联动、校验/保存失败、年度隔离及旧季度计划迁移。');
}
