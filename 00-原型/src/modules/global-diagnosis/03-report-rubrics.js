// 仅供AI总诊断使用；不修改公共部门和人员配置。
const gdReportObjectCriterion='每条工作写清业务对象类型、完整名称及型号/SPU码、项目编号、单据号、批次或其他可区分标识；多个对象逐项对应动作、进展和结果。无现成编号时给出完整名称与关键规格/范围，不编造编号。不接受“该产品”“某项目”“这个供应商”等代称，不能靠作者部门或其他条目猜测。任一条目无法明确识别对象，本项扣5分，整份报告最多扣本项5分，并指出具体条目。';
const gdReportDepartmentFocus={
 '产品中心':['产品线规划、立项/上线/迭代/下市与销售达成、新品成功、SABC分级及有效SKU','企划/竞品分析、产品台账档案、培训与上市/售后/关键单品拉通','上市节点、利润及价保退差成本、项目红黄灯和核心风险','经营台账、产品规划、评审及拉通纪要'],
 '项目部':['项目按期交付、里程碑达成、红黄灯新增/闭环及红灯闭环时长','项目排期、跨部门前置输入、交付验收及日周报提交管理','关键路径延期、物料/验证依赖、风险待办及资源冲突','项目排期、交付验收、风险闭环及提交台账'],
 '品质中心':['阶段准入及时率、首批/上市90天品质、老品退货及整改闭环','PQM/PQE、实验室、QC、SQE和体系岗位的评审、测试、检验、审核与整改','批量缺陷、安规、未达标放行、重复缺陷及供方质量','准入/检验/测试/审核报告、退货数据与质量复盘记录'],
 '研发中心':['设计/结构/硬件评审与交付、专利成果、DQE测试闭环和模具验收','ID、结构、硬件、专利、DQE及模具工艺任务、评审和版本交接','EMC/安规、专利、试模返工、技术假设及项目红黄灯','图纸/BOM、设计/测试/专利/DFM/验收文件及问题清单'],
 '采购部':['供方阶段转化、自选品推进、合同报价及产品/模具/翻新降本','寻源拜访、寄样确品、合同签署、报价签批与降本落地','供方准入缺口、报价逾期、合同条件及未确认的降本收益','供方/选品台账、合同、报价回执与降本核算记录'],
 '发货部':['审单/发货/揽收及时率、发货准确率及链接匹配及时/准确率','审单、发货、揽收、京仓调货、云仓入库及渠道库存锁定','错发漏发、未揽收、链接匹配超时、退款及库存锁定异常','订单、物流时间戳、链接匹配、调货/入库与锁定记录'],
 '计划部':['库存周转、断货、呆滞、返修周期及订单交付及时率/交付率','运营需求接收、请购采购下单、订单履约、调货与返修交付','供需失衡、缺货积压、订单延期及返修超期','需求/请购/采购/调货、库存、返修与预警台账']
};
function gdReportRows(items,weights){
 const keys=['object','progress','result','risk','evidence','next'];
 return [['业务对象',gdReportObjectCriterion],...items].map(([label,criterion],i)=>[keys[i],label,weights[i],criterion]);
}
function gdReportDirectorProfile(department){
 const [targets,work,risks,evidence]=gdReportDepartmentFocus[department];
 const items=[
  ['部门目标推进',`围绕${targets}，写明部门本期目标、整体推进阶段及关键偏差，区分部门成果与个人执行动作。`],
  ['部门结果与决策',`汇总${targets}的目标、实际、差额及原因；说明已作出的取舍、资源配置或方案决策及效果，不能只罗列下属工作。`],
  ['重大风险与协调',`说明${risks}的范围、经营/交付影响、分级处置及升级决策；跨部门问题写清协调对象、前提与当前结论。`],
  ['管理判断依据',`关联${evidence}的周期、日期/版本和查询位置；区分已核实数据、下属反馈与待验证判断。`],
  ['资源与后续部署',`围绕${work}明确下一阶段目标、资源/负责人安排、决策截止日与验收成果，对未关闭风险落实责任和检查点。`]
 ];
 return {id:'director',department,level:'director',label:'总监',rows:gdReportRows(items,[5,20,30,20,10,15])};
}
const gdReportProfileCatalog=Object.fromEntries(Object.keys(gdReportEmployeeRoles).map(department=>[department,{
 director:gdReportDirectorProfile(department),
 employees:gdReportEmployeeRoles[department].map(([id,label,items])=>({id,department,level:'employee',label,rows:gdReportRows(items,[5,25,25,20,10,15])}))
}]));
function gdReportProfile(department,level,role){
 const profiles=gdReportProfileCatalog[department];if(!profiles||!['director','employee'].includes(level))return null;
 return level==='employee'?profiles.employees.find(profile=>profile.id===role)||null:profiles[level];
}
function gdReportChoices(department){const profiles=gdReportProfileCatalog[department];return profiles?[profiles.director,...profiles.employees]:[]}
// 兼容原审计结构；正式匹配始终使用显式层级和岗位，不按部门推断人员身份。
const gdReportRubrics=Object.fromEntries(Object.entries(gdReportProfileCatalog).map(([department,profiles])=>[department,profiles.employees[0].rows]));
