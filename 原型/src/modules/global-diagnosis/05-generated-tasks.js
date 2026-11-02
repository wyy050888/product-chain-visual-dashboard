// 重点清单保留已生成任务的快捷回看；完整查询与录入统一使用任务清单主入口。
const gdGeneratedFilters={...gdFilterDefaults('coordination'),status:'all'};
function gdGeneratedTasks(data=gdRenderedData||gdDataset()){return data.tasks.filter(r=>r.task.gdWorkKey)}
function gdOpenGeneratedTasks(){
 const rows=gdGeneratedTasks(),entries=gdTableEntries(rows,gdGeneratedFilters);
 openModal('已生成任务',`<article class="gd-dialog gd-workspace gd-generated-dialog">${gdActionTable(entries,gdGeneratedFilters)}</article>`);
 gdMountTaskPreviews(document.body);
}
