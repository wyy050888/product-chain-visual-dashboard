// 钉钉抓取后的固定演示材料；topic为语义提取结果，不按关键词或人数直接判定。
function gdFocusMaterials(context){
 const {project,by,supplier}=context,quality=by('risk').rows.find(r=>r.gdRiskKind===0&&upIdentity(r)),product=quality?upProduct(upIdentity(quality)):null;
 const day=n=>shiftDate(DATA_CUTOFF,n),meeting=(row,subject,discussion,decision,owner)=>({file:'产品链重点工作例会.xlsx',sheet:'10月重点工作',row,date:day(-3),subject,discussion,decision,owner,due:day(-1)});
 const projectTopic='delivery|'+project.id,qualityTopic='quality|'+(product?.spuId||''),supplierTopic='admission|'+supplier.project.id;
 const expectations=[
  {id:'focus-direction-project',mode:'direction',topic:projectTopic,source:'projects',objectName:project.name,projectId:project.id,category:project.category,owner:'周铭',department:'产品中心',role:'参与重点项目样机验收评审，确认验收口径',start:day(-2),priority:'yellow',meeting:meeting(24,'重点项目样机交付',project.name+'为本周共同重点，沈舟统筹交付，林悦核对清单，周铭确认验收口径。','周铭参与样机验收评审，确认验收口径并反馈。','周铭')},
  {id:'focus-risk-product',mode:'risk',topic:qualityTopic,source:'risk',objectName:product?.name||'',spuId:product?.spuId,category:product?pfCategory(product):'',owner:'刘畅',department:'品质中心',role:'负责该产品品质风险复核及整改验证',start:day(-2),priority:'red',risk:{active:!!quality,text:quality?product.name+'进入'+quality.gdRiskTitle+'，风险仍在当前预警清单。':'',range:by('risk').range},meeting:meeting(28,'重点产品品质应对',product?product.name+'已进入品质风险预警，需要复核问题并安排整改验证。':'品质风险待确认。','刘畅牵头核实该产品风险，反馈复核动作和验证安排。','刘畅')},
  {id:'focus-interruption-supplier',mode:'interruption',topic:supplierTopic,source:'suppliers',objectName:supplier.project.name,projectId:supplier.project.id,category:pfCategory(supplier.project),owner:'唐琪',department:'采购部',role:'持续推进该项目供应商准入评审',start:day(-2),priority:'yellow',risk:{active:supplier.stats.admitted<stStandards(+DATA_CUTOFF.slice(0,4)).projectAdmitted,text:'该项目准入储备 '+supplier.stats.admitted+'，配置要求 '+stStandards(+DATA_CUTOFF.slice(0,4)).projectAdmitted+'，准入缺口仍存在。',range:by('suppliers').range},meeting:meeting(32,'项目供方准入推进',supplier.project.name+'已启动候选供应商资料核对，后续需持续反馈评审进展。','唐琪负责跟进资料预审与评审沟通，本周例会回收推进结果。','唐琪')},
  // 已批准的专项是反例：同事在做交付，研发仍应按分工做结构验证。
  {id:'focus-approved-specialty',mode:'direction',topic:projectTopic,source:'projects',owner:'王磊',department:'研发中心',role:'负责结构验证专项',start:day(-2),approvedSpecialty:true,meeting:meeting(35,'研发专项分工','交付协同期间，王磊继续承担已确认的结构验证专项。','王磊按专项计划推进，不参与本轮交付资料整理。','王磊')}
 ];
 const log=(id,owner,department,date,source,object,progress,topics=[])=>({id,type:'日报',owner,department,date,source,objectName:object.name||object.objectName||by(source).name,category:object.category||'全公司',spuId:object.spuId,projectId:object.projectId,deadline:gdReportDeadline(date),submitted:date+'T18:00:00+08:00',progress,problem:'暂无新增问题。',next:'继续按当前安排推进。',topics});
 const logs=[
  log('focus-log-direction-08','周铭','产品中心',day(-2),'projects',project,'整理常规新品宣传页，核对图文素材及版本。',['routine-materials']),
  log('focus-log-direction-09','周铭','产品中心',day(-1),'projects',project,'更新常规产品宣传资料，整理历史素材。',['routine-materials']),
  log('focus-log-peer-shen','沈舟','项目部',day(-2),'projects',project,'汇总'+project.name+'样机交付清单，组织验收评审。',[projectTopic]),
  log('focus-log-peer-lin','林悦','产品中心',day(-1),'projects',project,'核对'+project.name+'验收清单，反馈待确认口径。',[projectTopic]),
  log('focus-log-risk-08','刘畅','品质中心',day(-2),'risk',product||{},'整理常规来料抽检台账，归档历史检验记录。',['routine-inspection']),
  log('focus-log-risk-09','刘畅','品质中心',day(-1),'risk',product||{},'核对常规包装标识，更新抽检资料目录。',['routine-inspection']),
  log('focus-log-admission-start','唐琪','采购部',day(-3),'suppliers',{name:supplier.project.name},'已联系'+supplier.project.name+'候选供应商，开始核对准入评审资料。',[supplierTopic]),
  log('focus-log-admission-08','唐琪','采购部',day(-2),'suppliers',{name:supplier.project.name},'整理常规供方合同，核对结算资料。',['routine-contracts']),
  log('focus-log-admission-09','唐琪','采购部',day(-1),'suppliers',{name:supplier.project.name},'更新常规采购台账，整理合同归档。',['routine-contracts']),
  log('focus-log-specialty','王磊','研发中心',day(-1),'projects',project,'按会议确认的专项分工继续结构验证，记录测试结果。',['approved-validation'])
 ];
 // 抓取清单覆盖完整，才能比较“本期未见”；不把抓取缺口当作个人工作缺口。
 const coverage=['周铭','刘畅','唐琪','王磊'].map(owner=>({owner,start:day(-3),end:DATA_CUTOFF,complete:true}));
 return {expectations,logs,coverage};
}
