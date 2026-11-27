// 各看板复用权限控件，授权数据按看板独立保存。
const rmDepartmentNames=[...filterCatalog.primaryDepartments,'发货部','计划部'];
const rmDepartmentReportNames=rmDepartmentNames.map(name=>name+'周报');
const rmReportNames=['产品链总周报',...rmDepartmentReportNames];
const rmChainScopes=[['full','全部'],['chain','按用户关联链群']];
const rmModule=(id,name,type='chain',extra={})=>({id,name,type,...extra});
const rmGroup=(id,name,children)=>({id,name,children});
const qcDepartment='品质中心';
const qcRoles=[['pqm','PQM 品质链主'],['pqe','PQE 质改工程师'],['lab','实验室工程师'],['sqe','SQE 供应商质量工程师'],['system','体系工程师']];
const rmQualityRankings=[
 rmModule('violation','产品违规榜'),rmModule('returns-worse','退货恶化榜'),rmModule('returns-gap','退货偏差榜'),
 rmModule('store-risk','店铺风险榜','shared')
];
const rmProductRankings=[
 rmModule('launch-delay','上品延期榜'),rmModule('pickup-unsold','已提货未销售'),
 rmModule('launch-materials','上市资料预警'),rmModule('project-planning','立项规划预警')
];
const rmStockRankings=[rmModule('stale-warning','呆滞预警榜（实时）'),rmModule('shortage-warning','缺货预警榜（实时）')];
const rmAiModules=rmGroup('ai','AI 总诊断',[
 rmModule('key-work','重点工作清单','department'),rmModule('deviation','工作偏差预警','department'),
 rmModule('weekly-report','部门诊断','report'),rmModule('tasks','任务清单','department')
]);
const rmPeopleModule=rmGroup('personnel','人员管理',[
 rmModule('rating','人员评分','shared'),rmModule('people-metrics','关键指标大盘')
]);
const rmProjectProgressModule=rmModule('projects','项目进度','chain',{
 note:'项目进度按链群授权，部门风险根因分析单独授权',
 children:[rmModule('project-risk','部门风险根因分析','department-picker',{departmentOptions:()=>ppDepartments.map(name=>[name,name])})]
});
const rmCommonModules=[
 rmModule('sales','销售达成'),rmModule('new','新品专项'),rmProjectProgressModule,
 rmModule('lifecycle','产品全生命周期','chain',{children:[rmModule('brand','品牌下钻','brand')]}),
 rmModule('key-products','关键产品'),rmModule('inventory','库存管控')
];
const rmSuppliersModule=rmGroup('suppliers','供应链采购',[
 rmModule('strategic-suppliers','核心战略合作供应商','shared'),
 rmModule('sourcing','产品寻源预警'),rmModule('category-reserve','类目准入储备'),rmModule('core-materials','核心物料供应商')
]);
const rmCostModule=rmModule('cost','降本增效','department-picker',{departmentOptions:()=>ccDepartments.map(({id,name})=>[id,name])});
const rmQualityModules=[
 rmGroup('director','总监看板',[
  rmGroup('risk','风险预警',rmQualityRankings),
  rmAiModules,
  rmGroup('personnel','人员管理',[rmPeopleModule.children[0],rmModule('people-metrics','人员指标大盘')]),
  rmCommonModules.find(item=>item.id==='new'),
  {...rmProjectProgressModule,children:rmProjectProgressModule.children.map(item=>({...item,defaultDepartments:[qcDepartment]}))},
  rmModule('cost-benefit','品质整改项目成本收益台账'),
  rmCommonModules.find(item=>item.id==='lifecycle'),
  rmCommonModules.find(item=>item.id==='key-products'),
  {...rmCostModule,defaultDepartments:['quality']}
 ]),
 rmGroup('role-boards','岗位看板',qcRoles.map(([id,label])=>rmModule('board-'+id,label,'shared')))
];
const rmBoards=[
 {id:'total',name:'总看板',modules:[rmGroup('risk','风险预警',[
  ...rmQualityRankings,...rmStockRankings,rmModule('loss','亏损产品榜')
 ]),rmAiModules,...rmCommonModules,rmSuppliersModule,rmCostModule]},
 {id:'product',name:'产品中心',department:'产品中心',modules:[rmGroup('risk','风险预警',[
  ...rmProductRankings,...rmQualityRankings,rmModule('loss','亏损产品榜')
 ]),rmAiModules,rmPeopleModule,...rmCommonModules,rmCostModule]},
 {id:'quality',name:qcDepartment,department:qcDepartment,modules:rmQualityModules},
 {id:'procurement',name:'采购部',department:'采购部',modules:[
  rmGroup('proc-risk','风险预警',[
   rmGroup('proc-supplier-warning','供应商预警',[
    rmModule('proc-supplier-introduction-delay','引入延期预警'),rmModule('proc-supplier-information-missing','供应商信息缺失预警'),
    rmModule('proc-supplier-qualification-validity','资质有效性预警'),rmModule('proc-supplier-quality','劣质供应商预警'),
    rmModule('proc-supplier-legal-risk','行政法律风险预警')
   ]),
   rmGroup('proc-cost-warning','成本管控预警',[
    rmModule('proc-cost-over-target','超目标成本预警'),rmModule('proc-cost-over-requirement','超费率标准预警'),
    rmModule('proc-mold-amortization-complete','模具分摊完毕预警'),rmModule('proc-refurbishment-cost','翻新费用预警'),
    rmModule('proc-material-large-fluctuation','物料大额波动预警','shared')
   ]),
   rmModule('proc-project-delay','项目延期预警'),rmModule('proc-order-delivery','订单交付预警'),
   rmModule('proc-new-product-high-return','新品高退货率'),rmModule('proc-sales-scale-miss','亏损产品预警'),
   rmModule('proc-contract-expiry','合同到期预警')
  ]),
  rmGroup('proc-ai','AI 总诊断',[
   rmModule('proc-key-work','重点工作清单','department'),rmModule('proc-deviation','工作偏差预警','department'),
   rmModule('proc-department-diagnosis','部门诊断','report'),rmModule('proc-tasks','任务清单','department')
  ]),
  rmGroup('proc-department','部门管理',[
   rmModule('proc-staff-rating','人员评分','shared'),
   rmGroup('proc-department-metrics','关键指标大盘',[
    rmGroup('proc-supply-chain','供应链采购',[
     rmModule('proc-strategic-suppliers','核心战略合作供应商','shared'),rmModule('proc-sourcing','产品寻源预警'),
     rmModule('proc-category-reserve','类目准入储备'),rmModule('proc-core-materials','核心物料供应商')
    ]),
    rmGroup('proc-selection','自选品管理',[
     rmModule('proc-selection-overview','全景总览'),rmModule('proc-selection-analysis','分指标多维分析'),
     rmModule('proc-selection-new-product','新品指标分析'),rmModule('proc-selection-delay','产品延期榜单'),
     rmModule('proc-selection-elimination','自选品接需量统计')
    ]),
    rmModule('proc-quote','报价管理'),rmModule('proc-contract','合同管理'),rmModule('proc-project-management','项目管理')
   ])
  ]),
  rmGroup('proc-cost-control','成本管控',[
   rmModule('proc-cost-efficiency','降本增效','department-picker',{departmentOptions:rmCostModule.departmentOptions}),
   rmModule('proc-mold-fee','模具费'),rmModule('proc-refurbishment-fee','翻新费')
  ]),
  {...rmProjectProgressModule,id:'proc-project-progress'},
  rmModule('proc-lifecycle','产品生命周期'),rmModule('proc-new-product','新品专项'),rmModule('proc-key-product','关键产品')
 ]},
 {id:'supply-chain-center',name:'供应链中心',modules:[
  rmGroup('scc-planning','计划管理部',[
   rmModule('scc-inventory-turnover','库存周转率','shared'),rmModule('scc-risk-warning','风险预警','shared'),
   rmModule('scc-stale-products','呆滞产品','shared'),rmModule('scc-refurbished-statistics','翻新机统计','shared'),
   rmModule('scc-personnel-indicators','人员指标','shared')
  ]),
  rmGroup('scc-order-fulfillment','订单履约部',[
   rmModule('scc-purchase-order-statistics','采购单统计','shared'),rmModule('scc-order-refurbished-statistics','翻新机统计','shared'),
   rmModule('scc-delivery-timeliness','交付及时率','shared')
  ]),
  rmGroup('scc-shipping','发货部',[rmModule('scc-department-indicators','部门指标','shared')])
 ]}
];

