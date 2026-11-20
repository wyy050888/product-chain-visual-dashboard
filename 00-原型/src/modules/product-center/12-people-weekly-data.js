// 第43周周报按提交日期和人员去重后的可见人次，尚无工作日期和应交名册。
const pcDailyReportWeeks={
 '2026-10-19':{
  capturedBySubmissionDay:[5,7,7,6,6,7,1],
  // 展示样例，与周报可核实的采集记录分开。
  demoCounts:{expected:63,submitted:60,onTime:57,late:3,missing:3}
 }
};

// 摘自部门诊断提供下载的《产品中心第43周周报》人员段落。
// done 仅记录周报明确的结果；proof 为可定位的资料、系统记录或量化产出；handoff 仅记录明确的交接结果。
const pcPeopleWeeklyReports={
 '2026-10-19':[
  {name:'梁勋进',role:'产品总监',work:[
   {text:'完成第43周周报汇总及立项阶段汇报，跟进Q4新品进度与台账。',done:true,proof:true},
   {text:'完成家车两用随手吸复盘，记录前期定义经历5次修改，同步交互整改信息。',done:true,proof:true,handoff:true},
   {text:'跟进包装与UI／UE流程签批，协调苏泊尔除醛小魔盒取消及内部变更。'}
  ],deviations:[{kind:'omission',text:'两场展会产品汇总原定10/24闭环，10/25仍未完成。已与霍雪静约定10/29汇总并汇报100款产品。',followed:true}],plans:[
   {text:'10/29与霍雪静完成两场展会100款产品汇总及汇报。',due:'2026-10-29',deliverable:true},
   {text:'10/30按原周报完成59款新品立项。',due:'2026-10-30',deliverable:true},
   {text:'10/30与数智中心对齐自研、自选品签批后流程调整提需。',due:'2026-10-30',deliverable:true},
   {text:'按既定分工跟进关键19款产品上市。'}
  ]},
  {name:'刘萱',role:'产品总监助理',work:[
   {text:'与计划部逐项核对Q4上线进度，更新第43周立项及新品上线台账。',done:true,proof:true,handoff:true},
   {text:'收集Q4产品链与销售15款产品资料，更新意向品登记、任务手卡及清单，最终汇总待核。',proof:true}
  ],plans:[{text:'继续收集15款产品资料，纳入下周的安排及交付节点待核。'}]},
  {name:'姚栋',role:'高级产品',chains:['个护&健康'],work:[
   {text:'输出无叶风扇配置定义，整理风扇配置及立项资料。',done:true,proof:true},
   {text:'发起苏泊尔低速款吸烫机立项，跟进海尔护眼仪、暖手宝、抖抖机及三联吸烫机。',done:true,proof:true}
  ],deviations:[
   {kind:'blocker',text:'3款风扇立项停滞，影响2027年排期。已更新配置及资料，恢复状态待核。'},
   {kind:'blocker',text:'康佳JL-B挂烫机首批质检未通过，生产交付受阻。10/30与品质、采购跟进闭环。',followed:true}
  ],plans:[
   {text:'10/26 18:30前协助郭林洋与海尔确认J15按键造型。',due:'2026-10-26',deliverable:true},
   {text:'10/30与王明洋、于涵跟进康佳JL-B首批生产交付闭环。',due:'2026-10-30',deliverable:true}
  ]},
  {name:'孟森祥',role:'高级产品经理',chains:['清洁'],work:[
   {text:'联合研发和联鑫输出2628有刷版加粗评估，完成配收纳包的内部立项资料。',done:true,proof:true,handoff:true},
   {text:'更新康佳15L有线桶吸目标成本并提交立项，提交双杯／三杯有线除螨仪立项。',done:true,proof:true},
   {text:'完成铅笔吸产品定义和评审对齐，协调研发及供应商评估随手吸体验。',done:true,proof:true,handoff:true}
  ],plans:[{text:'推进苏泊尔V10折弯臂版及自集尘版立项与核价。台账节点10/26，两个版本承接分工待核。',due:'2026-10-26'}]},
  {name:'侯佳莉',role:'产品经理',chains:['厨电'],work:[
   {text:'与苏泊尔对齐GS70配色修改，将电镀褪色纳入测试，与运营沟通气泵及叶轮方案。',done:true,handoff:true},
   {text:'重新提交美的绞肉和面机立项并测算成本，完成苏泊尔暖菜板迭代立项，对齐创维暖菜板卖点。',done:true,proof:true,handoff:true},
   {text:'向美的同步P21样机修改版，向ID提交反转烤箱及苏泊尔P20设计需求。',done:true,proof:true,handoff:true}
  ],deviations:[{kind:'blocker',text:'GS70因成本约束需重做ID，新版方向待确认，已重新排期，10/30跟进效果图。',followed:true}],plans:[
   {text:'10/26与王淑琳对接运营确认美的绞肉和面机提价方案，同步品质测试报告。',due:'2026-10-26',deliverable:true},
   {text:'10/30协助姜宝坤确认GS70的ID边界，支撑效果图提案。',due:'2026-10-30',deliverable:true}
  ]},
  {name:'潘东跃',role:'产品经理',chains:['清洁'],work:[
   {text:'与苏泊尔及工厂梳理K3问题优先级与排期，整改仍在推进。',done:false},
   {text:'推进S300定义及泡沫方案成本评估，成本汇报后确认继续推进。',done:true,proof:true},
   {text:'汇报飞利浦布艺创新方案，与苏泊尔协调M28下一轮手板。',done:true,handoff:true}
  ],deviations:[
   {kind:'blocker',text:'大蒸汽洗地机外观手板超过10/23确认节点，结构设计等待确认，更新节点为10/26。',followed:true,handoff:false},
   {kind:'blocker',text:'布艺清洗机功能手板超过10/23节点，结构设计等待确认，10/26汇报并回传结论。',followed:true,handoff:false}
  ],plans:[
   {text:'10/26汇报确认大蒸汽洗地机外观手板，并向研发回传结论。',due:'2026-10-26',deliverable:true},
   {text:'10/26汇报确认布艺清洗机功能手板，并向研发回传结论。',due:'2026-10-26',deliverable:true}
  ]},
  {name:'张晓阳',role:'产品经理',chains:['环境'],work:[
   {text:'完成创维A964／A966／A967、A961／A963、A965的系统立项相关动作。',done:true,proof:true},
   {text:'跟进A904A／A956首批调货、苏泊尔608B和创维A949首批上线，记录A954的500台返工需求。',proof:true},
   {text:'与ID及运营筛选水暖毯候选色，确认938 AI语音迭代UI方向并协调工厂评估周期。',done:true,handoff:true}
  ],plans:[
   {text:'10/26跟进创维A960样机确认，具体规格待核。',due:'2026-10-26',deliverable:true},
   {text:'10/30跟进创维A965首批500台上线。',due:'2026-10-30',deliverable:true}
  ]},
  {name:'张泽昆',role:'产品经理',chains:['环境'],work:[
   {text:'发起A951／A952、A953、A965立项，跟进首批，推进A961小程序调试完成。',done:true,proof:true},
   {text:'输出美的桌面净化器规格书，推进水暖毯色件寄送及UI／UE流程签批。',done:true,proof:true},
   {text:'跟进直播样机，904、937样机和美的中塔5台样机已有寄出记录。',done:true,proof:true,handoff:true}
  ],deviations:[
   {kind:'blocker',text:'立奇取暖器迭代立项超过原10/13节点，等待工厂核算成本及运营确认售价，恢复日期待核。'},
   {kind:'blocker',text:'美的桌面除甲醛净化器投模评审受阻。规格书已输出，送达、品牌评审和报价更新待核。'}
  ],plans:[
   {text:'10/26跟进烘干衣架样机寄出。',due:'2026-10-26',deliverable:true},
   {text:'协调等离子冰箱除味器选品立项，本人记录10/28，台账列10/26，统一节点待核。',deliverable:true}
  ]},
  {name:'李亦姮',role:'包装设计师',work:[
   {text:'修订包装流程并取得产品链签批，正式发布和线上审批启用待核。',done:true,proof:true,handoff:true},
   {text:'完成跨境包装文件修改及擦窗机器人包装签样回寄，修改康佳豆浆机包装文件，待打样。',done:true,proof:true,handoff:true},
   {text:'跟进暖菜板包装样。签样回寄后反馈打样问题，明确下周重打，批次待核。',done:false,handoff:false}
  ],plans:[{text:'跟进暖菜板包装重新打样，日期及签样结果待核。',deliverable:true}]}
 ]
};
