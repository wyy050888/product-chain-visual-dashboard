// 生命周期目标样例；计划、类目沿用目标表，数字为可编辑的演示目标。
const ltCategories=['环境类','清洁类','个护类','健康类','厨电类'];
const ltPlans=[
 {id:'self-launch',name:'自研上品计划',stage:0},
 {id:'selected-launch',name:'自选商品计划',stage:1},
 {id:'self-project',name:'自研立项规划',stage:2},
 {id:'selected-project',name:'自选立项规划',stage:3},
 {id:'iteration',name:'产品迭代规划',stage:4},
 {id:'quality-new',name:'品质整改规划（新品）',stage:5},
 {id:'quality-existing',name:'品质整改规划（老品）',stage:5},
 {id:'innovation',name:'研发创新规划',stage:6},
 {id:'delisting',name:'产品下市规划',stage:7}
];
// 按现有完成台账的量级补充季度目标样例；0表示未配置。
const ltSampleMonthly=[
 [6,12,9,14,8,5,3,7,6],
 [10,14,10,16,8,5,4,6,6],
 [2,3,3,4,3,2,1,2,2],
 [1,2,2,3,1,1,1,1,1],
 [9,13,10,14,8,5,3,7,6]
];
const ltReference2026=ltSampleMonthly.map(plans=>plans.map(monthly=>[monthly*3-1,monthly*3+1,monthly*3,monthly*3]));
