// 首次查看产品时提供可流转的历史任务样例；与AI当前建议分开，用户操作后不覆盖。
function upEnsureTodoSamples(m,state){
 if(Object.values(upTodos).some(t=>t.spuId===state.spuId&&t.status!=='suggested'))return;
 const end=shiftDate(state.start,-1),sampleState={...state,platform:'all',start:shiftDate(end,-6),end};
 const previous=upDetailModel(sampleState),sources=upDiagnoseTodos(previous,sampleState).slice(0,5);
 if(!sources.length)return;
 const people={'产品中心':aiAssignees[m.product.chain]?.[0]||'林悦','项目部':'沈舟','品质中心':'刘畅','研发中心':'王磊','采购部':'唐琪'};
 const statuses=['pending','working','working','done','pending'],today=aiToday(),changes={};
 sources.forEach((source,i)=>{
  const id='history|'+source.id,assignee=people[source.department],assignedBy=assignee==='林悦'?'周铭':'林悦';
  const stamp=days=>shiftDate(today,days)+'T09:00:00+08:00';
  const evidence=source.department==='品质中心'?'演示处理记录：已提交订单、样品复现及原因分类，实际整改效果须按业务凭证验证。':source.department==='采购部'?'已按SKU核对仓内和工厂库存，提交呆滞去化及补货调整清单。':'已完成相关数据核查，提交整改方案及责任节点清单。';
  const logs=[{at:stamp(-3),actor:assignedBy,action:'assign',from:'suggested',to:'pending',note:''}];
  if(['working','done'].includes(statuses[i]))logs.push({at:stamp(-2),actor:assignee,action:'start',from:'pending',to:'working',note:''});
  if(statuses[i]==='done')logs.push({at:stamp(0),actor:assignee,action:'complete',from:'working',to:'done',note:evidence});
  changes[id]={...source,id,start:sampleState.start,end:sampleState.end,source:'demo-history',status:statuses[i],assignee,assignedBy,assignedAt:stamp(-3),priority:['P1','P2','P1','P3','P2'][i],due:shiftDate(today,[2,-1,1,-1,3][i]),evidence:statuses[i]==='done'?evidence:'',completedAt:statuses[i]==='done'?stamp(0):'',createdAt:stamp(-3),updatedAt:logs.at(-1).at,logs};
 });
 try{upPersistTodos({...upTodos,...changes})}catch(_){/* 不影响已有任务及AI建议查看。 */}
}
