// 来源快照随任务保存；历史AI样例只使用原已保存的分析事实，不重算当期经营值。
function upTodoHasOrigin(task){
 return Boolean(task?.originEvidence?.sources?.some(source=>source.sourceName&&!/^(?:未记录来源名称|未记录|原待办保存记录(?:（.*）)?)$/.test(source.sourceName)&&String(source.content||'').trim()));
}
function upTodoOriginDate(value){
 const match=String(value||'').trim().match(/^(\d{4}|\d{2})[-/](\d{1,2})[-/](\d{1,2})(?=$|[T\s])/);if(!match)return '';
 const date=(match[1].length===2?'20':'')+match[1]+'-'+match[2].padStart(2,'0')+'-'+match[3].padStart(2,'0');
 return Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date?date:'';
}
function upTodoAutomaticOrigin(task){
 const sources=['rule-suggestion','demo-history','demo-cost-history','global-diagnosis','global-legacy','ai-business-followup','ai','sample'];
 if(sources.includes(task.source)||task.gdAutomatic===true)return true;
 // 旧自动任务可能只有稳定编号或下发日志；不把展示层统一的“AI自动下发”当作证据。
 if(/^(?:global-diagnosis\||global-legacy\||ai-business\||cost-reduction\||history\|(?:SPU-|shop:))/.test(task.id||''))return true;
 if(task.assignedBy==='AI'||task.logs?.some(log=>log.action==='assign'&&log.actor==='AI'))return true;
 // 兼容缺少source的旧亏损样例；必须同时匹配完整描述、固定行动及样例产品，不能只凭产品名归因。
 const product=typeof upSpus==='undefined'?null:upSpus.get(task.spuId),description=String(task.description||'').trim(),plan=String(task.plan||'').trim();
 return Boolean(product&&/^(?:全公司|抖音|天猫|京东|拼多多|快手|视频号)\s*·\s*亏损金额\s*[\d,.]+w[。.]?$/.test(description)&&/^复核定价、毛利与库存结构，制定销售去化或产品调整方案[。.]?$/.test(plan));
}
function upTodoWithOrigin(task){
 task=diagnosisNormalizeTaskObjects(task);
 if(upTodoHasOrigin(task)){
  const sources=task.originEvidence.sources.map(diagnosisNormalizeSource);
  return JSON.stringify(sources)===JSON.stringify(task.originEvidence.sources)?task:{...task,originEvidence:{...task.originEvidence,sources}};
 }
 if(task.source==='manual')return task;
 if(!upTodoAutomaticOrigin(task))return task;
 const basis=(task.basis||[]).map(String).filter(Boolean);
 const text=String(task.descriptionVersion===2?(task.gdProblem||basis.join('\n')):(task.description||task.gdProblem||'')).trim();
 if(!text&&!basis.length)return task;
 const name=String(task.objectName||task.businessObjects?.map(o=>o.name).filter(Boolean).join('、')||upSpus.get(task.spuId)?.name||task.title||'').trim();
 const date=[task.end,task.assignedAt,task.createdAt,...(task.logs||[]).filter(log=>log.action==='assign').map(log=>log.at)].map(upTodoOriginDate).find(Boolean);
 if(!name||!date)return task;
 const reason=text.match(/判断理由[：:]\s*([\s\S]*?)(?:\n\s*(?:统计期间|分析口径)[：:]|$)/)?.[1]?.trim()||task.gdProblem||text||basis.join('；');
 const facts=[...new Set([...basis,...text.split(/\n\s*\n/).filter(part=>!/^\s*(?:判断理由|统计期间)[：:]/.test(part)).map(part=>part.replace(/^事实依据(?:（[^）]*）)?[：:]\s*/,''))])];
 const sourceName=name+'AI经营诊断'+date.slice(2).replaceAll('-','');
 const content=['分析对象：'+name,...(task.start?['分析期间：'+task.start+' — '+date]:[]),...facts,'分析结论：'+reason].filter(Boolean).join('\n');
 return {...task,originEvidence:{version:1,mode:'ai',analysis:reason,sources:[diagnosisNormalizeSource({id:task.id+'|analysis',sourceType:'AI分析',sourceName,date,capturedAt:new Date().toISOString(),source:'AI分析\n'+sourceName+'\n'+date,content})]}};
}
