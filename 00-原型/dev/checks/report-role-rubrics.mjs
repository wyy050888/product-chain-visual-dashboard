import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const displayTerms=vm.runInNewContext(readFileSync(new URL('../../src/modules/page-presentation/03-terminology.js',import.meta.url),'utf8').split('function formatDisplayedTerms')[0]+'\npresentationTermText');

const expectedRoles={
 '产品中心':['产品经理'],'项目部':['项目经理'],
 '品质中心':['PQM 品质链主','PQE质改工程师','实验室工程师','QC验货员','SQE 供应商质量工程师','体系工程师'],
 '研发中心':['ID设计师','结构工程师','硬件工程师','专利工程师','DQE工程师','模具工艺工程师'],
 '采购部':['采购专员'],'发货部':['发货专员'],'计划部':['计划管理专员','订单履约专员']
};
function verifyProfileModel(){
 const context=vm.createContext({});
 for(const file of ['03-report-employee-rubrics.js','03-report-rubrics.js'])vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/'+file,import.meta.url),'utf8'),context);
 const catalog=JSON.parse(vm.runInContext('JSON.stringify(gdReportProfileCatalog)',context));
 assert.deepEqual(Object.keys(catalog),Object.keys(expectedRoles));let count=0;
 for(const [department,profiles] of Object.entries(catalog)){
  assert.deepEqual(profiles.employees.map(p=>p.label),expectedRoles[department]);
  assert.equal(Object.hasOwn(profiles,'supervisor'),false,'主管标准已移除');
  for(const profile of [profiles.director,...profiles.employees]){
   count++;assert.equal(profile.rows.length,6);assert.equal(profile.rows.reduce((sum,row)=>sum+row[2],0),100);
   assert.deepEqual(profile.rows[0].slice(0,3),['object','业务对象',5]);assert.match(profile.rows[0][3],/每条工作/);assert.match(profile.rows[0][3],/指出具体条目/);
   assert.equal(new Set(profile.rows.map(row=>row[0])).size,6);
  }
 }
 assert.equal(count,25);assert.equal(new Set(Object.values(catalog).flatMap(p=>[p.director,...p.employees]).map(p=>JSON.stringify(p.rows))).size,25);
 const [planning,fulfillment]=catalog['计划部'].employees;
 assert.equal(planning.id,'planning-management-specialist');assert.equal(fulfillment.id,'order-fulfillment-specialist');
 const planText=planning.rows.map(r=>r[3]).join('\n'),fulfillText=fulfillment.rows.map(r=>r[3]).join('\n');
 for(const metric of ['库存周转率','断货次数','断货产品明细','运营提供、手工填写','翻新请购产品台数','返修周期','呆滞库存','调购单量','采购单量','人工向运营部门'])assert(planText.includes(metric),'计划管理指标：'+metric);
 for(const metric of ['采购单量','调货量（单）','按时交付的笔数/总订单笔数','实际交付量/计划订单量','返修机交付及时率','返修周期'])assert(fulfillText.includes(metric),'订单履约指标：'+metric);
 assert.equal(vm.runInContext("gdReportProfile('计划部','employee','planning-specialist')",context),null,'原混合岗位不得猜测为任一新岗位');
 assert.equal(vm.runInContext("gdReportProfile('产品中心','supervisor')",context),null,'不再匹配主管标准');
 assert.equal(vm.runInContext("gdReportProfile('研发中心','employee','project-manager')",context),null,'项目经理按确认归属项目部');
 assert.equal(vm.runInContext("gdReportProfile('项目部','employee','unknown')",context),null,'未知岗位不得套用第一个员工标准');
 assert.equal(vm.runInContext("gdReportProfile('产品中心','unknown','product-manager')",context),null);
 return catalog;
}
export async function reportRoleRubrics(page){
 const catalog=verifyProfileModel(),root=page.locator('#ai');
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="quality"]').click();
 const initial=await page.evaluate(()=>globalDiagnosisAudit());
 for(const report of initial.reports){
  const profile=catalog[report.department].employees.find(p=>p.id===report.role);assert(profile);assert.equal(report.position,profile.label);
  if(!report.missing)assert.deepEqual(report.checks.map(c=>[c.key,c.label,c.criterion]),profile.rows.map(([key,label,,criterion])=>[key,label,criterion]),'诊断按具名岗位匹配');
 }
 assert.equal(await root.locator('[data-gd-rubric],.gd-applied-rubric').count(),0);
 for(const department of ['发货部','计划部']){
  await root.locator('[data-gd-department="'+department+'"]').click();assert.equal(await root.locator('[data-report-row]').count(),0,'无报告时不补造诊断');
 }
 await root.locator('[data-gd-department="all"]').click();
 console.log('通过：25套岗位判断标准正确匹配问题诊断，无报告部门保持空态，不提供评分界面。');
}
