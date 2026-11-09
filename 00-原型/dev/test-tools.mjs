import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkPlan} from './check-plan.mjs';
import {checkSession,checkFingerprint} from './check-session.mjs';
import {tryProcessLock} from './process-lock.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
function fixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-dev-tools-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));return directory;
}
function child(code,args=[]){
 return new Promise((resolve,reject)=>{
  const process=spawn(globalThis.process.execPath,['--input-type=module','-e',code,...args],{windowsHide:true});let output='';
  process.stdout.on('data',data=>output+=data);process.stderr.on('data',data=>output+=data);process.on('error',reject);
  process.on('exit',code=>code===0?resolve(output):reject(new Error(output)));
 });
}
test('多范围去重、保留原范围扩展、显式专项及未知参数',()=>{
 const plan=checkPlan(root,['newAssessmentMatrix','newAssessmentSort','--plan'],{});
 assert(plan.names.includes('newAssessmentMatrix'));assert(plan.names.includes('newAssessmentSort'));assert(plan.names.includes('newSuccessHistoryUI'));
 assert.equal(plan.names.length,new Set(plan.names).size);assert(plan.planOnly);
 assert.deepEqual(checkPlan(root,['newAssessmentSort','--only'],{}).names,['newAssessmentSort']);
 assert.deepEqual(checkPlan(root,['risk'],{DASHBOARD_CHECK_NAMES:'newAssessmentSort,newAssessmentMatrix'}).names,['newAssessmentSort','newAssessmentMatrix']);
 assert.throws(()=>checkPlan(root,['missing-check'],{}),/未知检查范围/);assert.throws(()=>checkPlan(root,['--misspelled'],{}),/未知检查选项/);
});
test('139项原检查及别名均能按需载入',async()=>{
 const plan=checkPlan(root,['all'],{});assert(plan.names.length>=139);
 for(const name of plan.names){const entry=plan.catalog[name],module=await import(new URL(entry.file,import.meta.url));assert.equal(typeof module[entry.export],'function',name)}
 assert.deepEqual(plan.catalog.riskSeasonTabs.args,[[0,6]]);
 assert.equal(plan.catalog.todoExecutionGroups.export,plan.catalog.todoExecutionTable.export);
});
test('同版本复用、失败/变化不缓存、强制执行、环境失效',async t=>{
 const directory=fixture(t),plan={names:['a','b']},log=[],options={env:{},log:text=>log.push(text),fingerprint:()=>'v1'};let runs=0;
 const run=async names=>{runs++;assert.deepEqual(names,['a','b'])};
 await checkSession(directory,plan,run,options);assert.equal(runs,1);
 const busy=tryProcessLock(directory,'browser-check');
 try{assert.equal((await checkSession(directory,plan,run,options)).reused,2);assert.equal(runs,1)}finally{busy.release()}
 await checkSession(directory,{...plan,force:true},run,options);assert.equal(runs,2);
 await assert.rejects(checkSession(directory,plan,()=>{throw Error('failed')},{...options,fingerprint:()=>'v2'}),/failed/);
 let reads=0;await checkSession(directory,plan,run,{...options,fingerprint:()=>++reads<=2?'v3':'changed'});
 const cache=JSON.parse(fs.readFileSync(path.join(directory,'.dev-cache/check-results.json'),'utf8'));assert.equal(cache.fingerprint,'v1');
 await checkSession(directory,plan,run,{...options,env:{DASHBOARD_TEST_URL:'https://example.invalid'}});assert.equal(runs,4,'自定义URL不复用');
 await checkSession(directory,plan,run,{...options,env:{DASHBOARD_CHECK_REPORT:'metrics'}});assert.equal(runs,5,'性能报告不复用');
 assert(log.some(text=>text.includes('不进入复用缓存')));
});
test('跨进程相同检查仅执行一遍，等待进程复用结果',async t=>{
 const directory=fixture(t),module=new URL('./check-session.mjs',import.meta.url).href;
 const code=`import fs from 'node:fs';import path from 'node:path';import {checkSession} from ${JSON.stringify(module)};
  await checkSession(process.argv[1],{names:['same']},async()=>{fs.appendFileSync(path.join(process.argv[1],'runs'),'run\\n');await new Promise(r=>setTimeout(r,250))},{env:{},fingerprint:()=>'same'});`;
 const outputs=await Promise.all([child(code,[directory]),child(code,[directory])]);
 assert.equal(fs.readFileSync(path.join(directory,'runs'),'utf8'),'run\n');assert(outputs.some(text=>text.includes('复用已通过')));
 assert(!fs.existsSync(path.join(directory,'.dev-cache/browser-check.lock')));
});
test('监听单例、释放幂等、退出进程旧锁可回收',async t=>{
 const directory=fixture(t),first=tryProcessLock(directory,'watch');assert(first.release);assert(!tryProcessLock(directory,'watch').release);
 first.release();first.release();const next=tryProcessLock(directory,'watch');assert(next.release);next.release();
 const module=new URL('./process-lock.mjs',import.meta.url).href;
 await child(`import {tryProcessLock} from ${JSON.stringify(module)};tryProcessLock(process.argv[1],'watch');`,[directory]);
 const recovered=tryProcessLock(directory,'watch');assert(recovered.release);recovered.release();
});
test('指纹覆盖未登记源文件、模板图片、测试夹具与运行环境',t=>{
 const directory=fixture(t),write=(file,value)=>{const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
 write('manifest.json',JSON.stringify({template:'src/page.html',scripts:[],styles:[],images:[],pages:[]}));
 for(const file of ['build.mjs','dev.mjs','src/page.html','src/extra.js','assets/app.js','assets/template.xlsx','dev/fixture.csv'])write(file,'one');
 const hash=()=>checkFingerprint(directory,{}),before=hash();assert.equal(hash(),before);
 for(const file of ['src/extra.js','assets/template.xlsx','dev/fixture.csv']){const previous=hash();write(file,'two');assert.notEqual(hash(),previous,file)}
 assert.notEqual(checkFingerprint(directory,{DASHBOARD_BROWSER_PATH:'different'}),hash());
});
