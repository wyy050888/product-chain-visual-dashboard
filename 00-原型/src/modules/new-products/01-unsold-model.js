// 演示数据按 SPU 关联首批请购单和项目。首个渠道订单时间为 null 表示截至统计日未检测到订单。
const nspUnsoldSampleDate='2026-11-11';
const nspUnsoldSamples=[
 {spuCode:'DEMO-NEW-025',name:'康佳手持除螨仪 M26',imageFrom:'康佳无线双杆除螨仪2218',category:'清洁',season:'四季品',requisitionNo:'DEMO-QG-261012-01',projectId:'DEMO-PROJECT-025',stock:360,firstChannelOrderAt:null,manager:'林晓'},
 {spuCode:'DEMO-NEW-026',name:'创维桌面暖风机 N26',imageFrom:'创维取暖器A944',category:'环境',season:'冬季品',requisitionNo:'DEMO-QG-261016-02',projectId:'DEMO-PROJECT-026',stock:240,firstChannelOrderAt:null,manager:'陈宁'},
 {spuCode:'DEMO-NEW-027',name:'康佳桌面循环扇 F26',imageFrom:'康佳台扇KTS-0403',category:'环境',season:'夏季品',requisitionNo:'DEMO-QG-261021-03',projectId:'DEMO-PROJECT-027',stock:120,firstChannelOrderAt:null,manager:'陈宁'},
 {spuCode:'DEMO-NEW-028',category:'清洁',season:'四季品',requisitionNo:'DEMO-QG-261012-04',stock:80,firstChannelOrderAt:'2026-10-24T09:00:00'},
 {spuCode:'DEMO-NEW-029',category:'环境',season:'冬季品',requisitionNo:'DEMO-QG-261012-05',stock:0,firstChannelOrderAt:null},
 {spuCode:'DEMO-NEW-030',category:'环境',season:'冬季品',requisitionNo:null,stock:60,firstChannelOrderAt:null},
 {spuCode:'DEMO-NEW-031',name:'创维语音取暖器 H26',imageFrom:'创维语音款取暖器A831',category:'环境',season:'冬季品',requisitionNo:'DEMO-QG-261021-06',stock:60,firstChannelOrderAt:null,manager:'陈宁'}
];
// 一张请购单可分批交付，入池要求截至统计日已有至少一批交付。
const nspUnsoldRequisitions={
 'DEMO-QG-261012-01':{complete:true,deliveryTimes:['2026-11-04T15:20:00','2026-11-02T10:00:00']},
 'DEMO-QG-261016-02':{complete:true,deliveryTimes:['2026-11-06T13:40:00']},
 'DEMO-QG-261021-03':{complete:true,deliveryTimes:['2026-11-09T11:10:00']},
 'DEMO-QG-261012-04':{complete:true,deliveryTimes:['2026-10-22T10:00:00']},
 'DEMO-QG-261012-05':{complete:true,deliveryTimes:['2026-11-04T10:00:00']},
 'DEMO-QG-261021-06':{complete:false,deliveryTimes:['2026-11-07T10:00:00']}
};
const nspUnsoldProjects={
 'DEMO-PROJECT-025':{plannedCompletionDate:'2026-11-18',operationsOwner:'周晓_兴趣电商'},
 'DEMO-PROJECT-026':{plannedCompletionDate:'2026-11-20',operationsOwner:'许晨_一类电商'},
 'DEMO-PROJECT-027':{plannedCompletionDate:'2026-11-24'}
};

function nspUnsoldSummary(){
 const asOf=nspUnsoldSampleDate;
 const category=pfControlValue($('#newchain'));
 const bySpu=new Map();
 for(const product of nspUnsoldSamples){
  if(!pfIncludes(category,product.category)||!pfIncludes(nspFilters.season,product.season))continue;
  if(!(product.stock>0)||product.firstChannelOrderAt!==null)continue;
  const requisition=nspUnsoldRequisitions[product.requisitionNo];
  const deliveryDates=requisition?.deliveryTimes.map(time=>time.slice(0,10)).filter(Boolean)||[];
  if(!deliveryDates.some(date=>date<=asOf))continue;
  const firstRequisitionStatus=requisition.complete&&deliveryDates.every(date=>date<=asOf)?'交付完成':'交付中';
  const project=nspUnsoldProjects[product.projectId];
  bySpu.set(product.spuCode,{
   ...product,firstRequisitionStatus,
   plannedLaunch:project?.plannedCompletionDate,
   operationsOwner:project?.operationsOwner
  });
 }
 const rows=[...bySpu.values()].sort((a,b)=>b.stock-a.stock||a.spuCode.localeCompare(b.spuCode));
 return {asOf,rows};
}
