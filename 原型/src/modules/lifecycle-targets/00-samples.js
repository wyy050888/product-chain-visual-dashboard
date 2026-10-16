// 2026年季度目标按用户提供的目标表录入；空白与横线均保留为未配置。
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
// 数字含0表示已配置；null未配置；none无考核；draft制定中。
const ltReference2026=[
 [[9,14,5,0],['none',3,9,'draft'],[null,8,10,8],[null,null,7,8],[null,null,null,5],[null,2,2,3],[null,null,1,3],['none','none','none','none'],[null,null,null,null]],
 [[1,1,8,4],['none',13,8,'draft'],[null,5,8,8],[null,null,6,8],[null,null,null,5],[null,null,1,4],[null,5,3,1],['none','none','none','none'],[null,null,null,null]],
 [[4,4,1,null],['none',2,1,'draft'],[6,2,5,1],[null,null,3,2],[null,null,null,1],[null,null,2,6],[null,null,1,4],['none','none','none','none'],[null,null,null,null]],
 [[2,2,2,1],['none',1,0,'draft'],[null,4,3,1],[null,null,3,2],[null,null,null,1],[null,2,3,3],[null,1,1,2],['none','none','none','none'],[null,null,null,null]],
 [[1,3,4,1],['none',2,2,'draft'],[null,3,5,4],[null,null,3,4],[null,null,null,3],[null,1,1,7],[null,3,1,1],['none','none','none','none'],[null,null,null,null]]
];
