// 按现有分级启用经营动作；C级仅在明确挽救失败后切入清仓，不同时默认挽救和退出。
const kpmStrategyCategories={cost:'降低成本／运费',quality:'品质整改',service:'售后改善',iteration:'产品迭代／储备',clearance:'清仓下市'};
const kpmStrategyScopes={S:['cost','iteration'],A:['cost','quality','iteration'],B:['cost','quality','service','iteration'],C:['cost','quality','iteration','clearance']};
// stage只表示根据经营证据计算的灯色，不写入任务状态。
const kpmStrategyResults={red:'红灯',yellow:'黄灯',green:'绿灯',unlinked:'未关联'};
const kpmStrategyTargets={S:'维持S级',A:'半年内提级',B:'半年内提级',C:'一次挽救后落实去留'};
// 分级历史演示锚点，与筛选期间和项目任务的开始日期独立；缺失时不生成倒计时。
const kpmStrategyGradeOrigins={'SPU-SOURCE-001':{grade:'A',start:'2026-03-01',due:'2026-09-01'},'SPU-SOURCE-018':{grade:'A',start:'2026-04-20',due:'2026-10-20'},'SPU-SOURCE-004':{grade:'B',start:'2026-05-01',due:'2026-11-01'}};
function kpmStrategyRescue(spuId,end){return kpmStrategySamples.find(r=>r.spuId===spuId&&r.category==='clearance'&&r.rescueDecisionAt<=end&&r.rescueResult==='未通过')}
function kpmStrategyCategoryEnabled(product,category,end){
 if(!kpmStrategyScopes[product.level]?.includes(category))return false;
 if(product.level!=='C')return true;
 const exit=!!kpmStrategyRescue(product.spuId,end);return category==='clearance'?exit:!exit;
}
function kpmStrategyIssue(product,category){return {cost:product.level==='S'?'cost':'profit',quality:'quality',service:'service',iteration:'iteration',clearance:'rescue'}[category]}
function kpmStrategyRelatedTask(product,category,records,end){
 const explicit=records.map(r=>r.taskId).filter(Boolean),issue=kpmStrategyIssue(product,category);
 const tasks=Object.values(upTodos).filter(t=>t.spuId===product.spuId&&t.status!=='suggested'&&(!t.assignedAt||t.assignedAt.slice(0,10)<=end));
 const legacy=kpmCycleSamples.find(r=>explicit.includes(kpmCycleTaskId(r)));
 return tasks.find(t=>explicit.includes(t.id))||(legacy?kpmCycleTask(legacy,product):null)||tasks.find(t=>t.strategyCategory===category)||tasks.find(t=>!t.strategyCategory&&(t.managementIssue===issue||category==='cost'&&t.suggestionKey==='cost-reduction'))||null;
}
function kpmStrategyItems(rows,category=null){
 const end=upWindow().end,items=[];
 for(const product of rows)for(const key of category?[category]:Object.keys(kpmStrategyCategories)){
  if(!kpmStrategyCategoryEnabled(product,key,end))continue;
  const records=kpmStrategySamples.filter(r=>r.spuId===product.spuId&&r.category===key&&r.opened<=end),related=kpmStrategyRelatedTask(product,key,records,end),task=related?kpmStrategyTaskSnapshot(related,end):null;
  const activities=records.map(r=>kpmStrategyActivity(r,product,end)),active=activities.length||task&&!task.deletedAt;
  const stage=!active?'unlinked':activities.some(a=>a.stage==='red')?'red':!activities.length||activities.some(a=>a.stage==='yellow')?'yellow':'green';
  const item={id:product.spuId+'|'+key,product,strategyCategory:key,activities,task,stage,cutoff:end,view:'cycles',goal:kpmStrategyGoal(product,end)};
  item.advice=kpmStrategyAdvice(item);item.task=task?kpmStrategyTaskSnapshot(kpmCollaborativeTask(task,item.advice),end):null;items.push(item);
 }
 return items;
}
function kpmStrategyGoal(product,end){
 const grade=product.level,origin=kpmStrategyGradeOrigins[product.spuId],exit=kpmStrategyRescue(product.spuId,end);
 if(grade==='C')return exit?'一次挽救未通过 → 清仓下市':product.spuId==='SPU-SOURCE-042'?'一次挽救验证中':'一次挽救 · 记录待核实';
 if(['A','B'].includes(grade))return kpmStrategyTargets[grade]+(origin?.grade===grade&&origin.start<=end?' · 截止'+presentationDateText(origin.due):' · 起点待核实');
 return kpmStrategyTargets[grade]||'分级待核实';
}
function kpmStrategyGroups(rows){
 const items=kpmStrategyItems(rows),groups=[];
 for(const category of Object.keys(kpmStrategyCategories)){
  const matched=items.filter(i=>i.strategyCategory===category);if(!matched.length)continue;
  for(const stage of ['all',...Object.keys(kpmStrategyResults)]){
   const scope=stage==='all'?matched:matched.filter(i=>i.stage===stage);
   groups.push({key:'strategy-'+category+'-'+stage,category,stage,label:kpmStrategyCategories[category]+(stage==='all'?'':' · '+kpmStrategyResults[stage]),tone:stage==='unlinked'||stage==='all'?'neutral':stage,ids:[...new Set(scope.map(i=>i.product.spuId))]});
  }
 }
 return groups;
}

// 历史回看不显示后来提交的个人反馈或完成日期；编辑入口仍读取同ID当前任务。
function kpmStrategyTaskSnapshot(task,end){
 if(end>=aiToday())return task;
 const responsibilities=task.responsibilities?.map(r=>r.updatedAt?.slice(0,10)>end?{...r,status:'pending',feedback:'',completedAt:''}:r.completedAt?.slice(0,10)>end?{...r,status:'working',completedAt:''}:r);
 return upTodoAggregate({...task,responsibilities,status:task.completedAt?.slice(0,10)>end?'working':task.status,completedAt:task.completedAt?.slice(0,10)>end?'':task.completedAt,evidence:task.updatedAt?.slice(0,10)>end?'':task.evidence});
}
