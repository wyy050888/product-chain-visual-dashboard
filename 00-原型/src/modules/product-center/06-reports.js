// 周报按部门过滤后再交给共用分页、计数和 PDF 下载。
const pcWeeklyRows=gdWeeklyReportRows,pcWeeklyTable=gdWeeklyReportTable;
const pcWeeklyReportScopes=gdWeeklyReportScopes.filter(([key])=>key==='product');
gdWeeklyReportRows=function(){
 const weeks=pcWeeklyRows();
 return pcIsActive()?weeks.filter(week=>week.reports.product).map(week=>({...week,reports:{product:week.reports.product}})):weeks;
};
gdWeeklyReportTable=function(weeks){
 return pcWeeklyTable(weeks,pcIsActive()?pcWeeklyReportScopes:undefined);
};
