
// Remove the standalone work-list section; existing risk follow-ups remain available in a dialog.
function pbOpenTaskRecords(){pbModalSection='tasks';pbWith('tasks',()=>pbModal('整改任务',`<div id="pb-task-records">${pbRenderTasks()}</div>`))}
const ppRenderPurchasing=renderPurchasing;
renderPurchasing=function(){ppRenderPurchasing();if($('#pb-task-records')&&!$('#overlay').hidden)pbOpenTaskRecords()};
