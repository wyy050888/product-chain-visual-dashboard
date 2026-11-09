// 经营数值引用当前事实；过程记录为原型示例，分别呈现修模、认证、工艺及BOM问题。
function gdExtraCoreSamples(context,records){
 const specs=[
  {key:'mold',projectId:7,title:'推进挂烫机水箱修模验收',summary:'完成水箱修模验收',department:'项目部',
   evidence:{suffix:'report',quote:'大水箱模具修模中，收到的样品有拉伤'},
   problem:facts=>`水箱样品存在拉伤，工厂已启动修模，但整改完成时间仍未回复。项目已延期 ${facts.delay} 天，修模验收与首批交付可能继续后移。`,
   roles:[['沈舟','与工厂锁定水箱修模、交样和首批交付日期。','修模、交样、首批交付三个节点均已书面确认。'],['王磊','复核水箱拉伤整改效果，确认模具修正及封样结论。','已完成拉伤复测并关联封样记录。'],['刘畅','完成整改样机验收，反馈能否进入首批生产。','已提交验收结论及首批放行条件。']]},
  {key:'certification',projectId:15,title:'锁定取暖器认证与备料节点',summary:'锁定认证交付日期',department:'品质中心',
   evidence:{suffix:'report',quote:'重新变更认证主体为明泰预计证书完成时间11/10'},
   problem:facts=>`认证主体变更需要重新出证；工厂已同步备料，正式证书仍待交付。项目已延期 ${facts.delay} 天，排产与上市节点可能继续后移。`,
   roles:[['刘畅','核对认证主体变更资料，与认证机构确认正式证书交付日期。','认证资料已齐套，正式证书交付日期已确认。'],['唐琪','核对备料齐套和工厂排产窗口，明确证书交付后的生产安排。','已取得备料清单及工厂排产确认。'],['沈舟','对齐认证、排产及上市排期，更新项目交付节点。','已发布一致的认证、排产与上市排期。']]},
  {key:'heater-cost',spuId:'SPU-SOURCE-002',title:'压缩取暖器重复装配成本',summary:'优化取暖器装配工艺',department:'采购部',
   evidence:{suffix:'process',quote:'工厂报价保留重复紧固工序'},
   problem:facts=>`发热组件与底座分段装配，重复紧固工序仍按旧工艺计价。已拆分工序清单，合并装配的节拍与安规验证尚未完成；当前利润率为 ${gdPercent(facts.profit)}，工序成本持续挤压盈利。`,
   notes:[['王磊','装配工艺复核','发热组件与底座目前分段装配，工厂报价保留重复紧固工序；已拆分工序清单，尚待完成合并装配的节拍及安规验证。']],
   previousActions:['与工厂逐项复核发热组件、底座及装配报价，确认降价条件和生效批次。','评估替代器件与装配方案，完成性能及安规影响验证。','复核降本后的利润测算，确认实施数量及切换节点。'],
   roles:[['唐琪','与工厂核对重复装配工序报价，确认工序合并后的计价及生效批次。','已取得新旧工序成本对比及生效批次。'],['王磊','验证组件预装和紧固工序合并，提交节拍及安规影响结论。','工艺节拍、性能及安规验证均有结论。'],['周铭','复核工艺切换后的利润测算，确认实施数量及切换节点。','利润改善测算、实施数量和切换日期均已确认。']]},
  {key:'food-processor-cost',spuId:'SPU-SOURCE-037',title:'推进辅食机BOM降本',summary:'落实辅食机BOM降本',department:'研发中心',
   evidence:{suffix:'process',quote:'杯体及刀组沿用打样阶段的非标专用件'},
   problem:facts=>`杯体及刀组仍沿用打样阶段的非标专用件，通用件适配尚未完成；已复核零件图纸，材料、密封和搅打验证仍待补齐。当前利润率为 ${gdPercent(facts.profit)}，专用件成本尚未得到改善。`,
   notes:[['王磊','非标件通用化','杯体及刀组沿用打样阶段的非标专用件，已复核零件图纸；通用件方案仍需食品接触材料、密封和搅打性能验证，尚未形成可切换BOM。']],
   roles:[['王磊','复核电机、杯体及刀组BOM，形成可验证的降本组合。','已提交分项成本对比及推荐BOM组合。'],['刘畅','验证替代方案的食品接触材料、密封和搅打性能。','已关联材料、密封及性能验证结论。'],['唐琪','取得工厂对新BOM的报价，确认起订量及切换批次。','书面报价、起订量和物料切换批次均已确认。']]}
 ];
 return specs.flatMap(spec=>{
  const isProject=spec.projectId!=null;
  const facts=context.by(isProject?'projects':'matrix').rows.find(row=>isProject?row.id===spec.projectId:row.spuId===spec.spuId);
  const criterion=facts&&gdCoreCriterion(facts);
  if(!criterion||(isProject?facts.id===context.project.id:facts.spuId===context.product.spuId))return [];
  const object=isProject?{key:'project|'+facts.id,name:facts.name,type:'project',projectId:facts.id,category:facts.category}:{key:'product|'+facts.spuId,name:facts.name,type:'product',spuId:facts.spuId};
  const id='work-core-'+spec.key;
  const fact={id:id+'-fact',objectKey:object.key,objectName:object.name,date:DATA_CUTOFF,
   source:(isProject?'项目进度':'关键产品')+'\n'+facts.name+'\n'+DATA_CUTOFF,
   content:isProject?`项目状态：${facts.projectState}\n预警：${facts.status}\n原计划上线日期：${facts.plan}\n延期：${facts.delay}天`:`产品分级：${facts.level}\n当前利润率：${gdPercent(facts.profit)}\n当前GSV：${gdMoney(facts.facts.gsvCents)}`};
  const sources=[fact];
  if(isProject&&facts.report)sources.push({id:id+'-report',objectKey:object.key,objectName:object.name,date:DATA_CUTOFF,
   source:'项目进度 · 当前日报\n'+facts.name+'\n'+DATA_CUTOFF,content:facts.report});
  for(const [owner,topic,content] of spec.notes||[]){
   const department=upTodoPersonDepartment(owner),date=shiftDate(DATA_CUTOFF,-1);
   sources.push({id:id+'-process',objectKey:object.key,objectName:object.name,owner,department,date,type:'日报',topic,
    source:`钉钉日报\n${owner} · ${department}\n${date}`,content});
  }
  records.push(...sources);
  return [{id,kind:'core',object,department:spec.department,priority:'P1',title:spec.title,summary:spec.summary,rolePlans:spec.roles,samplePreviousActions:spec.previousActions,
   problemSource:{sourceId:id+'-'+spec.evidence.suffix,quote:spec.evidence.quote},
   problem:spec.problem?spec.problem(facts):`${facts.level} 级产品当前利润率为 ${gdPercent(facts.profit)}，继续按现有盈利水平销售会扩大亏损。`,
   coreHit:criterion.description,sources}];
 });
}
