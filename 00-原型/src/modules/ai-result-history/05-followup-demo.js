// 独立演示数据：不写入诊断历史、业务源记录或任务台账。
function gdFollowDemoRows(range){
 const latest=DATA_CUTOFF,first=shiftDate(latest,-1);
 if(latest<range.start||latest>range.end)return [];
 const id='demo-omission-two-checks',name='演示样例·便携取暖器试产项目';
 const source=(suffix,date,content)=>({id:id+'-'+suffix,sourceTypeKey:'project-progress',sourceName:'演示样例·试产检验记录',date,capturedAt:date+'T09:00:00+08:00',content:'虚构演示数据。\n'+content});
 const initialSource=source('first',first,'试产检验要求完成外观、功能和老化检验；记录中已有外观、功能结果，老化检验记录未提交。');
 const latestSource=source('second',latest,'张工（演示）反馈：老化检验已完成，检验记录已上传；复核发现记录缺少检验人签字，已约定次日补签。');
 const initialAction='【补齐老化检验记录】张工（演示）：确认检验是否完成，补齐检验结果和签字。';
 const action='【补齐检验签字】张工（演示）：补齐检验人签字；李工（演示）：复核完整记录，确认后关闭此项。';
 const problem='老化检验记录已补交，但缺少检验人签字，仍需补齐后复核。';
 const records=[
  {at:first,previousAction:'',progress:'',judgement:'试产要求中的老化检验记录未提交，需要确认执行情况并补齐记录。',status:'',action:initialAction,sources:[initialSource]},
  {at:latest,previousAction:initialAction,progress:'老化检验已完成，记录已补交。',judgement:'记录仍缺检验人签字，此项继续跟进。',status:'跟进中',action,sources:[latestSource]}
 ];
 const participants=[{assignee:'张工（演示）',department:'品质中心',action:'【补齐检验签字】补齐老化检验记录中的检验人签字。'},{assignee:'李工（演示）',department:'品质中心',action:'【复核检验记录】复核检验结果和签字，确认完整后关闭此项。'}];
 const object={key:id,id,type:'project',name};
 return [{id,historyKey:id,isDemo:true,kind:'omission',title:'演示样例：试产检验记录未补齐',object,objectName:name,businessObjects:[object],date:first,priority:'重要',categories:['环境'],departments:['品质中心'],people:participants.map(p=>p.assignee),participants,problem,suggestion:action,sources:[latestSource],lifecycle:{status:'跟进中'},followUp:{firstAt:first,updatedAt:latest,checkedAt:latest,records}}];
}
