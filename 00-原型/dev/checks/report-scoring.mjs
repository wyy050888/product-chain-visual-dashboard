import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function verifyDiagnosisModel(){
 const context=vm.createContext({});
 for(const file of ['03-report-employee-rubrics.js','03-report-rubrics.js','03-report-deduction-rules.js','03-report-scoring.js'])vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/'+file,import.meta.url),'utf8'),context);
 const run=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context));
 const profiles=run('Object.values(gdReportProfileCatalog).flatMap(c=>[c.director,...c.employees])');
 assert.equal(profiles.length,25);
 for(const profile of profiles){
  vm.runInContext('globalThis.testProfile='+JSON.stringify(profile),context);
  for(const row of profile.rows){
   vm.runInContext('globalThis.testRow='+JSON.stringify(row),context);
   const rules=run('gdReportIssueRules(testProfile,testRow[0])');assert(rules.length&&rules.every(r=>r.id&&r.label&&!Object.hasOwn(r,'points')));
   const diagnose=issues=>run('gdDiagnoseReportCheck(testProfile,testRow,"原文",'+JSON.stringify(issues)+')');
   assert.equal(diagnose([]).passed,true);
   const issue={ruleId:rules[0].id,problem:'已核实问题'},result=diagnose(Array(30).fill(issue));
   assert.equal(result.issues.length,1,'同一问题只记录一次');assert.equal(result.passed,false);
   for(const key of ['earned','loss','weight','score'])assert(!Object.hasOwn(result,key),'诊断不包含分值');
   assert.throws(()=>diagnose([{ruleId:'unknown',problem:'问题'}]),/无效报告诊断细项/);
   assert.throws(()=>diagnose([{ruleId:rules[0].id,problem:''}]),/无效报告诊断细项/);
  }
 }
}
// 保留历史检查命令名，当前验证问题诊断而非评分。
export async function reportScoring(page){
 verifyDiagnosisModel();
 const selection=vm.createContext({});
 vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/03-analysis-model.js',import.meta.url),'utf8'),selection);
 const edge=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
  const d={reports:[{id:'clean',findings:[]},{id:'blank',findings:[{problem:'  '}]},{id:'unread'},{id:'issue',findings:[{problem:'已核实问题'}]},{id:'daily',missing:true,type:'日报',findings:[]}]};
  return {quality:gdAnalysisRows(d,'execution','quality').map(r=>r.id),missing:gdAnalysisRows(d,'execution','missing').map(r=>r.id)};
 })())`,selection));
 assert.deepEqual(edge,{quality:[],missing:[]},'当前部门诊断只显示周报下载');
 const live=await page.evaluate(()=>({reports:globalDiagnosisAudit().reports,scoring:typeof gdReportIssueRules,drawer:typeof gdReportDiagnosisView}));
 assert.deepEqual(live,{reports:[],scoring:'undefined',drawer:'undefined'});
}
