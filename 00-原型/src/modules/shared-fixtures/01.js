

// Additional demo records belong to the shared ledger, not to a role-specific copy.
// Stable IDs keep historical task assignments and product links intact.
people.push('赵晨','李欣','孙宁','郑悦','陈星','宋妍','许航','顾琳','周琪','何宇','夏宁','沈悦','林辰','陆瑶','韩博','江岚');
const chainProjectBase=projects;
const chainProjectCauses=[
 ['清洁场景和边角覆盖验收标准未确认','试产与导航测试资源排期冲突','地刷缠绕与污水回收测试未通过','导航固件回归验证尚未完成','电池与滚刷物料交付节点未确认'],
 ['容量、噪声及目标成本评审资料待补齐','食品接触测试与试产排期未对齐','杯体密封与温升复测未通过','温控程序在低电压工况下仍有偏差','食品接触材料资质与电机交期待确认'],
 ['适用面积与噪声目标尚未完成评审','季节备货窗口与测试节点存在冲突','低档噪声和防倾倒保护复测未通过','风道与电机控制方案仍在验证','滤芯与风机供应商交付承诺待确认'],
 ['护发效果与使用安全标准尚未确认','认证、包装和试产交付计划未对齐','温升保护与防水复测存在不合格项','恒温算法及档位切换验证未完成','电芯和防水部件资质资料待补齐']
];
// Projects come from the supplied ledger; no additional fictional projects are appended.
projects=function(){return chainProjectBase()};
const chainIssueBase=projectIssueRecord;
projectIssueRecord=function(p){const r=chainIssueBase(p);return p.demoExpanded&&!p.procurementIssue&&r.active?{...r,description:p.cause+'。'+r.description}:r};
// 品质目录统一由SPU主表生成，不再追加重复身份记录。
const chainProductBase=productRows;
// One row per SPU in each product cohort.
productRows=function(isNew){return chainProductBase(isNew)};
