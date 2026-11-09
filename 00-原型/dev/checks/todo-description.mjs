import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifyTodoDescription(){
 const context=vm.createContext({esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/shared-classification/02-diagnosis-catalog.js',import.meta.url),'utf8'),context);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/07-todo-origin.js',import.meta.url),'utf8'),context);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/07-todo-description.js',import.meta.url),'utf8'),context);
 const facts='全平台页面利润率-13.0%，继续新增投入会扩大亏损风险。\n天猫总退18.6%，高于目标12.6%。';
 const reason='整改与供货存在前置依赖，应先确认原因。',period='2026-09-04 — 2026-09-10';
 const task={description:facts+'\n\n判断理由：'+reason+'\n统计期间：'+period+facts+'\n\n判断理由：'+reason+'\n统计期间：'+period,basis:[facts]};
 const original=JSON.stringify(task),parts=context.upTodoDescriptionParts(task);
 assert.deepEqual(Array.from(parts,p=>p.kind),['facts','reason','period']);
 assert.equal(parts[0].items.length,2);assert.equal(parts[1].items.length,1);assert.equal(parts[2].items.length,1);
 assert.equal(parts[2].items[0],period);assert.equal(JSON.stringify(task),original,'只整理展示，不覆盖原文');
 const text=context.upTodoDescriptionText(task);
 assert(text.includes(reason)&&text.includes(period),'同一描述保留判断和统计期间');
 assert.equal(context.upTodoDescriptionText({description:'长'.repeat(300),source:'manual'}),'长'.repeat(300),'不再生成另一个截短摘要');
 const manual={description:'保留手工内容。\n\n保留手工内容。',source:'manual'};
 assert.equal(context.upTodoDescriptionParts(manual)[0].items.length,2,'手工段落不去重');
 assert(!context.upTodoDescriptionMarkup({description:'<img src=x onerror=alert(1)>',source:'manual'}).includes('<img'));
 assert.equal(context.upTodoDescriptionMarkup({description:''}),'—');
 const current={source:'rule-suggestion',description:'事实依据（方案演示）：\n'+facts+'\n分析口径：截至2026-10-10；9月按门槛匹配A级，处于亏损状态。\n\n判断理由：'+reason+'\n统计期间：2026-01-01 — 2026-10-10'};
 assert.deepEqual(Array.from(context.upTodoDescriptionParts(current),p=>p.kind),['facts','reason','scope','period']);
 assert.equal(context.upTodoProblemSummary({...current,problemSummary:'利润率未达标'}),'利润率未达标');assert(context.upTodoHasEvidence(current));assert(!context.upTodoHasEvidence(manual));assert(context.upTodoEvidenceMarkup(current).includes('统计期间'));const withSignal={...current,gdAutomatic:true,gdProblem:'当前待核实问题',gdImpact:'当前影响'};assert(context.upTodoEvidenceMarkup(withSignal).includes('全平台页面利润率-13.0%'),'查看依据保留原下发事实，不被当前信号替换');assert.equal(context.upTodoProblemSummary(withSignal),'当前待核实问题');
}