function rmBoardModuleEntries(items,parents=[]){
 return items.flatMap(item=>[{item,parents},...rmBoardModuleEntries(item.children||[],[...parents,item.id])]);
}
function rmDashboardItems(board){
 return rmBoardModuleEntries(board.modules).map(({item})=>item).filter(item=>item.type);
}
function rmHasModuleScope(item,access){
 const grants=Object.values(access.departments[item.id]||{});
 return [access.scopes[item.id],...grants].some(scope=>scope==='full'||scope==='chain');
}
function rmDefaultDepartmentScopes(board){
 return board.department?{[board.department]:'chain'}:{};
}
function rmDefaultReportScope(board){
 return board.department?[board.department+'周报']:[];
}
function rmNewDashboardAccess(board){
 const departments=Object.fromEntries(rmDashboardItems(board).flatMap(item=>{
  if(item.type==='department'&&board.department)return [[item.id,rmDefaultDepartmentScopes(board)]];
  return item.defaultDepartments?[[item.id,rmDepartmentGrants(item.defaultDepartments)]]:[];
 }));
 return {modules:[],scopes:{},departments,reportScope:rmDefaultReportScope(board)};
}
function rmExampleDashboardAccess(board,kind){
 const access=rmNewDashboardAccess(board);
 const director=kind==='director';
 if(!director&&['total','quality'].includes(board.id))return access;
 const departments=board.department?[board.department]:rmDepartmentNames;
 for(const item of rmDashboardItems(board)){
  if(item.type==='chain')access.scopes[item.id]=director?'full':'chain';
  if(item.type==='department')access.departments[item.id]=Object.fromEntries(departments.map(department=>[department,director?'full':'chain']));
  if(director&&item.type==='department-picker'){
   const departments=item.defaultDepartments||(item.id==='project-risk'&&board.department?[board.department]:item.departmentOptions().map(([id])=>id));
   access.departments[item.id]=rmDepartmentGrants(departments);
  }
  if(director&&item.type==='shared')access.scopes[item.id]='full';
  const granted=item.type==='brand'?(board.id==='product'||board.id==='quality'&&director):item.type==='report'?director:rmHasModuleScope(item,access);
  if(granted)access.modules.push(item.id);
 }
 if(director&&!board.department)access.reportScope=[...rmReportNames];
 return access;
}
function rmDepartmentGrants(departments){
 return Object.fromEntries(departments.map(department=>[department,'full']));
}

