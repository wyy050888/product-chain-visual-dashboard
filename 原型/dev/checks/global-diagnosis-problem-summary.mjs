import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifyCausalProblemModel(){
 const box={upTodoProblemSummary:task=>task.gdProblem||task.description||'待核实'};vm.createContext(box);
 for(const file of ['03-tasks.js','02-problem-summary.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/'+file,import.meta.url),'utf8'),box);
 const task={id:'original',source:'global-diagnosis',gdProblem:'保存的问题原文',status:'working',description:'原始会议材料',responsibilities:[{assignee:'沈舟',feedback:'已确认样机'}]},before=JSON.stringify(task);
 const project={id:'coordinate-project',kind:'block',projectId:0};assert.match(box.gdCausalProblem(project,task),/排期尚未统一.*采购、品质.*延期风险/);
 const supplier={id:'coordinate-supplier',kind:'block',projectId:1,admission:{actual:2,required:3}};
 const shortage=box.gdCausalProblem(supplier,task);assert(shortage.includes('仅2家'));assert(shortage.includes('至少3家'));assert(shortage.includes('供货及交付受影响的风险'));
 supplier.admission.actual=4;assert(!box.gdCausalProblem(supplier,task).includes('储备不足'),'达到数量要求后不能继续断言数量不足');
 const missing=box.gdCausalProblem({kind:'report',missing:true},task);assert(missing.includes('未匹配到'));assert(missing.includes('未提交或尚未同步仍待核实'));assert(!missing.includes('由于未提交'));
 const incomplete=box.gdCausalProblem({kind:'report',incomplete:true,progress:'已记录',reportProblem:'已记录',next:'',late:true},task);assert(incomplete.includes('“下一步安排”未填写'));assert(incomplete.includes('晚于应交时间'));assert(incomplete.includes('后续执行安排不明确'));
 for(const type of ['focus-direction','focus-risk-response','focus-interruption']){const text=box.gdCausalProblem({kind:'focus',issueType:type,focusEvidence:{risk:{active:true}}},task);assert(text.includes('无法核实'));assert(!text.includes('未开展工作'));assert(!/已复核|已整改/.test(text),'无来源时不补写已尝试的处理动作')}
 assert(!box.gdCausalProblem({kind:'focus',issueType:'focus-risk-response',focusEvidence:{risk:{active:false}}},task).includes('预警仍存在'));
 for(const id of ['decision-launch-batch','decision-test-route','decision-backup-supplier'])assert.match(box.gdCausalProblem({id,kind:'decision'},task),/尚未.*无法/);
 assert.equal(box.gdCausalProblem(project,{...task,source:'manual'}),task.gdProblem,'人工问题描述保留');assert.equal(JSON.stringify(task),before,'展示不修改原问题、反馈或办理状态');
 assert.equal(box.gdCausalProblem({id:'unknown',kind:'task'},task),task.gdProblem,'缺少来源时保留原文，不按句式补写原因或影响');
}
