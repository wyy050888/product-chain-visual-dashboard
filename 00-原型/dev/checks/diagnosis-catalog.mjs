import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifyDiagnosisCatalogModel(){
 const box=vm.createContext({esc:String});vm.runInContext(fs.readFileSync(new URL('../../src/modules/shared-classification/02-diagnosis-catalog.js',import.meta.url),'utf8'),box);
 const sources=vm.runInContext('diagnosisSourceTypes',box),objects=vm.runInContext('diagnosisObjectTypes',box);
 assert.equal(Object.keys(sources).length,32);assert.equal(new Set(Object.values(sources)).size,32);assert.deepEqual(Object.values(objects),['产品','项目','店铺','供应商','日志']);
 for(const [key,label] of Object.entries(sources)){assert.equal(box.diagnosisSourceType({sourceType:label}).key,key);assert.equal(box.diagnosisSourceType({sourceTypeKey:key}).label,label)}
 for(const [raw,key] of [['全局高危预警','risk-alert'],['项目进度 · 当前日报','project-daily'],['阶段进展','stage-task-progress'],['任务排期','project-schedule'],['来源扫描清单','ai-analysis'],['采购周报','ding-weekly']])assert.equal(box.diagnosisSourceType({sourceType:raw}).key,key);
 assert.notEqual(box.diagnosisSourceType({sourceType:'库存管理'}).key,box.diagnosisSourceType({sourceType:'库存管控'}).key,'库存管理与管控来源不合并');
 assert.equal(box.diagnosisSourceType({source:'钉钉文档 Excel\n产品链协同会议纪要.xlsx'}).key,'meeting-minutes');
 assert.equal(box.diagnosisSourceType({source:'钉钉文档 Excel\n报价附件.xlsx'}).key,'','Excel载体不等于会议纪要');
 for(const raw of ['未知外部附件','原待办保存记录（未保存具体来源定位）','__proto__','constructor'])assert.equal(box.diagnosisSourceType({sourceTypeKey:raw,sourceType:raw}).key,'','未知类型不虚构出处');
 const original={id:'saved',sourceType:'全局高危预警',sourceName:'原记录名',date:'2026-10-12',capturedDate:'2026-10-13',source:'原始定位',content:'原始数值29.0w'};
 const normalized=box.diagnosisNormalizeSource(original);assert.equal(normalized.sourceTypeKey,'risk-alert');assert.equal(normalized.sourceType,'风险预警');assert.equal(normalized.sourceTypeOriginal,original.sourceType);
 for(const key of ['id','sourceName','date','capturedDate','source','content'])assert.equal(normalized[key],original[key]);assert.equal(JSON.stringify(box.diagnosisNormalizeSource(normalized)),JSON.stringify(normalized),'重复归一不改事实');
 const task={businessObjects:[{type:'business',id:'archive',name:'历史宣传素材'}],status:'working',feedback:'保留反馈'},migrated=box.diagnosisNormalizeTaskObjects(task);
 assert.equal(migrated.businessObjects[0].type,'');assert.equal(migrated.businessObjects[0].typeOriginal,'business');assert.equal(migrated.businessObjects[0].name,task.businessObjects[0].name);assert.equal(migrated.feedback,task.feedback);assert.match(box.diagnosisObjectTag('business'),/未关联/);assert.doesNotMatch(box.diagnosisObjectTag('business'),/经营事项/);
}

export async function diagnosisCatalog(page){
 verifyDiagnosisCatalogModel();
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 await root.locator('[data-gd-part="resource"]').click();await root.locator('[data-gd-tab="focus"]').click();
 const initial=await audit();assert.equal(Object.keys(initial.catalog.sourceTypes).length,32);assert.equal(Object.keys(initial.catalog.objectTypes).length,5);
 for(const row of [...initial.work,...initial.mismatch,...initial.reports,...initial.focus])for(const source of row.sources){assert(initial.catalog.sourceTypes[source.sourceTypeKey],'所有当前样例都有固定来源键：'+source.source);assert.equal(source.sourceType,initial.catalog.sourceTypes[source.sourceTypeKey])}
 const unlinked=initial.focus.find(g=>g.objectName==='历史产品宣传素材');assert(unlinked);assert.equal(unlinked.object.type,'');assert.equal(await root.locator('[data-focus-object="'+unlinked.id+'"] [data-business-object-state=unlinked]').innerText(),'未关联');
 const legacy={...initial.tasks[0].task,id:'catalog-legacy-preserve',source:'manual',gdIssue:'catalog-legacy-only',title:'枚举兼容核对样例',objectName:'历史产品宣传素材',businessObjects:[{type:'business',id:'archive',name:'历史产品宣传素材'}],originEvidence:{version:1,mode:'records',analysis:'保留原判断',sources:[
  {id:'legacy-meeting',sourceType:'钉钉文档 Excel',sourceName:'产品链例会纪要.xlsx',date:'2026-10-21',capturedDate:'2026-10-23',content:'原会议决议：保留原数值29.0w。'},
  {id:'legacy-unknown',sourceType:'未知外部附件',sourceName:'未核实的原始附件',date:'2026-10-20',content:'仅保留原记录，不推断来源。'}]}};
 await page.evaluate(task=>{const data=JSON.parse(localStorage.getItem('product-risk-todos-v1'));data[task.id]=task;localStorage.setItem('product-risk-todos-v1',JSON.stringify(data))},legacy);await page.reload();
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1'))['catalog-legacy-preserve']),saved=await read();
 for(const key of ['id','status','assignedAt','due','responsibilities','logs'])assert.deepEqual(saved[key],legacy[key],'旧任务办理信息不改写：'+key);
 assert.equal(saved.businessObjects[0].type,'');assert.equal(saved.businessObjects[0].name,legacy.objectName);assert.equal(saved.originEvidence.sources[0].sourceTypeKey,'meeting-minutes');assert.equal(saved.originEvidence.sources[1].sourceTypeKey,'');
 for(let i=0;i<2;i++)for(const key of ['id','sourceName','date','content'])assert.equal(saved.originEvidence.sources[i][key],legacy.originEvidence.sources[i][key]);
 await root.locator('[data-gd-part="closure"]').click();await root.locator('[data-gd-search]').fill(legacy.title);await root.locator('[data-gd-task="'+legacy.id+'"] [data-gd-action]').click();
 const dialog=page.locator('.up-todo-dialog[open]');assert.equal(await dialog.locator('[data-business-object-state=unlinked]').first().innerText(),'未关联');await dialog.locator('[data-todo-evidence]').click();assert.deepEqual(await dialog.locator('[data-source-type]').allTextContents(),['会议纪要','未记录来源类型']);await dialog.locator('[data-todo-close]').click();
 await page.reload();assert.deepEqual(await read(),saved,'再次刷新不重复迁移或覆盖来源');
 console.log('通过：30类来源/5类对象、旧名称兼容、经营事项移除、未知来源缺失态、历史事实与办理信息保留、刷新幂等');
}
