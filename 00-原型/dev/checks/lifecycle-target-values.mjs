import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 验证零计划、缺失计划和季度拆月，避免展示修正后取数仍把两者合并。
export function verifyLifecycleTargetValues(ctx){
 const grid=()=>vm.runInContext('ltEmptyGrid()',ctx),period={year:2026,mode:'year',value:1};
 for(const [values,state,value] of [[[0,0],'complete',0],[[0,5],'complete',5],[[0,null],'partial',null],[[null,null],'missing',null]]){
  assert.equal(ctx.ltAggregate(values).state,state);assert.equal(ctx.ltAggregate(values).value,value);
 }
 let values=grid();values[0][0]=[0,0,0,0];
 assert.equal(ctx.ltTargetFor(0,[0],period,false,values).value,0,'全年明确零计划汇总为0');
 assert.equal(ctx.ltTargetFor(0,[0],period,false,values).state,'complete');
 values[0][0]=[0,null,3,4];
 assert.equal(ctx.ltTargetFor(0,[0],period,false,values).value,null,'缺一个季度不能把部分合计冒充年度目标');
 assert.equal(ctx.ltTargetFor(0,[0],{...period,mode:'quarter',value:1},false,values).value,0);
 assert.equal(ctx.ltTargetFor(0,[0],{...period,mode:'quarter',value:2},false,values).value,null);
 values[0][0]=[1,0,0,0];
 assert.deepEqual([1,2,3].map(value=>ctx.ltTargetFor(0,[0],{...period,mode:'month',value},false,values).value),[1,0,0]);
 assert.equal(ctx.ltTargetFor(0,[0,1],period,false,values).state,'partial','链群零目标不是缺失，真正缺失的其他链群才导致不完整');
 const migrated=ctx.ltReadChainYear({values});
 assert.equal(migrated.values[0][0][1],0);assert.equal(migrated.values[1][0][0],null);
 const old=Array.from({length:5},()=>Array.from({length:9},()=>[0,0,0,0]));old[2][0][0]=null;
 assert.equal(ctx.ltReadChainYear({values:old}).values[3][0][0],null,'个护健康合并不能把缺失补0');
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/lifecycle-targets/02-dashboard.js',import.meta.url),'utf8')+'\n'+fs.readFileSync(new URL('../../src/modules/lifecycle-targets/03-view.js',import.meta.url),'utf8'),ctx);
 ctx.fmt=value=>String(value);
 assert.equal(ctx.ltTargetText({state:'complete',value:0}),'0');assert.equal(ctx.ltTargetText({state:'missing',value:null}),'—');
 assert.match(ctx.ltSummaryCell([0,0,0,0]),/>0</);assert.match(ctx.ltSummaryCell([0,null,0,0]),/>—</);
 const ratioSource=fs.readFileSync(new URL('../../src/modules/sales-review/01-model.js',import.meta.url),'utf8').split('\n').find(line=>line.startsWith('function msRatio('));
 vm.runInContext(ratioSource,ctx);
 assert.equal(ctx.msRatio(0,5),0);assert.equal(ctx.msRatio(5,0),null);assert.equal(ctx.msRatio(0,0),null);assert.equal(ctx.msRatio(5,null),null);
}
