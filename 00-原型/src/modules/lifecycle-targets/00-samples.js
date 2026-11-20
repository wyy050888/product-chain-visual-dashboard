// 生命周期目标样例；计划、类目沿用目标表，数字为可编辑的演示目标。
const ltCategories=filterCatalog.chains;
const ltPlans=[
 {id:'self-launch',name:'自研上品计划',stage:0},
 {id:'selected-launch',name:'自选上品计划',stage:1},
 {id:'self-project',name:'自研立项规划',stage:2},
 {id:'selected-project',name:'自选立项规划',stage:3},
 {id:'iteration',name:'产品迭代规划',stage:4},
 {id:'quality-new',name:'品质整改规划（新品）',stage:5},
 {id:'quality-existing',name:'品质整改规划（老品）',stage:5},
 {id:'innovation',name:'研发创新规划',stage:6},
 {id:'delisting',name:'产品下市规划',stage:7}
];
// 按现有完成台账的量级补充季度目标样例；0为零目标，null为未配置。
const ltSampleMonthly=[
 [6,12,9,14,8,5,3,7,6],
 [10,14,10,16,8,5,4,6,6],
 [2,3,3,4,3,2,1,2,2],
 [1,2,2,3,1,1,1,1,1],
 [9,13,10,14,8,5,3,7,6]
];
const ltReference2026=ltSampleMonthly.map(plans=>plans.map(monthly=>[monthly*3-1,monthly*3+1,monthly*3,monthly*3]));
const ltInnovationStage=6;
const ltDefaultBrands=filterCatalog.dashboardBrands;
// 保留样例项目与 SPU 使用的品牌，以及原有演示目标的分配顺序。
const ltSampleCategoryBrands=[
 ['创维','美的','苏泊尔','康佳'],
 ['康佳','创维','苏泊尔','MR.EGO'],
 ['苏泊尔','海尔','创维','美的','康豆豆','康佳'],
 ['海尔','康佳','创维','苏泊尔','玖通圣康','金正','爱视健','蕉雅']
];
function ltSampleBrandTargets(category,brand){
 const index=ltSampleCategoryBrands[category].indexOf(brand);
 const values=category===3?ltReference2026[2].map((row,p)=>row.map((v,q)=>v+ltReference2026[3][p][q])):ltReference2026[category===2?4:category];
 // 每个链群提供两组演示目标，其他品牌可按需配置。
 return ltPlans.map((plan,p)=>values[p].map(value=>plan.stage===ltInnovationStage||index<0||index>1?null:Math.floor(value/(index===0?2:3))));
}
