// 原有数值键保留为兼容投影；可编辑条件与结果分段由condition-catalog声明。
// 按业务对象归属组织编辑与提交；规则键保持稳定，兼容已有浏览器配置。
const brcGroups=[['new','新品'],['products','产品'],['shops','店铺'],['stock','库存']];
const brcDefinitions=[];
function brcDefine(group,section,rows){for(const [key,label,value,unit,op='≥',min=0,max=100,integer=false] of rows)brcDefinitions.push({key,group,section,label,value,unit,op,min,max,integer})}
brcDefine('common','达成率判灯',[
 ['lights.green','绿灯下限',100,'%','≥',0,1000],['lights.yellow','黄灯下限',80,'%','≥',0,1000]
]);
brcDefine('products','退货率红绿灯',[
 ['lights.return','总退偏差黄灯上限',2,'%','≤'],['lights.received','已收退偏差黄灯上限',.5,'%','≤']
]);
// 采购部预警继续读取此阈值，兼容已保存的项目规则。
brcDefine('projects','项目延期预警',[
 ['lights.projectDelay','延期天数',15,'天','＞',0,365,true]
]);
brcDefine('stock','库存周转率判灯',[
 ['lights.turn.month.green','月度绿灯下限',.85,'次'],['lights.turn.month.yellow','月度黄灯下限',.3,'次'],
 ['lights.turn.quarter.green','季度绿灯下限',2.5,'次'],['lights.turn.quarter.yellow','季度黄灯下限',.9,'次'],
 ['lights.turn.year.green','年度绿灯下限',10,'次'],['lights.turn.year.yellow','年度黄灯下限',3.6,'次']
]);
brcDefine('stock','交付及时率判灯',[
 ['lights.delivery.green','交付及时率绿灯下限',98,'%'],['lights.delivery.yellow','交付及时率黄灯下限',97.5,'%']
]);
for(const [level,rows] of Object.entries({S:[['salesAbove','GSV下限',600,'万元','＞'],['profitAbove','利润率下限',12,'%','＞']],A:[['salesAbove','GSV下限',300,'万元','＞'],['profitBelow','利润率上限',12,'%','＜']],B:[['salesAbove','GSV下限',60,'万元','≥'],['salesBelow','GSV上限',300,'万元','≤'],['profitAbove','利润率下限',15,'%','＞']],C:[['salesBelow','GSV上限',60,'万元','＜'],['profitBelow','利润率上限',12,'%','＜']]}))brcDefine('new','SABC规则 · '+level+'级',rows.map(([key,label,value,unit,op])=>['grades.'+level+'.'+key,label,value,unit,op,unit==='%'?-100:0,unit==='%'?100:1000000000]));
// 原型使用数智罗盘SABC配置样例；正式等级及经营标签条件由数智罗盘同步，不在本页维护。
for(const rule of brcDefinitions)if(rule.key.startsWith('grades.')){rule.configurable=false;rule.source='数智罗盘SABC规则配置'}


