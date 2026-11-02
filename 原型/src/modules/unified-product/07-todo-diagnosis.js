// 待办只读演示资料；同一产品/期间/部门稳定ID沿用，已下发及手工内容不覆盖。
function upTodoProblem(state,facts,reason){
 return '事实依据（方案演示）：\n'+facts.join('\n')+'\n\n判断理由：'+reason+'\n统计期间：'+state.start+' — '+state.end;
}
function upDiagnoseTodos(m,state){
 const full=upAiFullContext(m.product);m=full.model;state=full.state;
 const a=upAiAnalysis(m,state),d=a.demo,id=d.ids,g=a.assessment,by=key=>a.issues.find(i=>i.key===key);
 const profit=by('profit'),stock=by('stock'),returns=by('returns'),violations=by('violations'),object=upAiObject(m),items=[];
 const add=(department,title,focus,reason,plan,priority='yellow')=>{
  const facts=focus.filter(Boolean).map(i=>i.evidence);
  facts.push('分析口径：全量分析截至'+state.end+'；演示考核月'+(g.month||'待确认')+'；'+(g.grade?'按门槛匹配'+g.grade+'级'+(g.facts?.profitRate<0?'，处于亏损状态':''):'评级待确认')+'。');
  items.push({id:upTodoId(state,department),spuId:state.spuId,objectName:m.product.name,platform:'all',start:state.start,end:state.end,
   department,taskType:department==='品质中心'&&!returns?'compliance-remediation':upTodoType({department}),title,plan:'对象：'+object+'；SKU：'+d.sku+'。\n'+plan,status:'suggested',assignee:'',due:'',completedAt:'',assignedBy:'',assignedAt:'',priority:upTodoPriorityKey(priority),
   evidence:'',logs:[],problemSummary:focus.filter(Boolean).map(i=>i.title).join('；'),descriptionVersion:3,description:upTodoProblem(state,facts,reason),basis:facts,source:'rule-suggestion'});
 };
 add('产品中心',g.grade==='C'?'核定淘汰及一次挽救安排':'比较产品保留、改善与退出方案',[profit||stock||returns||a.issues[0]],
  '按页面利润率及渠道供价判断经营价值；单据证明数量和状态，降本条件来自采购日报，不能将试算当作已实现收益。',
  '依据'+id.cost+'成本档案、'+id.report+'采购日报和'+id.meeting+'会议记录，比较维持经营、降本、指引改进与退出的投入及利润；列明新增采购、库存处理和售后责任。'+
  (g.grade==='C'?'核对一次挽救记录及3个月改善条件，提出下市或一次挽救安排；计时起点不明标记待确认。':g.grade==='A'?'提交升级S所需的月GSV和页面利润率差距，按已确认期限跟踪半年预警。':g.grade==='S'?'核对年度BOM降本5%—8%进展及下一代产品储备，区分年度目标和本次报价。':g.grade==='B'?'提交需求验证及退货改善计划；达到A级月度GSV门槛后的升级规则标记待确认。':'记录未匹配条件，评级待确认但不影响方案比较。'),profit?'red':'yellow');
 const active=[profit,returns,violations,stock].filter(Boolean);
 if(active.length>=2)add('项目部','关联现有任务并跟进交付风险',active,
  '成本、供需和用户体验事项具有前置依赖，应复用已有任务，不能因汇报方案重复立项。',
  '在'+id.task+'跟踪品质复现、研发指引改进和费用评审；对'+id.risk+'核实'+id.purchase+'分期交付，记录计划与实际日期。原因确认和方案批准后才安排执行，凭测试、交付及利润复核记录验证结果。','red');
 if(returns||violations)add('品质中心',returns?'复现用户问题并提交原因结论':'核对违规原因并落实品质事项',[returns||violations],
  '演示品质周报未发现一致性技术异常；用户评价不能直接证明设计缺陷或供应商责任，不使用不存在的批次信息。',
  (returns?'联动用户中心整理'+a.rows.filter(r=>r.gap>0).map(r=>r.platform).join('、')+'订单、评价及样品；按'+id.inspection+'记录测试条件、复现结果、影响SKU和原因分类，复核使用指引改善效果。':'逐单核对处罚记录，质量事项关联'+id.inspection+'补充检验及整改证据，信息和履约事项转对应部门。')+'未复现时记录样品和条件，不直接判定无问题。',returns?'red':'yellow');
 if(returns)add('研发中心','验证指引改进与是否需要设计调整',[returns],
  '演示研发周报提出低投入指引改进，尚不能据此批准整机改版；须结合品质复现结果比较收益及费用。',
  '在'+id.task+'对照'+id.inspection+'复现结论，逐项修改说明指引及操作提示，提交前后对比、费用和用户验证结果。仅确认技术原因后另报结构或性能改动、费用、周期及测试标准，未经评审不转为已批准方案。');
 if(stock||profit||['S','A','B','C'].includes(g.grade))add('采购部',stock?'调整复购、未交订单与供应商报价条件':'核对报价向渠道成本的传导',[stock||profit||a.issues[0]],
  '供方为'+d.supplier+'；模拟日报记录降价条件'+(d.supply.extra?'要求新增采购'+fmt(d.supply.offerQty)+'台':'不要求追加采购')+'。比较价格时须同时核算需求、采购承诺及资金占用。',
  '向'+d.supplier+'取得'+id.report+'对应书面报价，明确适用SKU、订单、数量、起订量、生效期和付款条件。会同财务按'+id.cost+'核对工厂/品牌/公司/渠道供价及降价传导，避免模具、翻新或管理费重复计入。联动计划部按'+id.meeting+'需求核实'+id.purchase+'可交数量、日期及'+id.schedule+'排产，提交'+id.request+'复购的保留、延期或减量方案；发货部确认可售及待检数量。');
 ccAppendCostProposal(items,m.product);
 return items;
}
// 仅为未编辑的旧自动描述补充说明，保留已下发任务的操作内容、方案和状态。
function upTodoCanUpgrade(t){return !t.deletedAt&&t.source!=='manual'&&!t.descriptionVersion&&t.basis?.includes(t.description)}
function upUpgradeProductTodoDescriptions(state){
 const changes={},cache=new Map();
 for(const task of Object.values(upTodos).filter(t=>t.spuId===state.spuId&&upTodoCanUpgrade(t))){
  const key=task.start+'|'+task.end;
  if(!cache.has(key)){const s={...state,platform:'all',start:task.start,end:task.end};cache.set(key,upDiagnoseTodos(upDetailModel(s),s))}
  const proposal=cache.get(key).find(t=>t.department===(task.suggestionDepartment||task.department));
  changes[task.id]={...task,description:proposal?.description||upTodoProblem(task,task.basis,'依据实际订单及工作记录补充原因与交付结果，不作批次归因。'),descriptionVersion:3};
 }
 if(Object.keys(changes).length)upPersistTodos({...upTodos,...changes});
}
