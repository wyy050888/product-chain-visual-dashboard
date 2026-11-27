const qcRosterGroups=[
 ['总监','', ['刘群刚']],['品质主管','',['尹太景','鲁松']],
 ['PQM 工程师','pqm',['王明洋','程相杰','张茗淳','魏涛','窦辉身']],
 ['PQE 质改工程师','pqe',['杨绪平','王志振']],
 ['实验室工程师','lab',['屈晨晨','宋文毫','韩强强','刘炜']],
 ['QC 验货员','',['年雨乐']],['QC 品质检验员','',['孙医博','陈虎','胡磊']],
 ['SQE 供应商质量工程师','sqe',['裴龙飞']],['体系主管','',['尹延红']],['体系工程师','system',['冯一丹']],
 ['品质管培生','',['王子文','邵超才','牛婉莹','徐家宝']],['岗位待核','',['刘鹏','孙浩祥','狄朋阳']]
];
const qcRoster=qcRosterGroups.flatMap(([role,group,names])=>names.map(name=>({name,role,group})));
// 钉钉品质品类部的人员分组。职能组记录缺少明确链群时，保留待核状态。
const qcMetricChainAssignments=[
 [chains[0],['魏涛','窦辉身']],
 [`${chains[1]} / ${chains[3]}`,['王明洋']],
 [chains[2],['程相杰','张茗淳']]
];
function qcMetricRoster(role){
 const members=qcRoster.filter(person=>person.group===role);
 const assigned=new Set(qcMetricChainAssignments.flatMap(([,names])=>names));
 return [...qcMetricChainAssignments.map(([chain,names])=>[chain,members.filter(person=>names.includes(person.name))]),
  ['待核',members.filter(person=>!assigned.has(person.name))]].filter(([chain,people])=>people.length&&chain.split(' / ').some(value=>qcIncludesChain('people-metrics',value)));
}
const qcRatingWeek='2026-10-19';

// 摘自品质中心第 43 周周报。仅对有明确交付、证据或节点的条目标记相应计分字段。
const qcRatingFacts={
 尹太景:[[['完成 27 个厨电项目盘点与交接',true,true,true],['配置退货率自动取数，落地进线自动抓取',true,true]],['10 月 27 日完成品质异常看板内部核数',true,true]],
 鲁松:[[['完成整机工厂资质盘点，组织老品改善立项',true,true],['推进康佳 1301 的 4,820 台返工回仓',true,true]],['10 月 30 日完成工厂资质安排及新品首单、首批退货联检',true,true],['missing','不合格批次出货后安排退回返工']],
 王明洋:[[['跟进赛鼎挂烫机程序调整，试测 10 台无异常',true,true],['完成 G1S 样机对比，记录两个和面程序的测试结论',true,true]],['10 月 26 日输出九阳豆浆机竞品测试报告',true,true],['handoff','众文工厂变更资料不足曾影响挂烫机封样，后续已发起封样']],
 程相杰:[[['确认 A904A 改善后跌落测试通过',true,true],['联动 PQE 与工厂确认 A907 改善方案',true,true,true]],['10 月 26 日跟进 A907 改善报告',true,true]],
 张茗淳:[[['推动 A954 软件返工及 A956 端子变更'],['组织复盘 A955／A956 耐压异常',true,true]],['10 月 26 日现场确认合规测试问题并明确整改板版本、复测安排',true,true]],
 魏涛:[[['整理 2630 无刷样机整改方案',true,true],['推动 6 款产品导入退货说明卡']],['10 月 26 日推进 EMC30 封样审批',true,true]],
 窦辉身:[[['推进 K3 大轮异音和滚刷磨损改善，大轮两种手板方案已有测试结果',true,true]],['跟进 10 月 26 日滚刷检测工装和 30 日大轮修模件，取得实物后验证',true,true]],
 杨绪平:[[['筛出 2630、2906 两款退货超目标产品',true,true],['完成 M18H Plus 首批联检并输出确认表、工时核算表',true,true,true]],['10 月 26 日与魏涛到厂复评 M18 联检',true,true],['handoff','拆机工时分歧曾影响联检，后续已出工时核算表']],
 裴龙飞:[[['完成 4 家工厂审厂报告会签',true,true],['跟进净诺取得品牌审核通过结果',true,true]],['10 月 26 日承接普通及专项改善台账，更新立项清单和定责',true,true]],
 屈晨晨:[[['完成多款手板和客退拆解，定位美的 P20 不出水与水管弯折有关',true,true]],['10 月 26 日完成康佳电熨斗测试并输出报告',true,true],['handoff','竞品样品未取得，吉佳吸附挂烫机未能开展竞品对比']],
 宋文毫:[[['市场抽检发现 A934、A935、A945 跌落异常',true,true],['完成功能手板测试并发现 A965 出雾问题',true,true]],['回查噪音标准定稿及跌落异常批次',false,true],['handoff','环境类噪音限制标准因测试手法仍需统一而延期']],
 韩强强:[[['发现 2628 实测参数及 2630 宣传与实物偏差',true,true],['完成洗地机污渍清洁体验标准编写',true,true]],['10 月 28 日完成 2628-P 普通款、高端款测试',true,true]],
 年雨乐:[[['检验 13 批，合格 8 批',true,true]],['10 月 26 日完成 HL-M6D 出货检验，27 日追踪返工及复验',true,true],['handoff','工厂人手不足，部分返工未开展']],
 孙医博:[[['检验 8 批，合格 6 批',true,true],['完成苏泊尔挂烫机首单退货联检，拦截康佳挂烫机喷水异常',true,true]],['核对相关批次返工及复验状态',false,true]],
 陈虎:[[['检验 14 批，合格 12 批',true,true],['识别 2630 现场制程管控问题并要求工厂整改',true,true]],['完成净界 2623、2628 翻新机出货检验并出具报告',false,true],['missing','现行管控有岗位缺 SOP 和电批未点检，已要求停线分析']],
 胡磊:[[['检验 12 批，合格 9 批，拦截 A954、A953 功能异常',true,true]],['10 月 26 日完成明泰 A949 出货检验并输出报告',true,true],['missing','现场常规老化测试未全量执行，已要求增配人员开展专项测试']],
 尹延红:[[['完成 10 份体验标准编制，6 份定稿提交受控',true,true],['整理 77 份作废文件及表单',true,true]],['10 月 30 日提交内审报告及整改方案',true,true],['handoff','内审相关资料不全，待补齐后完成稽核']],
 冯一丹:[[['输出 9 月退货率及进线率报表',true,true],['完成体系文件归档并整理违规信息',true,true]],['10 月 26 日与运营核对违规信息并补查受限店铺',true,true],['handoff','部分店铺因账号问题未完成违规分析']]
};

function qcRatingPerson(person,week){
 const [work=[],plan,deviation]=week===qcRatingWeek?qcRatingFacts[person.name]||[]:[];
 const evidence={...person,work:work.map(([text,done,proof,handoff])=>({text,done,proof,handoff})),
  plans:plan?[{text:plan[0],due:plan[1],deliverable:plan[2]}]:[],
  deviations:deviation?[{text:deviation[1],kind:deviation[0]==='missing'?'omission':'blocker'}]:[]};
 return {...evidence,...pcPeopleScore(evidence)};
}
