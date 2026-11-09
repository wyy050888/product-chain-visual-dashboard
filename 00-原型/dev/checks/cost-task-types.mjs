import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifyCostTaskTypes(){
 const store={},sandbox={localStorage:{getItem:()=>JSON.stringify(store),setItem:()=>{}},window:{}};
 vm.createContext(sandbox);sandbox.window||={};vm.runInContext(fs.readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),sandbox);
 for(const name of ['shared-classification/02-diagnosis-catalog.js','unified-product/07-todo-collaboration-model.js','unified-product/07-todo-origin.js','unified-product/07-todo-model.js','cost-control/04-opportunity-model.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+name,import.meta.url),'utf8'),sandbox);
 const run=code=>vm.runInContext(code,sandbox);
 assert.equal(run("upTodoType({source:'manual',department:'采购部'})"),'other','手工任务不按负责人部门误判类型');
 assert.equal(run("upTodoType({suggestionKey:'cost-reduction',department:'研发中心'})"),'cost-reduction','降本任务转交研发后仍为降本');
 assert.equal(run("upTodoType({suggestionDepartment:'采购部',department:'品质中心'})"),'supply-optimization','旧自动任务按原始规则部门兼容');
 assert.equal(run("upNormalizeTodo({id:'cost-reduction|p|date',logs:[],status:'working'}).taskType"),'cost-reduction','旧降本任务迁移类型');
 run("var row={spuId:'p',taskId:'cost-reduction|p|date'};upTodos={purchase:{id:'purchase',spuId:'p',taskType:'supply-optimization',status:'working'}}");
 assert.equal(run('Boolean(ccSavedOpportunityTask(row))'),false,'普通采购待办不会标记为降本已下发');
 for(const status of ['pending','working','done']){
  run(`upTodos.cost={id:'cost',spuId:'p',source:'manual',taskType:'cost-reduction',status:'${status}'}`);
  assert.equal(run('ccSavedOpportunityTask(row).id'),'cost','各执行状态均识别为关联降本任务');
 }
 run("upTodos.cost.spuId='other'");assert.equal(run('Boolean(ccSavedOpportunityTask(row))'),false,'不同SPU不串状态');
 console.log('通过：任务类型兼容、跨部门类型保留及普通采购任务排除');
}
