// 独立的资源池目标/达成数据。2026值来自用户截图；2025为固定演示样例，与9个年度新增及各季度3/3/3/0对应。
// 正式数据接入替换此集合；不能从供应商数量、季度合计或本地目标编辑缓存推算缺失值。
const scpResourceMetricRecords=[
 {year:2025,period:'year',target:8,rate:112.5},
 ...[2,1,3,2].map((target,index)=>({year:2025,period:'Q'+(index+1),target,rate:[150,300,100,0][index]})),
 {year:2026,period:'year',target:10,rate:90},
 ...[2,3,3,2].map((target,index)=>({year:2026,period:'Q'+(index+1),target,rate:[100,100,100,50][index]}))
];
function scpResourceReportedMetrics(year,quarter=null,records=scpResourceMetricRecords){
 const period=quarter===null?'year':'Q'+quarter,record=records.find(row=>row.year===year&&row.period===period);
 return {target:Number.isSafeInteger(record?.target)&&record.target>=0?record.target:null,rate:Number.isFinite(record?.rate)&&record.rate>=0?record.rate:null};
}
