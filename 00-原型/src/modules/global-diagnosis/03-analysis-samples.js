// 演示来源以记录为单位组织；重点工作关联任务，其余资源与报告分析保持只读。
function gdAnalysisSamples(context){
 const {project,product,newProduct,supplier}=context,day=n=>shiftDate(DATA_CUTOFF,n),projectCore=gdCoreCriterion(project),productCore=gdCoreCriterion(product);
 const object=(key,name,type='product',extra={})=>({key,name,type,...extra});
 const objects={
  project:object('project|'+project.id,project.name,'project',{projectId:project.id}),
  product:object('product|'+product.spuId,product.name,'product',{spuId:product.spuId}),
  launch:object('product|'+newProduct.spuId,newProduct.name,'product',{spuId:newProduct.spuId}),
  supplier:object('admission|'+supplier.project.id,supplier.project.name,'project',{projectId:supplier.project.id})
 };
 const records=[],record=(id,obj,owner,topic,content,offset=-1,type='日报')=>{
  const department=upTodoPersonDepartment(owner),date=day(offset),entry={id,objectKey:obj.key,objectName:obj.name,objectType:obj.type,owner,department,topic,date,type,
   source:type==='会议纪要'?`钉钉文档 Excel\n产品链协同会议纪要.xlsx\n10月例会 · 第${records.length+8}行\n${date}`:`钉钉${type}\n${owner} · ${department}\n${date}`,content};
  records.push(entry);return entry;
 };
 const pricing=[record('price-purchase',objects.product,'唐琪','报价降本','已向工厂提交电机与外壳分项议价清单，正在核对阶梯报价和生效批次。'),record('price-engineering',objects.product,'王磊','报价降本','已核对电机替代规格及结构成本，输出两种物料组合的成本差异。'),record('price-product',objects.product,'周铭','报价降本','已汇总渠道毛利缺口，复核议价后的利润改善测算。')];
 const quality=[record('quality-review',objects.product,'刘畅','退货品质复核','抽取退货样机复现吸力衰减，记录电机温升与滤网堵塞情况。'),record('quality-user',objects.product,'林悦','退货品质复核','已整理售后问题分布，向品质反馈吸力衰减和噪音投诉样本。')];
 const delivery=[record('delivery-project',objects.project,'沈舟','样机交付','已汇总样机清单和未闭环节点，协调工厂反馈分批到货时间；样机交付与检测排期尚未统一，最终交付节点仍待确认。',-2),record('delivery-purchase',objects.project,'唐琪','物料齐套','核对缺料表与采购在途，已取得工厂对关键电机到料日期的书面反馈。'),record('delivery-quality',objects.project,'刘畅','检测验收','核对安规和性能测试清单，预留样机复测窗口。'),record('delivery-product',objects.project,'林悦','样机交付','核对首发验收口径与样机数量，整理渠道验收清单。')];
 const launch=[record('launch-plan',objects.launch,'林悦','首发批次方案','已收集全渠道首发与小范围试销的备货条件，首发批次方案尚未形成。'),record('launch-capacity',objects.launch,'唐琪','首发批次方案','工厂已反馈最小起订量与分批交货周期；两种首发方案尚未完成成本对比。'),record('launch-channel',objects.launch,'陈嘉','渠道准备','核对首发渠道铺货清单与详情素材，等待最终上市批次确认。')];
 const admission=record('admission-meeting',objects.supplier,'唐琪','供方准入','采购已收到候选供方样品，品质需先确认检测标准才能发样；检测结论又是准入评审的前置条件。',-2,'会议纪要');
 const packageMeeting=record('package-meeting',objects.launch,'陈嘉','包装定版','研发已提交结构尺寸，包装刀模仍待产品中心确认卖点文案；采购需等刀模定版才能安排包材打样。',-2,'会议纪要');
 const solution=record('solution-meeting',objects.project,'沈舟','外部检测方案','内部可靠性设备本月排满，会上提出外部检测；尚未形成含机构资质、检测费用、报告周期的可执行方案。',-2,'会议纪要');
 const expected=record('focus-required',objects.project,'周铭','样机验收分工','本周周铭应完成样机验收口径确认，作为渠道验收的前置工作；不安排历史宣传素材整理。',-3,'会议纪要');
 const archived=object('business|historical-material','历史产品宣传素材','');
 const diverted=[record('focus-observed-1',archived,'周铭','历史素材归档','当天工作为整理历史产品宣传页，更新素材目录。',-2),record('focus-observed-2',archived,'周铭','历史素材归档','继续整理历史宣传素材，未记录验收口径确认进展。',-1)];
 const qualityExpected=record('quality-required',objects.product,'许宁','售后原因分析分工','许宁本周负责汇总退货原因并回传品质；常规包装图审核已同意后移。',-3,'会议纪要');
 const qualityDiverted=[record('quality-observed',objects.product,'许宁','常规包装图审核','本周主要审核常规包装图，退货原因分类工作尚未开始。',-1,'周报')];
 const extraCore=gdExtraCoreSamples(context,records);
 const omissions=gdOmissionSamples(context,records);
 const priorities=gdPrioritySamples(context,records);
 const coordination=gdCoordinationSamples(objects,record);
 const work=[
  ...(projectCore?[{id:'work-core-delivery',problemSource:{sourceId:'delivery-project',quote:'样机交付与检测排期尚未统一'},kind:'core',object:objects.project,department:'项目部',priority:'P1',title:'保障关键项目样机交付',problem:`样机交付与检测节点仍未对齐；虽已整理样机清单、跟进到料并预留复测窗口，统一交期仍未确定。项目已延期 ${project.delay} 天，验收和上市可能继续后移。`,summary:'锁定样机交付节点',coreHit:projectCore.description,sources:[{id:'project-delay-fact',date:DATA_CUTOFF,source:'项目进度\n'+project.name+'\n'+DATA_CUTOFF,content:'项目状态：'+project.projectState+'\n预警：'+project.status+'\n延期：'+project.delay+'天'},...delivery]}]:[]),
  ...(productCore?[{id:'work-core-margin',problemSource:{sourceId:'price-purchase',quote:'正在核对阶梯报价和生效批次'},kind:'core',object:objects.product,department:'采购部',priority:'P1',title:'跟工厂协商降本',problem:`当前利润率为 ${gdPercent(product.profit)}；已提交议价清单并比较物料成本，阶梯报价及生效批次仍在核对，继续按现有盈利水平销售会扩大亏损。`,summary:'跟工厂协商降本',coreHit:productCore.description,sources:[{id:'product-profit-fact',date:DATA_CUTOFF,source:'关键产品\n'+product.name+'\n'+DATA_CUTOFF,content:'产品分级：'+product.level+'\n当前利润率：'+gdPercent(product.profit)},...pricing]}]:[]),
  ...extraCore,...priorities.core,...omissions,
  {id:'work-block-admission',problemSource:{sourceId:'admission-meeting',quote:'品质需先确认检测标准才能发样'},departments:["采购部","品质中心"],kind:'blocker',coordinationType:'blocked',object:objects.supplier,department:'采购部',priority:'P1',title:'打通样品检测与准入评审',problem:'样品检测标准尚未确认。采购虽已收到候选供方样品，仍无法安排发样，后续准入评审被检测环节阻塞。',summary:'对齐样品检测标准',sources:[admission],dependencies:['品质确认检测标准','采购安排发样','品质出具结论','采购组织准入评审']},
  {id:'work-block-package',problemSource:{sourceId:'package-meeting',quote:'包装刀模仍待产品中心确认卖点文案'},departments:["产品中心","研发中心","采购部"],kind:'blocker',coordinationType:'blocked',object:objects.launch,department:'产品中心',priority:'P2',title:'打通包装定版与包材打样',problem:'包装卖点文案尚未确认；研发已提交结构尺寸，刀模仍无法定版，采购包材打样排期受阻。',summary:'确认包装定版',sources:[packageMeeting],dependencies:['产品确认卖点文案','研发冻结包装刀模','采购启动包材打样']},
  ...coordination,
  {id:'work-solution-launch',problemSource:{sourceId:'launch-capacity',quote:'两种首发方案尚未完成成本对比'},departments:["产品中心","采购部"],kind:'solution',object:objects.launch,department:'产品中心',priority:'P1',title:'形成新品首发批次方案',problem:'首发批次的成本与供货条件尚未完成对比。两种首发方式的备货条件、工厂起订量及交期已收集，统一方案仍未形成，上市备货与渠道排期难以锁定。',summary:'形成首发批次方案',sources:launch.slice(0,2),gaps:['首批数量与渠道范围','两种方案的成本比较','方案结论与确认日期']},
  {id:'work-solution-test',problemSource:{sourceId:'solution-meeting',quote:'尚未形成含机构资质、检测费用、报告周期的可执行方案'},departments:["项目部","品质中心","采购部"],kind:'solution',object:objects.project,department:'品质中心',priority:'P2',title:'形成外部检测方案',problem:'内部可靠性设备本月排满；会上已提出外部检测，但尚未形成包含机构资质、费用及报告周期的可执行方案，可靠性验证仍无法排期。',summary:'形成外部检测方案',sources:[solution],gaps:['检测机构与资质','报价及费用承担','报告交付日期']}
 ];
 const mismatches=gdResourceSamples(objects,{expected,diverted,qualityExpected,qualityDiverted});
 // 当前演示批次统一抓取于截止日；原date保留日报、会议等业务日期。
 for(const source of new Set([...records,...work.flatMap(row=>row.sources),...mismatches.flatMap(row=>row.sources)])){source.capturedDate=DATA_CUTOFF;Object.assign(source,diagnosisNormalizeSource(source))}
 return {objects,records,work,mismatches,taskSamples:priorities.routine,focusRecords:[...pricing,...quality,...delivery,...launch,...diverted,...qualityDiverted]};
}
