// 沿用总看板的统计周，只保留产品中心的周报文件供计数和下载。
const pcWeeklyRows=gdWeeklyReportRows,pcWeeklyTable=gdWeeklyReportTable;
const pcWeeklyReportScopes=gdWeeklyReportScopes.filter(([key])=>key==='product');
gdWeeklyReportRows=function(){
 const weeks=pcWeeklyRows();
 if(!pcIsActive())return weeks;
 return weeks.map(week=>{
  const file=week.reports.product;
  return {...week,reports:file?{product:file}:{}};
 });
};
gdWeeklyReportTable=function(weeks){
 return pcWeeklyTable(weeks,pcIsActive()?pcWeeklyReportScopes:undefined);
};