// 线上修改角色可见的原权限树。只保留目录，角色及勾选值使用本地演示数据。
const rmOriginalMenus=[
 ['research','产品研发',[
  ["运营提需",["全部提需","我的提需","新建/编辑/删除提需","查看提需","重新发起"]],
  ["项目管理",[["项目总览old",["项目列表编辑"]],["我的项目",["项目详情"]],"上新计划",["项目总览",["全部项目","我的项目","项目列表","统计看板",["项目详情",["基础信息","任务管理","风险管理","项目文件","变更记录"]],"新建项目"]],["我的待办",["项目任务","风险待办"]],"上新日历",["模板管理",["模版详情","新建模板"]]]],
  ["产品档案",[["档案列表",["创建档案","创建SPU","创建SKU","编辑详情",["SPU详情",["变更记录"]],"产品明细-新增/编辑按钮"]]]],
  "价格管理",
  ["产品管理",[["产品中心",["详情","自选开发","清仓","自研开发","新品","产品在售","产品质改","产品迭代","产品清仓","预下市","产品滞销"]],["指导价管理",["指导价变更申请","价格管理详情"]],["指标管理",["ROI管理-变更记录详情页面","成本-变更成本","调整ROI","变更记录","调整销售状态","ROI管理-变更记录按钮","按钮-变更记录","Tab-成本价格管理","Tab-ROI管理","供应商最低起订量管理权限","供应商最低起订量变更详情"]]]],
 ]],
 ['supply-chain','供应链',[
  "工作台",
  "供应商",
  "寻源",
 ]],
 ['procurement','采购管理',[
  ["运营提需",["新建提需单","删除提需单","更新提需单"]],
  ["采购列表",["新建采购单","导出采购单"]],
  "生产/排产管理",
  ["库存管理",["库存大屏",["产品库存",["库存列表产品详情"]],"京东自营仓",["供应商库存",["库存调差按钮"]],"出入库管理",["库存预警配置",["新建预警规则","新建备货预警规则"]],["品牌已付/未付导入",["删除按钮"]]]],
  ["运营交付",["交付详情"]],
  ["采购管理",[["翻新请购",["创建请购单","详情","翻新请购撤单"]],["翻新采购",["创建采购单","详情","翻新采购撤单"]],["翻新进度看板",["变更记录"]],["采购量管理",["详情","供应商最低起订量管理权限"]],["备货建议",["详情"]],["新机请购",["新建请购单","创建请购单OA编辑权限","交付详情","请购单详情","请购撤单申请"]],"采购-视频号操作权限",["新机采购",["新建采购单","采购关单","采购单详情","请购单详情","采购撤单申请"]],"及时交付率",["排产计划",["新建生产计划","编辑产能","产能详情"]],"采购操作-抖音平台","采购操作一类电商","采购操作快手操作权限","采购-经销渠道虚拟仓","请购汇总表","采购汇总表","排产汇总表","工厂备货"]],
  ["质检管理",["工厂产成品","报检审核",["产品质检",["新建质检单","质检单详情"]]]],
  ["采购交付",["交付详情"]],
  ["销售规划",["销售规划","销售规划达成看板","销售规划-抖音权限","销售规划-快手权限","销售规划-视频号权限","销售规划-一类电商权限","销售规划-经销渠道虚拟仓权限"]],
 ]],
 ['suppliers','供应商管理',[
  ["供应商资源池",[["全部",["新增供应商","供应商详情"]],["已储备",["新增供应商","供应商详情"]],["已准入",["新增供应商","供应商详情"]],["合作中",["新增供应商","供应商详情"]],["已淘汰",["新增供应商","供应商详情"]],"新建供应商按钮","编辑供应商信息按钮","供应商审核按钮","Tab-基础信息","Tab-产品信息","Tab-评分","Tab-联系人信息","供应商详情-产品信息-加入选品库按钮","供应商详情-产品信息-新增产品"]],
  ["商家管理",["供应商资料管理","分配负责人","导出供应商详情"]],
  ["拜访来访",["新增计划","修改","删除"]],
  ["引入全流程管理",["引入全流程管理详情","供应商详情","PK记录","PK结果"]],
  ["商家对比",["驳回","通过"]],
  "商家引入",
  ["产品报价",["填写报价","修改报价","驳回","导出报价表"]],
  ["报价模板",["发送供应商","发送报价"]],
  "引入评估",
  ["合同列表",["合同详情","修改","删除"]],
  "绩效评估",
  ["选品中心",[["选品列表",["新增产品","是否公开","列表","提交","删除","修改"]],"选品详情","意向统计","新增产品",["选品审核",["审核","新增产品"]],["选品池",["新增产品"]],"领样管理","意向与确品","样品管理"]],
 ]],
 ['service','客服管理',[
  ["售后导入",["售后导入详情"]],
  "问题分析",
  "问题分类",
  "进线率统计",
  ["质量跟踪",["质量跟进详情"]],
 ]],
 ['operations','运营管理',[
  ["实时库存",["我的关注","消息中心","货品详情"]],
  "发货数据",
  ["协同跟进",[["跟进列表",["协同详情","主协同任务查询","协同任务新增","协同任务修改","删除主协同任务","主协同任务导出"]],["协同报告",["协同任务报表查询","协同任务报表导出"]]]],
 ]],
 ['supplier-portal','供应商端',[
  ["供应商信息",["新增供应商","供应商详情","编辑供应商信息按钮","Tab-基础信息","Tab-联系人信息"]],
  ["报价管理",["报价列表"]],
  ["产品管理",["新增产品",["产品列表",["同意","驳回","列表","提交","删除","修改","填写报价","新增产品","加入选品库按钮"]],"产品详情"]],
  ["生产管理",[["翻新采购",["详情","请购详情"]],["新机采购",["采购详情"]],["排产计划",["新建排产计划","生产排产计划详情","编辑生产排产计划"]],"库存管理",["库内产品",["新建/编辑报检单","报检单/特采品详情"]],"备货登记"]],
  ["报检管理",[["报检单管理",["新建报检单","报检单详情"]]]],
 ]],
 ['system','系统管理',[
  ["用户管理",["用户查询","分配角色","用户新增","用户修改","用户删除","用户导出","用户导入","重置密码"]],
  ["角色管理",["角色查询","分配用户","角色新增","角色修改","角色删除","角色导出"]],
  "白名单",
  ["字典管理",["字典查询","字典新增","字典修改","字典删除","字典导出","字典详情"]],
  ["菜单管理",["菜单查询","菜单新增","菜单修改","菜单删除"]],
  ["用户操作日志",["登录日志列表查询"]],
  "登录日志",
  ["定时任务",["新增","编辑","删除","执行一次","任务详细/调度日志","定时任务日志"]],
  "人员配置",
  "产品分类",
 ]],
];
