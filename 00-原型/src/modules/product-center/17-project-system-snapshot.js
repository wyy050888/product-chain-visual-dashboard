// 运营罗盘项目总览、风险台账与新品上架记录，2026-11-19 核对。
// 立项与上市按自研 / 自选 / 迭代，灯数按红 / 黄。只录入已核实人员归属。
// 30 条上架记录核对出 16 个项目。2 红 1 黄未填写产品经理，新增红灯中 3 条归采购、1 条缺少可核对明细。
const pcNovemberProjectSnapshot={
 month:'2026-11',end:'2026-11-19',
 people:{
  '环境':{
   '张泽昆':{launched:[5,6,0],lights:[3,0]},
   '张晓阳':{started:[0,1,0],lights:[0,1]},
   '姚栋':{started:[1,1,0],lights:[3,1],newLights:[7,0]}
  },
  '清洁':{
   '潘东跃':{started:[0,2,0],launched:[0,2,0],lights:[4,1]},
   '孟森祥':{started:[0,6,0],launched:[0,1,0],lights:[6,0]}
  },
  '厨电':{
   '刘萱':{started:[1,2,0],launched:[0,2,0],lights:[3,0]},
   '侯佳莉':{lights:[2,0]}
  },
  '个护&健康':{'姚栋':{lights:[7,0]}}
 }
};

function pcActiveProjectSnapshot(){
 const {mode,date}=pcPeopleState;
 return mode==='month'&&date.startsWith(pcNovemberProjectSnapshot.month+'-')?pcNovemberProjectSnapshot:null;
}
