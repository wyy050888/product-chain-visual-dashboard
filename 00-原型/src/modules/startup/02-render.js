// 产品工作区在进入时按自身范围渲染；不先生成一套随即被替换的总看板。
const startupDestination=location.hash||dashboardEntryRoutes[dashboardEntryView];
if(startupDestination!=='#department'&&!startupDestination.startsWith('#dp-'))renderAll();
// 风险出现台账与诊断历史保留完整来源初始化，不为此生成隐藏的总看板DOM。
else{
 rpWithCardRows(()=>withPeriod('risk',rpObserveWarningBoards));
 gdDataset();
}
initializeDashboardEntry();
window.dispatchEvent(new Event('dashboard:ready'));
