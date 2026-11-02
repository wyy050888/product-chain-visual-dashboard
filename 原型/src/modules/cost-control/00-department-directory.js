// 来源：《各部门降本导入模版》部门页及“一二级类目”；页面、导入、模板共用。
// ID沿用语义明确的旧指标；新增类目用独立ID，避免占用历史自定义编号。
const ccDepartmentDirectory={
 research:[['0','product','工艺降本'],['1','product','设计优化降本',['设计方案降本（含物料降本）']]],
 purchase:[['0','product','产品原材料降本',['产品降本']],['standard-rebate','product','促销返利']],
 warehouse:[['0','logistics','运费降本',['运费谈价']],['standard-storage','logistics','仓储费降本',['仓储费用减免']],['3','packaging','包材降本'],['1','fine','物流平台罚款追回（仓储）',['平台罚款']],['4','fine','云仓快递问题处罚（发货/仓储）',['快递罚款','云仓快递问题处罚']]],
 risk:[['standard-factory','risk','工厂罚款（风控）',['工厂罚款']],['standard-employee','risk','员工罚款'],['2','risk','案件回款',['打假诉讼等渠道案件回款金额']],['standard-complaint','risk','投诉回款'],['6','risk','节省开支',['严格管控部门预算减少的成本支出金额']],['4','risk','供应商议价（律所+知识产权机构）',['知识产权及事务所等供应商比价价格优惠金额']],['1','risk','案件节省支出',['重大事务处理成本优化金额']],['0','risk','舞弊处罚/上缴资产',['资产','反舞弊及审计内控降本金额']]],
 shipping:[['0','logistics','运费降本',['运费谈价','快递降价']],['standard-packaging','packaging','包材降本'],['standard-platform','fine','物流平台罚款追回（发货）',['平台罚款']],['standard-courier','fine','云仓快递问题处罚（发货/仓储）',['快递罚款','云仓快递问题处罚']]],
 planning:[['0','logistics','干线运输降本',['物流费']]],
 quality:[['0','product','工艺降本',['技术改善降本','技改降本']],['2','fine','工厂违规处罚',['质量罚款','供应商处罚']],['1','fine','好评费用支持（品质）',['谈判收益','店铺分支持','好评支持']]],
 user:[['standard-intercept','fine','拦截失败快递赔付追回（用户中心）'],['1','fine','质量问题千五罚款（用户中心）',['质量问题千五罚款']],['0','fine','质量问题平台罚款追回（用户中心）',['平台赔付追回']]],
 product:[['0','product','工艺降本'],['1','product','产品迭代降本'],['2','product','设计优化降本',['设计方案降本（含物料降本）']],['3','product','关键器件替代料降本',['关键器件替代料降本（含塑胶原料降本）']]]
};
const ccStandardMetrics=Object.entries(ccDepartmentDirectory).flatMap(([department,rows])=>rows.map(([key,category,name,aliases=[]],index)=>({id:department+'-'+key,department,category,metricIndex:/^\d+$/.test(key)?Number(key):1000+index,name,metric:name,owner:'',aliases})));
function ccStandardMetric(department,name){return ccStandardMetrics.find(item=>item.department===department&&(item.name===name||item.aliases.includes(name)))}
// 仅修正旧演示台账的拆分，不作为真实导入记录的语义映射。
const ccLegacySampleAssignments={'warehouse-2':'warehouse-0','shipping-1':'shipping-0','risk-3':'risk-0','risk-5':'risk-standard-factory'};
