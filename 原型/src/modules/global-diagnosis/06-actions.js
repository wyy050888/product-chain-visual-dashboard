// 共用待办变更统一刷新总诊断；合并同一轮事件，避免样例初始化与保存回调重复渲染。
let gdTodoRefreshQueued=false;
function gdSyncTodos(){
 if(gdTodoRefreshQueued)return;
 gdTodoRefreshQueued=true;
 queueMicrotask(()=>{
  try{
   if(dpState.view!=='director'||dxRendering||!$('#ai')?.classList.contains('gd-workspace'))return;
   gdRender();
   const evidence=$('#dialogbody>.gd-dialog');
   if(!$('#overlay').hidden&&evidence){
    const latest=gdFind(evidence.dataset.gdEvidence);
    if(latest)drawerReplace(()=>gdOpenEvidence(latest));else closeModal();
   }
  }finally{gdTodoRefreshQueued=false}
 });
}
document.addEventListener('product-todos-updated',gdSyncTodos);
// 仍只调用现有待办弹窗及状态机；执行人标记完成即完成。
function gdOpenTask(row){
 const task=row.task||gdProposal(row);if(task.deletedAt){gdSyncTodos();return}
 upOpenTodoDialog(task,task.status==='suggested'?'assign':'detail',{},gdSyncTodos);
}
