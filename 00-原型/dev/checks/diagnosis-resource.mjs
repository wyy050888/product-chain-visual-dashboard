import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

export function verifyResourceDiagnosis(audit){
 const box=vm.createContext({});
 vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/03-resource-diagnosis.js',import.meta.url),'utf8'),box);
 const compare={scope:'同一V3终稿复核',start:'2026-10-22',end:'2026-10-22',direction:'aligned',required:2,actual:2,unit:'人'};
 const category=patch=>box.gdResourceCategory({...compare,...patch});
 for(const actual of [0,1,2,3])assert.equal(category({actual}),null,'暂不诊断投入数量过剩或不足');
 assert.equal(category({direction:'deviated',actual:3}),'deviation','保留重点偏移诊断');
 for(const patch of [{scope:''},{start:''},{end:'2026-10-21'},{unit:''},{direction:''},{required:0},{required:null},{actual:null},{actual:-1}])assert.equal(category(patch),null,'缺失或不可比时不推断异常');
 const resources=audit.mismatch;
 assert.equal(resources.length,2);assert.equal(new Set(resources.map(r=>r.id)).size,2);
 assert(resources.every(r=>r.resourceType==='deviation'));
 for(const row of resources){assert.equal(box.gdResourceCategory(row.comparison),row.resourceType);assert(row.suggestion);assert(row.people.length);assert(row.sources.length>=2);assert(!row.task&&!row.workTaskId,'资源诊断不关联待办');assert(row.sources.every(s=>s.source&&s.content&&s.capturedDate))}
 const card=audit.counts.find(c=>c.key==='resource');assert.equal(card.count,2);assert.deepEqual(card.stats,[['工作聚焦',4],['重点偏移',2]]);
}
