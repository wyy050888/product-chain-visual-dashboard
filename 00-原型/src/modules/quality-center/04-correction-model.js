// 样例台账独立于项目进度台账。金额以元、退货率以百分数记。
const qcCorrectionSamples=[
 ['n01','new','清洁','便携车载吸尘器','卡扣公差过大导致装配松动','收紧卡扣公差并增加装配拉力检验','11-03','11-04','11-16',true,1.4,3600,900,6020,18700,9.6,6.3,14000,28,[9.6,9.2,8.5,7.8,6.9,6.2]],
 ['n02','new','环境','台式循环扇','运输振动引发机头卡位脱落','调整固定结构并验证跌落与运输','11-08','11-09','',false,2.1,2400,680,5720,null,10.2,7.4,11000,33,[10.2,10.1,9.7,9.2,8.6,8.4]],
 ['n03','new','个护&健康','热敷按摩眼罩','装配压迫导线，间歇断电','调整走线并加入通电弯折抽检','11-11','11-12','11-24',false,1.8,1700,730,3910,2800,8.1,6.5,10000,38,[8.1,8.3,7.9,8,7.9,7.8]],
 ['n04','new','厨房','蒸汽料理锅','胶圈尺寸波动导致密封不足','调整来料尺寸范围并验证气密性','11-24','','',false,.85,4200,450,null,null,7.5,4.7,12000,32,[7.4,7.6,7.5,7.7,7.4,7.5]],
 ['n05','new','厨房','桌面小煮锅','温度探头固定偏移','校正探头位置，复测温控精度','10-08','10-09','10-24',true,1.1,1700,610,2850,9750,8.8,5.1,9000,31,[8.8,8.5,7.7,6.9,5.7,5.2]],
 ['n06','new','清洁','无线除螨刷','尘杯扣位受力后变形','增强卡扣筋位，增加反复开合测试','10-26','10-28','11-12',true,1.55,2000,570,4190,12800,11.2,7.1,10500,35,[11.2,10.3,9.9,8.6,7.6,7.1]],
 ['o01','old','清洁','滚刷洗地机','长时间使用后滚刷齿轮磨损','更换齿轮材料，增加循环寿命验证','11-02','11-03','11-19',true,3.4,2900,1300,12070,32400,16.2,11.8,17000,58,[16.2,15.7,14.4,13.1,12.2,11.4]],
 ['o02','old','环境','家用暖风机','运输压迫造成出风栅变形','增加包装支撑并做运输抽检','11-09','11-10','',false,1.9,2200,620,4960,null,13.1,8.7,11500,42,[13.1,12.9,12.4,12,11.5,11.2]],
 ['o03','old','厨房','电子温控电水壶','底座触点反复插拔后磨损','替换触点供应批次并增加插拔测试','11-13','11-14','11-25',true,1.2,3200,580,4830,15620,10.3,7.7,13000,29,[10.3,9.9,9.2,8.1,7.9,7.5]],
 ['o04','old','个护&健康','迷你筋膜枪','电控保护误触发导致停机','优化保护参数并增加电机工况测试','11-25','','',false,2.9,2200,810,null,null,12.6,9.2,9000,54,[12.5,12.7,12.8,12.5,12.6,12.6]],
 ['o05','old','环境','外摆式空气循环扇','摆头间歇异响','复核模具尺寸与润滑用量','10-13','10-14','10-30',false,2.35,2300,840,6410,4120,11.7,9.1,11000,37,[11.7,11.5,11.6,11.3,11.0,10.9]],
 ['o06','old','清洁','无线除尘吸尘器','充电部件配合不到位','修正配合尺寸并增加装配点检','10-27','10-29','11-05',true,1.7,3600,980,7430,21250,14.6,10.2,16000,36,[14.6,14.1,13.3,12.4,11.0,10.3]]
].map(([id,type,category,product,cause,plan,planned,started,closed,success,unitCost,quantity,testCost,actualCost,revenue,before,expected,volume,returnLoss,trend])=>({
 id,type,category,product,cause,plan,planned:'2026-'+planned,started:started&&'2026-'+started,closed:closed&&'2026-'+closed,
 success,unitCost,quantity,testCost,actualCost,revenue,before,expected,volume,returnLoss,trend
}));

const qcCorrectionAxes=[['day','日'],['week','周'],['month','月'],['quarter','季度']];
const qcCorrectionStatuses=[['planned','计划立项'],['started','实际立项'],['active','进行中'],['closed','整改闭环'],['success','整改成功']];
function qcCorrectionRange(mode,date){
 if(mode==='day')return [date,date];
 if(mode==='week'){const {start,end}=dateRangeWeek(date);return [start,end]}
 const month=date.slice(0,7),start=mode==='quarter'?dateRangeMonthShift(month,-((Number(date.slice(5,7))-1)%3)):month;
 return [start+'-01',shiftDate(dateRangeMonthShift(start,mode==='quarter'?3:1)+'-01',-1)];
}

function qcCorrectionScope(type,category,range){
 const [start,end]=range,within=date=>date>=start&&date<=end;
 const rows=qcCorrectionSamples.filter(row=>row.type===type&&(category==='all'||row.category===category)&&qcIncludesChain('cost-benefit',row.category));
 const match={planned:row=>within(row.planned),started:row=>within(row.started),active:row=>Boolean(row.started&&row.started<=end&&(!row.closed||row.closed>end)),closed:row=>within(row.closed),success:row=>row.success&&within(row.closed)};
 const groups=Object.fromEntries(qcCorrectionStatuses.map(([key])=>[key,rows.filter(match[key])]));
 return {groups,rows:rows.filter(row=>Object.values(match).some(test=>test(row)))};
}

function qcCorrectionStatus(row,end){
 if(!row.started||row.started>end)return '待立项';
 if(!row.closed||row.closed>end)return '进行中';
 return row.success?'整改成功':'已闭环';
}

function qcCorrectionMoney(value){return value==null?'—':fmt(value,2)}
function qcCorrectionFinance(row,end){
 const actual=!!row.started&&row.started<=end,closed=!!row.closed&&row.closed<=end;
 const actualCost=actual?row.actualCost:null,revenue=closed?row.revenue:null;
 const reduction=Math.round((row.before-row.expected)*10)/10;
 return {totalCost:row.unitCost*row.quantity,testCost:row.testCost,actualCost,revenue,
  reduction,expectedRevenue:row.volume*reduction/100*row.returnLoss,
  gain:actualCost==null||revenue==null?null:revenue-actualCost};
}
