// 共用待办变更统一刷新总诊断；合并同一轮事件，避免样例初始化与保存回调重复渲染。
let gdTodoRefreshQueued=false;
function gdSyncTodos(){
 if(gdTodoRefreshQueued)return;
 gdTodoRefreshQueued=true;
 queueMicrotask(()=>{
  try{
   if((dpState.view!=='director'&&!pcIsActive())||dxRendering||!$('#ai')?.classList.contains('gd-workspace'))return;
   gdRender();
   if(!$('#overlay').hidden&&$('#dialogbody>.gd-generated-dialog')){drawerReplace(gdOpenGeneratedTasks);return}
  }finally{gdTodoRefreshQueued=false}
 });
}
document.addEventListener('product-todos-updated',gdSyncTodos);
// 仍只调用现有待办弹窗及状态机；执行人标记完成即完成。
function gdOpenTask(row){
 if(row.task?.gdLedger)return gdOpenLedgerDetail(row.task);
 const task=row.task||gdProposal(row);if(task.deletedAt){gdSyncTodos();return}
 upOpenTodoDialog(task,task.status==='suggested'?'assign':'detail',{todoEvidenceTitle:'',todoBusinessObjects:row.businessObjects,todoProblemMarkup:()=>gdActionProblemCell(gdFind(row.id)||row),todoEvidenceMarkup:task=>gdTodoBasisMarkup(gdFind(row.id)||row,task)},gdSyncTodos);
}
