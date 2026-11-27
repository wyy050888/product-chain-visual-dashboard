import assert from 'node:assert/strict';

export async function qualityPermissions(page){
 await page.clock.setFixedTime(new Date('2026-11-26T04:00:00Z'));
 const entry=new URL('品质中心.html',page.url());
 const account=new URL(entry);account.searchParams.set('qc-account','quality-center:魏涛');
 await page.goto(account.href);
 await page.getByText('暂无品质中心看板权限',{exact:true}).waitFor();

 const roles=new URL(entry);roles.hash='system-roles';
 await page.goto(roles.href);
 const list=page.locator('#system-role-page');
 await list.getByRole('button',{name:'新增',exact:true}).click();
 const create=page.getByRole('dialog',{name:'新增角色',exact:true});
 await create.getByRole('tab',{name:'产品链看板',exact:true}).click();
 async function scopeLayout(department){
  await create.getByRole('tab',{name:department,exact:true}).click();
  return create.getByRole('tabpanel',{name:department,exact:true}).evaluate(pane=>{
   return ['key-work','deviation','weekly-report','tasks','project-risk','cost'].map(id=>{
    const cell=pane.querySelector(`[data-rm-module="${id}"] td`),left=cell.getBoundingClientRect().left;
    const top=cell.querySelector('.rm-department-trigger').getBoundingClientRect().top;
    return [...cell.querySelectorAll('.rm-department-trigger,.rm-scope-select')].map(node=>{
     const {x,y,width,height}=node.getBoundingClientRect();
     const css=getComputedStyle(node);
     return [x-left,y-top,width,height,css.borderColor,css.borderRadius,css.backgroundColor];
    });
   });
  });
 }
 for(const width of [1920,760]){
  await page.setViewportSize({width,height:1080});
  const productLayout=await scopeLayout('产品中心');
  assert.deepEqual(await scopeLayout('品质中心'),productLayout,'品质中心与产品中心数据范围控件逐行对齐');
 }
 const newQuality=create.getByRole('tabpanel',{name:'品质中心',exact:true});
 const departmentFields=newQuality.locator('[data-rm-picker-trigger]');
 assert.deepEqual(await departmentFields.locator('.pf-multi-value').allTextContents(),Array(6).fill('品质中心'));
 assert.equal(await departmentFields.count(),6);
 for(const field of await departmentFields.all())assert(await field.isDisabled());
 await create.getByRole('checkbox',{name:'全选/清除全选',exact:true}).check();
 for(const field of await departmentFields.all()){
  assert(await field.isEnabled());
  await field.click();
  const options=newQuality.locator('.rm-department-options:popover-open');
  assert(await options.getByRole('checkbox',{name:'品质中心',exact:true}).isChecked());
  assert(await options.getByRole('checkbox',{name:'产品中心',exact:true}).isVisible());
  await field.press('Escape');
 }
 assert.equal(await newQuality.locator('[data-rm-module="rating"] td').textContent(),'');
 assert.equal(await newQuality.getByRole('checkbox',{name:/上传周报/}).count(),0);
 await create.getByRole('button',{name:'取消',exact:true}).click();
 await create.waitFor({state:'hidden'});
 await page.setViewportSize({width:1920,height:1080});
 const owner=list.getByRole('row').filter({has:page.getByRole('cell',{name:'链主',exact:true})});
 async function edit(){
  await owner.getByRole('button',{name:'修改',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'修改角色'});
  await dialog.getByRole('tab',{name:'产品链看板',exact:true}).click();
  await dialog.getByRole('tab',{name:'品质中心',exact:true}).click();
  return {dialog,quality:dialog.getByRole('tabpanel',{name:'品质中心',exact:true})};
 }
 async function save(dialog){
  await dialog.getByRole('button',{name:'保存',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
 }
 const first=await edit();
 assert.deepEqual(await first.quality.locator('tr[data-rm-module]:not([data-rm-parent]) label span').allTextContents(),['总监看板','岗位看板']);
 assert.equal(await first.quality.locator('[data-rm-module="risk"] input[data-rm-group-toggle]').count(),1);
 await first.quality.getByRole('checkbox',{name:'PQM 品质链主可见',exact:true}).check();
 await save(first.dialog);
 await owner.getByRole('button',{name:'更多',exact:true}).click();
 await owner.getByRole('button',{name:'分配用户',exact:true}).click();
 const users=page.getByRole('dialog',{name:'分配用户',exact:true});
 await users.getByRole('group',{name:'品质中心人员',exact:true}).getByRole('checkbox',{name:'魏涛',exact:true}).check();
 await users.getByRole('button',{name:'提交',exact:true}).click();
 await users.waitFor({state:'hidden'});

 await page.goto(account.href);
 const chooser=page.locator('[data-qc-board-switch]');
 await chooser.click();
 const boards=page.getByRole('tablist',{name:'品质中心看板',exact:true}).getByRole('tab');
 assert.deepEqual(await boards.allTextContents(),['PQM 品质链主']);
 assert(await page.locator('#qc-board-pqm').isVisible());
 assert(await page.locator('#qc-board-director').isHidden());

 await page.goto(roles.href);
 const second=await edit();
 for(const name of ['重点工作清单','人员指标大盘','部门诊断','品质整改项目成本收益台账','产品违规榜','项目进度','部门风险根因分析','产品全生命周期','新品专项','关键产品','降本增效'])
  await second.quality.getByRole('checkbox',{name:name+'可见',exact:true}).check();
 const workDepartment=second.quality.getByRole('button',{name:'品质中心 · 重点工作清单部门',exact:true});
 assert.equal(await workDepartment.locator('.pf-multi-value').innerText(),'品质中心');
 await workDepartment.click();
 const workOptions=second.quality.getByRole('group',{name:'品质中心 · 重点工作清单部门选项',exact:true});
 await workOptions.getByRole('checkbox',{name:'产品中心',exact:true}).check();
 await workOptions.getByRole('checkbox',{name:'品质中心',exact:true}).uncheck();
 await workDepartment.press('Escape');
 await second.quality.getByRole('combobox',{name:'品质中心 · 重点工作清单链群',exact:true}).selectOption('full');
 const reportDepartment=second.quality.getByRole('button',{name:'品质中心 · 部门诊断部门',exact:true});
 assert.equal(await reportDepartment.locator('.pf-multi-value').innerText(),'品质中心');
 await reportDepartment.click();
 await second.quality.getByRole('group',{name:'品质中心 · 部门诊断部门选项',exact:true}).getByRole('checkbox',{name:'产品中心',exact:true}).check();
 await reportDepartment.press('Escape');
 for(const name of ['部门风险根因分析','降本增效']){
  const label='品质中心 · '+name+'部门',field=second.quality.getByRole('button',{name:label,exact:true});
  assert.equal(await field.locator('.pf-multi-value').innerText(),'品质中心');
  await field.click();
  const options=second.quality.getByRole('group',{name:label+'选项',exact:true});
  await options.getByRole('checkbox',{name:'产品中心',exact:true}).check();
  await options.getByRole('checkbox',{name:'品质中心',exact:true}).uncheck();
  await field.press('Escape');
 }
 assert.equal(await second.quality.getByRole('combobox',{name:'品质中心 · 人员指标大盘链群',exact:true}).inputValue(),'chain');
 await save(second.dialog);

 await page.goto(account.href);
 const home=page.locator('#quality-department');
 await home.getByRole('tab',{name:'人员指标大盘',selected:true}).waitFor();
 assert.equal(await home.getByRole('tab',{name:'人员评分',exact:true}).count(),0);
 assert.deepEqual(await home.locator('#qc-metric-pqm tbody .qc-fixed-person').allTextContents(),['魏涛','窦辉身']);
 assert.deepEqual(await home.locator('#riskrail [data-rp-board]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpBoard)),['0']);
 assert.deepEqual(await home.locator('#aigrid [data-gd-part] h3').allTextContents(),['重点工作清单','部门诊断']);
 const work=await page.evaluate(()=>globalDiagnosisAudit().work.map(row=>row.departments));
 assert(work.length&&work.every(names=>names.length===1&&names[0]==='产品中心'));
 assert.deepEqual(await home.locator('#pp-ai [role="tab"]').allTextContents(),['产品中心']);
 const risks=await page.evaluate(()=>projectAnalysisAudit().records.map(({risk})=>risk.department));
 assert(risks.length&&risks.every(names=>names.length===1&&names[0]==='产品中心'));
 assert.deepEqual(await home.locator('[data-qc-cost-category]').allTextContents(),['全部类目','清洁']);
 assert.equal(await home.locator('[data-pc-life-brands]').count(),0);
 const chainData=await page.evaluate(()=>{
  const chainBySpu=new Map(referenceSampleAudit().spus.map(spu=>[spu.spuId,spu.chain]));
  return {
   risk:riskBoardPeriodAudit().find(board=>board.kind===0).records.map(row=>chainBySpu.get(row.spuId)),
   projects:projectPanoramaAudit().scope.map(row=>row.category),lifecycle:dashboardLifecycleSnapshot().filteredChains.map(row=>row.name),
   newProducts:dashboardNewProductsSnapshot().rows.map(row=>row.category),keyProducts:dashboardKeyProductsSnapshot().rows.map(row=>row.category)
  };
 });
 for(const [key,values] of Object.entries(chainData)){
  assert(values.length,key+' 应有样例数据');assert(values.every(value=>value===(key==='risk'?0:'清洁')),key+' 应按授权取数');
 }
 await home.locator('#cost [data-cc-view="department"]').click();
 assert.deepEqual(await home.locator('#costtable [data-cc-row]').evaluateAll(nodes=>nodes.map(node=>node.dataset.ccRow)),['product']);
 await home.locator('#costtable [data-cc-department="product"]').click();
 assert.deepEqual(await page.locator('#drawer-tabs [role="tab"]').allTextContents(),['产品中心']);
 await page.locator('#close').click();
 await home.locator('[data-gd-part="execution"]').click();
 const report=home.getByRole('table',{name:'部门周报下载表'});
 assert.deepEqual(await report.getByRole('columnheader').allTextContents(),['统计周','产品中心','品质中心']);
 const week43=report.getByRole('row').filter({has:page.getByRole('rowheader',{name:/第43周/})});
 await week43.getByRole('button',{name:/周报操作.*产品中心/}).click();
 assert(await report.getByRole('menuitem',{name:'变更记录',exact:true}).isVisible());
 await report.getByRole('menuitem',{name:'上传周报',exact:true}).click();
 const upload=page.getByRole('dialog',{name:'上传周报',exact:true});
 await upload.waitFor();
 assert.match(await upload.locator('.pc-weekly-dialog-period').innerText(),/产品中心/);
 await upload.getByRole('button',{name:'取消',exact:true}).click();
}
