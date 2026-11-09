import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {checkAiBusinessContract} from './ai-output-contract.mjs';
import {checkAiSchema} from './ai-json-schema.mjs';
import {prepareAiInput,assertNoRuleListsInDraft} from './ai-request-input.mjs';
import {aiOutputSchema,aiOutputNotes} from './ai-output-schema.mjs';
export {checkAiBusinessContract,prepareAiInput};
const base=new URL('../../01-文档/产品链总看板PRD-重构版/AI策略/',import.meta.url);
const names={common:'AI共用策略-岗位协作与决策建议.md',total:'总诊断-AI策略.md',product:'产品诊断-AI策略.md',shop:'店铺诊断-AI策略.md',root:'部门项目风险根因分析-AI策略.md'};
function instruction(text,stage='instructions'){
 text=text.replace(/\r\n/g,'\n');
 const titles={extract:'从文字和表格提取对象与事实','match-review':'主体匹配复核',review:'业务结果复核',repair:'结果修正'};
 const title=stage==='instructions'?(text.startsWith('# AI共用策略')?'共用角色与原则':text.startsWith('# 总诊断')?'总流程与任务编排':'提示词'):titles[stage];
 if(!title)throw new Error('未知提示词类型');
 const headings=[...text.matchAll(/^#{1,6}\s+(.+)$/gm)];
 const selected=headings.findIndex(h=>h[1].replace(/^\d+(?:[.．]\d+)*[.．]?\s*/,'')===title);
 if(selected<0)throw new Error('提示词小节缺失：'+title);
 const section=text.slice(headings[selected].index+headings[selected][0].length,headings[selected+1]?.index??text.length);
 const labels=[...section.matchAll(/^提示词[：:]\s*$/gm)];
 if(labels.length!==1)throw new Error('提示词正文缺失或重复：'+title);
 let body=section.slice(labels[0].index+labels[0][0].length).trim();
 const codeBlock=/^```text\n([\s\S]*?)\n```$/.exec(body);
 if(codeBlock)body=codeBlock[1].trim();
 if(!body)throw new Error('提示词正文为空：'+title);
 return body;
}
export function readAiStrategySources(){
 const docs=Object.fromEntries(Object.entries(names).map(([key,name])=>[key,fs.readFileSync(new URL(name,base),'utf8')]));
 const hashes=Object.fromEntries(Object.entries(docs).map(([key,text])=>[key,createHash('sha256').update(text).digest('hex')]));
 return {docs,hashes};
}
export function createAiRequest(kind,input){
 if(!['total','product','shop','root'].includes(kind))throw new Error('未知AI专项');
 input=prepareAiInput(kind,input);
 if(!input?.meta?.run_id||!input.meta.snapshot_id)throw new Error('缺少本次运行或快照身份');
 const {docs,hashes}=readAiStrategySources();
 const messages=[{role:'system',content:instruction(docs.common)},{role:'developer',content:instruction(docs[kind])+'\n\n'+aiOutputNotes(kind)},{role:'user',content:JSON.stringify(input)}];
 const contractHash=createHash('sha256').update(aiOutputNotes(kind)+JSON.stringify(aiOutputSchema(kind))).digest('hex');
 return {schema_version:3,kind,run_id:input.meta.run_id,snapshot_id:input.meta.snapshot_id,strategy_hashes:{common:hashes.common,[kind]:hashes[kind],contract:contractHash},messages,output_schema:aiOutputSchema(kind)};
}
// 不修改原始响应；工程通过仍不能替代语义复核。
export function validateAiOutput(request,input,output){
 input=prepareAiInput(request.kind,input);
 const current=createAiRequest(request.kind,input),issues=[],{docs}=readAiStrategySources();
 // 正文以真正发送的指令核对；文档链接、审阅说明等附属内容变化不误判为旧生成策略。
 if(request.messages?.[0]?.content?.replace(/\r\n/g,'\n')!==instruction(docs.common))issues.push({path:'$.messages[0]',problem:'实际发送的共用策略不是当前正式指令'});
 if(!request.messages?.[1]?.content?.replace(/\r\n/g,'\n').startsWith(instruction(docs[request.kind])))issues.push({path:'$.messages[1]',problem:'实际发送的专项策略不是当前正式指令'});
 const contractChanged=request.strategy_hashes?.contract!==current.strategy_hashes.contract;
 const schemaUnchanged=JSON.stringify(request.output_schema)===JSON.stringify(current.output_schema);
 const emptyUpdatesCompatible=contractChanged&&!(input.prior_findings||[]).length&&!(output.updates||[]).length;
 if(contractChanged&&!schemaUnchanged&&!emptyUpdatesCompatible)issues.push({path:'$.strategy_hashes.contract',problem:'续更接口已变更，需要按本次接口重新生成'});
 issues.push(...checkAiSchema(output,current.output_schema,current.output_schema.$defs));
 issues.push(...checkAiBusinessContract(request.kind,input,output));
 return {structural_contract_passed:issues.length===0,actual_instructions_checked:true,same_schema_revalidated:contractChanged&&schemaUnchanged,empty_updates_revalidated:emptyUpdatesCompatible,semantic_review_required:true,can_publish_without_semantic_review:false,issues};
}
// 实际需要时才独立复核/修正，不强制多阶段流水线。
export function createAiStageRequest(kind,input,stage,{draft=null,validationIssues=[]}={}){
 if(!['extract','review','repair'].includes(stage))throw new Error('未知AI处理阶段');
 input=prepareAiInput(kind,input);assertNoRuleListsInDraft(kind,draft);
 const request=createAiRequest(kind,input),{docs}=readAiStrategySources();
 return {...request,stage,messages:[request.messages[0],{role:'developer',content:(stage!=='extract'?request.messages[1].content+'\n':'')+instruction(docs.common,stage)},{role:'user',content:JSON.stringify({input,draft,validation_issues:validationIssues})}]};
}
export function readAiPrompts(){
 const {hashes}=readAiStrategySources(),result={hashes};
 for(const kind of ['total','product','shop','root']){
  const request=createAiRequest(kind,{meta:{run_id:'拼接说明（非模型运行）',snapshot_id:'本次数据快照'},source_status:{},prior_findings:[]});
  result[kind]=request.messages.map((m,i)=>`【${i+1} / ${m.role}】\n${m.content}`).join('\n\n');
 }
 return result;
}
