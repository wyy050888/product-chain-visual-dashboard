import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 完成数只说明拟跳转条件，不改项目查询、不跳模块、不打开下市产品抽屉。
export async function lifecycleProjectLinks(page){
 await page.locator('a[href="#lifecycle"]').click();
 const types=['自研','自选','自研','自选','产品迭代','品质整改','研发创新'];
 const notice=(stage,period)=>stage===7?'点击跳转产品中心-预下市，筛选条件为：\n下市时间 = '+period:
  '点击跳转项目列表，筛选条件为：\n项目类型 = '+types[stage]+'\n'+(stage<2?'计划量产/完成日期':'立项日期')+' = '+period+'\n项目状态 ≠ 已取消、已暂停';
 // 同一天的完成记录中，取消/暂停不计入七类项目规划。
 const ctx=vm.createContext({window:{},filterCatalog:{chainByIndex:[]},periodFor:()=>({year:2026,mode:'month',value:10}),bounds:()=>({start:'2026-10-01',cutoff:'2026-10-31'}),ppProjectType:type=>type,pfCategory:row=>row.category,ppDate:value=>value,lifeChainMonthFacts:()=>[],renderLife:()=>{}});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/14-lifecycle-links.js',import.meta.url),'utf8'),ctx);
 for(const [stage,type] of ['自研开发','自选开发','自研开发','自选开发','产品迭代','品质整改','研发创新'].entries()){
  ctx.ppSourceRows=()=>['未开始','进行中','已完成','已暂停','已取消','已暂停/取消'].map((projectState,id)=>({id,type,category:'环境',projectState,actual:'2026-10-01',started:'2026-10-01'}));
  assert.deepEqual(Array.from(ctx.ppLifecycleCompletedProjects(stage,'period'),row=>row.projectState),['未开始','进行中','已完成']);
 }
 const before=await page.evaluate(()=>({state:projectPanoramaAudit().state,period:dashboardPeriodSnapshot().modules.projects}));
 const hash=new URL(page.url()).hash;
 await page.locator('#time-lifecycle [data-time-year]').selectOption('2025');
 for(const mode of ['month','quarter','year']){
  await page.locator(`#time-lifecycle [data-time-mode="${mode}"]`).click();
  if(mode!=='year')await page.locator('#time-lifecycle [data-time-value]').selectOption(mode==='month'?'2':'3');
  for(let stage=0;stage<8;stage++){
   const selected=await page.evaluate(()=>dashboardLifecycleSnapshot().stage);
   await page.locator('#lifecards .lifecard').nth(stage).locator('[data-lt-card-actual]').click();
   assert.equal(await page.locator('#toast').innerText(),notice(stage,mode==='year'?'2025年':mode==='month'?'2025年2月':'2025年第3季度'));
   assert.equal((await page.evaluate(()=>dashboardLifecycleSnapshot())).stage,selected,'卡片完成数字不切换规划');
   await page.locator('#lifecards .lifecard').nth(stage).click();
   const facts=await page.evaluate(()=>dashboardLifecycleSnapshot());
   assert.equal(facts.summary.actual,facts.chains.reduce((sum,row)=>sum+row.actual,0));
   for(const scope of mode==='year'?['period']:['period','year']){
    const period=scope==='year'||mode==='year'?'2025年':mode==='month'?'2025年2月':'2025年第3季度';
    const expected=notice(stage,period);
    const buttons=page.locator(`#lifetable [data-life-completed="${scope}"]`);
    assert.equal(await buttons.count(),5,'汇总及四个品链都保留完成数字入口');
    for(let row=0;row<5;row++){
     await buttons.nth(row).click();
     assert(await page.locator('#toast').isVisible());
     assert.equal(await page.locator('#toast').innerText(),expected+(row?'\n链群 = '+facts.chains[row-1].name:''));
     assert(await page.locator('#overlay').isHidden());
     assert.equal(new URL(page.url()).hash,hash);
    }
   }
   assert.deepEqual(await page.evaluate(()=>({state:projectPanoramaAudit().state,period:dashboardPeriodSnapshot().modules.projects})),before);
   assert.equal((await page.evaluate(()=>dashboardLifecycleSnapshot())).stage,stage);
  }
 }
 await page.locator('#time-lifecycle [data-time-mode="month"]').click();
 await page.locator('#time-lifecycle [data-time-year]').selectOption('2026');
 await page.locator('#lifecards .lifecard').first().click();
 console.log('通过：八类规划完成数Toast、月/季/年及年度列、汇总/品链、零值可点、无跳转/抽屉及项目条件保持');
}