brcDefine('products','品质风险触发',[
 ['quality.orders','有效订单下限',100,'单','≥',1,1000000,true],['quality.returnDelta','总退环比增长率',3,'%','＞'],['quality.contactDelta','总进线率环比增长率',20,'%','＞']
]);
brcDefine('products','退货恶化触发',[
 ['quality.worsenSales','销量下限',100,'件','＞',0,1000000000,true],
 ['quality.worsenReturn','总退环比增长率',10,'%','＞'],['quality.worsenReceived','已收退环比增长率',10,'%','＞']
]);
// 退货恶化条件只供运行时判定，配置页不提供入口。
for(const rule of brcDefinitions)if(rule.group==='products'&&rule.section==='退货恶化触发')rule.configurable=false;
for(const [platform,red,yellow] of [['抖音',4.6,4.8],['快手',4.4,4.7],['天猫',4.6,4.8],['京东',4.6,4.8]])brcDefine('shops',platform+'店铺分',[
 ['shops.'+platform+'.red','红灯上限',red,'分',platform==='天猫'?'＜':'≤',0,5],['shops.'+platform+'.yellow','黄灯上限',yellow,'分','＜',0,5]
]);
brcDefine('shops','处罚与单品退货',[
 ['shops.penalties','品质处罚次数',2,'次','≥',1,1000,true],['shops.fine','品质罚款金额',5000,'元','≥',0,1000000000],['shops.returnExcess','两期总退超目标差值',3,'%','＞']
]);
brcDefine('shops','拼多多核心链接',[
 ['shops.pddValue','单项异常原值',30,'%','＞'],['shops.pddCount','六项考核异常项数',3,'项','≥',1,6,true]
]);
brcDefine('stock','库存规则',[
 ['stock.slowDays','呆滞',60,'天','≥',1,3650,true],['stock.shortDays','缺货',30,'天','＜',1,3650,true],['stock.transferDays','调货',7,'天','≤',0,3650,true]
]);
brcDefine('stock','历史高危库存参数',[
 ['stock.profit','高危库存利润率',10,'%','＜',-100,100],['stock.return','高危库存总退',55,'%','＞'],['stock.received','高危库存已收退',30,'%','＞'],['stock.violations','当月下架与冻结次数',3,'次','≥',1,1000,true]
]);
// 库存预警使用完整条件组；旧天数键沿用，历史数值自动生成对应条件。
brcDefine('stock','库存预警规则',[
 ['stock.warning.warehouse','可售库存',0,'件','＞',0,1000000000,true],
 ['stock.warning.netSales','近15日净销量',0,'件','＞',0,1000000000,true],
 ['stock.warning.coverageDays','可售天数',60,'天','≥',1,3650,true],
 ['stock.shortage.excluded','是否清仓或下架',0,'','＝',0,1,true],
 ['stock.shortage.netSales','近15日净销量',0,'件','＞',0,1000000000,true],
 ['stock.shortage.sellableDays','可售天数上限（含）',15,'天','≤',1,3650,true],['stock.shortage.totalDays','总可售天数上限（含）',45,'天','≤',1,3650,true]
]);
brcDefinitions.find(rule=>rule.key==='stock.shortage.excluded').valueType='boolean';
brcDefine('stock','呆滞产品Top10',[
 ['stock.top.minAgeDays','呆滞库存库龄下限（含）',60,'天','≥',1,3650,true]
]);
// 撤下独立配置入口，保留旧键供历史缓存读取；Top10入池改为共用stock.slowDays。
for(const rule of brcDefinitions)if(['stock.profit','stock.return','stock.received','stock.violations','stock.top.minAgeDays'].includes(rule.key))rule.configurable=false;
// 撤下库存规则及预警配置入口；运行目录和已保存的业务条件继续保留。
for(const rule of brcDefinitions)if(rule.group==='stock'&&['库存规则','库存预警规则'].includes(rule.section))rule.configurable=false;
brcDefine('stock','翻新周期',[
 ['stock.refurbDays','翻新标准周期',40,'天','≤',1,365,true],['stock.refurbSecond','延期一档',45,'天','＜',1,365,true],['stock.refurbThird','延期二档',60,'天','＜',1,365,true],['stock.refurbOverflow','超出延期二档',60,'天','≥',1,365,true]
]);
// 翻新周期不提供本地维护；旧键仅保留给已有数据兼容读取。
for(const rule of brcDefinitions)if(rule.group==='stock'&&rule.section==='翻新周期')rule.configurable=false;
brcDefine('new','新品销售成功率',[
 ['new.quarterGsv','四季品季度GSV',500,'万元','≥',0,1000000000],['new.yearGsv','四季品年度GSV',2000,'万元','≥',0,1000000000],['new.seasonGsv','季节品GSV',750,'万元','≥',0,1000000000],
 ['new.profit','利润率',12,'%','≥',-100,100],['new.return','总退',60,'%','≤'],['new.successRate','销售成功率目标',66,'%']
]);
brcDefine('new','新品上线及时率',[['new.deliveryDays','大货交付允许延后',15,'天','≤',0,365,true]]);
brcDefine('new','新品判定',[['new.exitDays','首次成功季度结束后出池',30,'天','≥',0,365,true]]);
brcDefine('products','净利润率预估',[
 ['finance.deduction','利润率扣减',10,'%','－',0,100]
]);
brcDefine('common','环比显示',[
 ['lights.decline','环比涨跌幅度灰色上限',10,'%','≤']
]);

// 历史测算参数仅兼容读取，不再提供配置入口。
brcDefinitions.find(rule=>rule.key==='finance.deduction').editable=false;
// 仅撤下配置入口；已保存的处罚与退货规则仍供原有业务判定使用。
for(const rule of brcDefinitions.filter(rule=>rule.section==='处罚与单品退货'))rule.configurable=false;

const brcDefaults=Object.fromEntries(brcDefinitions.map(rule=>[rule.key,rule.value]));

// 单品成功条件由季度/年度规则方案独立维护。
for(const rule of brcDefinitions)if(['new.quarterGsv','new.yearGsv','new.seasonGsv','new.profit','new.return'].includes(rule.key))rule.configurable=false;
