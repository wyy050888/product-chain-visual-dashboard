import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAiRequest,createAiStageRequest,validateAiOutput} from './ai-strategy-prompts.mjs';
import {applyAiFindingUpdates} from './ai-finding-updates.mjs';
import {bindKeyWorkAnalysis} from './ai-key-work-analysis.mjs';
const read=kind=>JSON.parse(fs.readFileSync(new URL('../../outputs/ai-five-source-20261106/inputs/'+kind+'/input.json',import.meta.url),'utf8'));
const sample=()=>({findings:[],updates:[]});
test('真实五来源请求无父聊天、旧模型答案或整份schema，口径完整随输入',()=>{
 for(const kind of ['total','product','shop','root']){
  const input=read(kind),request=createAiRequest(kind,input);
  assert.equal(request.messages.length,3);assert(request.messages[0].content.length+request.messages[1].content.length<2600);
  assert(!request.messages.some(m=>m.content.includes('"$defs"')));assert.equal(input.metric_definitions.length,30);
  assert(Object.values(input.source_status.source_counts).every(n=>n>0));
  assert(!input.prior_findings?.length);assert(!input.match_records);assert(!input.attention_units);
  assert(!request.output_schema.$defs.subject.properties.type.enum.includes('工厂'));
 }
});
test('未提交及手工任务隔离，重点工作只传已有规则事项',()=>{
 const input={...read('total'),rule_analysis_requests:['PRIVATE_RULE_MARKER'],unsubmitted:['PRIVATE_MISSING_MARKER'],candidates:['PRIVATE_RULE_MARKER'],prior_findings:[{finding_id:'PRIVATE_RULE_MARKER',rule_owned:true},{finding_id:'PRIVATE_MANUAL_MARKER',source:'manual'}]};
 const original=JSON.stringify(input);
 for(const request of [createAiRequest('total',input),createAiStageRequest('total',input,'repair')])assert(!request.messages[2].content.includes('PRIVATE_'));
 assert.equal(JSON.stringify(input),original);
});

