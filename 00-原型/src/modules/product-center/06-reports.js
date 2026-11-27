// 沿用总看板的统计周，按产品中心的最新版本显示周报。
const pcWeeklyRows=gdWeeklyReportRows,pcWeeklyTable=gdWeeklyReportTable;
const pcWeeklyReportScopes=gdWeeklyReportScopes.filter(([key])=>key==='product');
function pcCanAccessWeeklyScope(scope){return pcIsActive()?scope==='product':qcIsActive()&&qcAccess.reports.some(([key])=>key===scope)}
// 原始版本的导出时间取自交付 PDF，摘要取自同一份周报。
const pcWeeklyAiReports={
 '2026-10-19':{
  exportedAt:'2026-11-15T16:57:19Z',
  result:'完成 12 款立项评审（目标 15 款），包装和 UI/UE 流程已签批。',
  risks:[
   '立项评审较周目标少 3 款，可能影响后续项目排期。',
   'A954 有 500 台需返工，首批放行待复验。'
  ]
 }
};
const pcWeeklySummaryColumns=[
 ['本周结果',({productSummary})=>productSummary?esc(productSummary.result):''],
 ['最大风险',({productSummary})=>{
  const risks=productSummary?.risks?.slice(0,2);
  return risks?.length?`<ul class="gd-weekly-risk-list">${risks.map(risk=>`<li>${esc(risk)}</li>`).join('')}</ul>`:'';
 }]
];
function pcDepartmentWeeklyRows(weeks,scope,aiReports){
 pcWeeklyInitVersions(scope);
 const {versions}=pcWeeklyStore(scope);
 return weeks.map(week=>{
  const aiReport=week.reports[scope],uploadedVersion=versions.get(week.monday)?.[0];
  const file=uploadedVersion?.name||aiReport;
  const aiVersion=aiReport?aiReports[week.monday]:undefined;
  const productSummary=uploadedVersion?undefined:aiVersion;
  return {...week,reports:file?{[scope]:file}:{},reportScope:scope,aiReport,aiReportAt:aiVersion?.exportedAt,uploadedVersion,productSummary};
 });
}
gdWeeklyReportRows=function(){
 const weeks=pcWeeklyRows();
 return pcIsActive()?pcDepartmentWeeklyRows(weeks,'product',pcWeeklyAiReports):weeks;
};
gdWeeklyReportTable=function(weeks){
 return pcIsActive()?pcWeeklyTable(weeks,pcWeeklyReportScopes,pcWeeklySummaryColumns,pcWeeklyActionCell):pcWeeklyTable(weeks);
};