test('重点工作AI只补充描述、行动、建议负责人，不能重选、漏项或覆盖灯色榜名',()=>{
 const base=read('total'),id=base.evidence[0].id;
 const item={rule_item_id:'ENGINEERING_ONLY',kind:'project_block',native_facts:{project_light:'高危红灯'},evidence_ids:[id]};
 const input={...base,key_work_items:[item]},request=createAiRequest('total',input);
 assert(request.messages[2].content.includes('ENGINEERING_ONLY'));
 assert(validateAiOutput(request,input,sample()).issues.some(i=>i.path==='$.key_work_analysis'));
 const analysis={rule_item_id:item.rule_item_id,problem:{text:'工程检查',basis:'事实',evidence_ids:[id]},actions:[]};
 assert.equal(validateAiOutput(request,input,{...sample(),key_work_analysis:[analysis]}).structural_contract_passed,true);
 assert.equal(validateAiOutput(request,input,{...sample(),key_work_analysis:[{...analysis,priority:'紧急'}]}).structural_contract_passed,false);
 const [first]=bindKeyWorkAnalysis([item],[analysis],'2026-11-06');
 assert.equal(first.native_facts.project_light,'高危红灯');assert.equal(item.ai_analysis,undefined);
 const [rechecked]=bindKeyWorkAnalysis([first],[analysis],'2026-11-07');
 assert.equal(rechecked.ai_analysis.updated_at,'2026-11-06');assert.equal(rechecked.ai_analysis.checked_at,'2026-11-07');assert.equal(rechecked.analysis_history.length,1);
 assert.throws(()=>bindKeyWorkAnalysis([item],[{...analysis,project_light:'绿灯'}],'2026-11-07'),/规则字段/);
 assert.throws(()=>bindKeyWorkAnalysis([item],[{...analysis,rule_item_id:'OTHER'}],'2026-11-07'),/逐项对应/);
});
test('错误来源、人员、主体或旧策略必须拒绝；校验不补写结果',()=>{
 const input=read('total'),request=createAiRequest('total',input);
 const output={findings:[{key:'engineering-only',category:'报告问题',subject:{type:'供应商',name:'工程检查',archive_id:'NOT_A_REAL_ID'},priority:'一般',problem:{text:'工程检查',basis:'推断',evidence_ids:['NOT_A_SOURCE']},actions:[],person_ids:['NOT_A_PERSON'],report_ids:[]}],updates:[]};
 const original=JSON.stringify(output),result=validateAiOutput(request,input,output);
 assert.equal(result.structural_contract_passed,false);assert(result.issues.some(i=>i.path.endsWith('.archive_id')));assert(result.issues.some(i=>i.path.endsWith('.evidence_ids')));assert(result.issues.some(i=>i.path.endsWith('.person_ids')));assert.equal(JSON.stringify(output),original);
 request.messages[0].content='ENGINEERING_ONLY_OLD_POLICY';assert(validateAiOutput(request,input,sample()).issues.some(i=>i.path==='$.messages[0]'));
});
test('四状态和全量未结续更；根因包含闭环且不得漏单',()=>{
 const input={...read('total'),prior_findings:[{finding_id:'ENGINEERING_ONLY'}]},request=createAiRequest('total',input);
 assert(validateAiOutput(request,input,sample()).issues.some(i=>i.path==='$.updates'));
 assert.deepEqual(request.output_schema.$defs.changes.properties.status.enum.filter(Boolean),['未开始','跟进中','已暂停','已完成']);
 assert(request.output_schema.$defs.changes.properties.status.enum.includes(''),'首次无法确认允许空值，不增加业务状态');
 const root=read('root'),rootRequest=createAiRequest('root',{...root,prior_findings:['OLD_GROUP'],previous_groups:['OLD_GROUP']});
 assert(!rootRequest.messages[2].content.includes('OLD_GROUP'));
 assert(root.root_risks.some(r=>r.closedVerification==='VERIFIED'));
 assert(validateAiOutput(rootRequest,root,{groups:[],unassigned:[]}).issues.some(i=>i.path==='$.groups'));
});
test('无新事实不刷更新日；主体纠正、退出和恢复保留原记录，手工任务隔离',()=>{
 const initial={finding_id:'ENGINEERING_ONLY',firstDetectedAt:'2026-11-03',lastUpdatedAt:'2026-11-03',history:[],finding:{key:'ENGINEERING_ONLY',status:'跟进中',subject:{type:'人员',name:'工程样本',archive_id:''},problem:{text:'既有问题',basis:'事实',evidence_ids:['old']},actions:[],person_ids:[],report_ids:['old-report']}};
 const unchanged=applyAiFindingUpdates([initial],[{finding_id:initial.finding_id,changes:{},reason:'无新事实',exit_reason:'',evidence_ids:[]}],'2026-11-04')[0];
 assert.equal(unchanged.firstDetectedAt,initial.firstDetectedAt);assert.equal(unchanged.lastUpdatedAt,initial.lastUpdatedAt);assert.equal(unchanged.lastCheckedAt,'2026-11-04');assert.equal(unchanged.history.length,0);
 const corrected=applyAiFindingUpdates([unchanged],[{finding_id:initial.finding_id,changes:{subject:{type:'供应商',name:'工程样本',archive_id:''}},reason:'原归属有误',exit_reason:'',evidence_ids:['source']}],'2026-11-05')[0];
 assert.equal(corrected.finding.subject.type,'供应商');assert.equal(corrected.history[0].previous.subject.type,'人员');assert.equal(initial.finding.subject.type,'人员');
 const exited=applyAiFindingUpdates([corrected],[{finding_id:initial.finding_id,changes:{},reason:'诊断撤回',exit_reason:'工程退出原因',evidence_ids:['source']}],'2026-11-06')[0];
 assert.equal(exited.finding.status,'跟进中');assert.equal(exited.firstDetectedAt,initial.firstDetectedAt);assert.equal(exited.history.length,2);
 assert.throws(()=>applyAiFindingUpdates([{...initial,source:'manual'}],[{finding_id:initial.finding_id,changes:{},evidence_ids:[]}],'2026-11-06'),/手工任务/);
 assert.throws(()=>applyAiFindingUpdates([initial],[],'2026-11-06'),/未全部回应/);
 const unknown={...initial,finding:{...initial.finding,status:''}};
 assert.equal(applyAiFindingUpdates([unknown],[{finding_id:unknown.finding_id,changes:{},reason:'仍无进度依据',exit_reason:'',evidence_ids:[]}],'2026-11-06')[0].finding.status,'');
 assert.throws(()=>applyAiFindingUpdates([unknown],[{finding_id:unknown.finding_id,changes:{status:'未开始'},reason:'没有明确依据',exit_reason:'',evidence_ids:[]}],'2026-11-06'),/缺少依据/);
});
