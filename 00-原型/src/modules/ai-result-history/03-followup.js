// 四个业务进度与退出原因分开；取数失败不代表暂停或完成。
const gdFollowStatuses=['未开始','跟进中','已暂停','已完成'];
function gdFollowStatus(row){
 const state=row.lifecycle||{},value=['不再命中','已撤销'].includes(state.status)?state.lastActiveStatus||state.previous||state.status:state.status;
 if(gdFollowStatuses.includes(value))return value;
 if(value==='已解决')return '已完成';
 if(['跟进中','待验证','已转办','进展更新'].includes(value))return '跟进中';
 if(state.verificationPending&&state.previous)return gdFollowStatus({lifecycle:{status:state.previous}});
 return '';
}
function gdFollowExited(row){return !!(row.exit_reason||row.exitReason||row.lifecycle?.exitReason)||['不再命中','已撤销'].includes(row.lifecycle?.status)}
// 筛选范围与四种业务状态分开；旧筛选值或未知值恢复为全部。
function gdFollowFilterValue(value){return ['all','empty',...gdFollowStatuses].includes(value)?value:'all'}
function gdFollowMatches(row,value='all'){
 value=gdFollowFilterValue(value);
 if(value==='all')return true;
 if(gdFollowExited(row))return false;
 const status=gdFollowStatus(row);
 return value==='empty'?!status:status===value;
}
function gdFollowFingerprint(row,state){const exited=gdFollowExited({...row,lifecycle:state});return JSON.stringify([row.causalProblem||row.problem||gdProblemText(row),row.suggestion,row.participants,gdFollowStatus({lifecycle:state}),exited,exited?(row.exit_reason||row.exitReason||state?.exitReason||state?.reason):''])}
function gdFollowIndex(revisions){
 const index=new Map();
 for(const revision of revisions)for(const row of [...revision.payload.work,...revision.payload.deviations]){
  const key=gdHistoryIdentity(row),state=revision.payload.findingStates?.[key]||{},signature=gdFollowFingerprint(row,state),previous=index.get(key);
  const entry=previous||{firstAt:revision.knownAt,updatedAt:revision.knownAt,checkedAt:revision.knownAt,signature:'',records:[]};
  entry.checkedAt=revision.knownAt;
  if(entry.signature!==signature){entry.updatedAt=revision.knownAt;entry.records.push({at:revision.knownAt,previousAction:previous?.lastAction||'首次识别',progress:state.reason||'首次保存本次诊断',judgement:gdProblemText(row),status:gdFollowStatus({lifecycle:state}),action:row.suggestion||row.participants?.map(p=>(p.assignee?p.assignee+'：':'')+p.action).join('\n')||'暂无已确认处理安排',sources:row.sources||[]});entry.signature=signature}
  entry.lastAction=row.suggestion||row.participants?.map(p=>p.action).join('\n')||'暂无已确认处理安排';index.set(key,entry);
 }
 return index;
}
function gdFollowDate(row,key){return gdSourceDate(key==='firstAt'&&row.keyType==='high-risk'?row.date:row.followUp?.[key]||row.historyKnownAt||row.date)||'未记录'}
function gdFollowStatusMarkup(row){
 const status=gdFollowStatus(row),exited=gdFollowExited(row);
 if(!status)return '<span class="muted" data-follow-state="">暂无</span>';
 const note=row.lifecycle?.verificationPending?'本轮资料受限，沿用原进度':'';
 return `<span class="tag" data-follow-state="${esc(status)}">${esc(status)}</span>${note?`<small class="gd-analysis-muted">${note}</small>`:''}${exited?`<small class="gd-analysis-muted">已退出：${esc(row.exit_reason||row.exitReason||row.lifecycle?.exitReason||row.lifecycle?.reason||row.lifecycle?.status)}</small>`:''}`;
}
function gdFollowFilterMarkup(){
 const value=gdFollowFilterValue(gdTableFilters().followStatus);
 return `<div class="ui-business-filters gd-follow-filter"><label class="unified-input-group"><span class="unified-field-name">跟进状态</span><select data-gd-follow-status aria-label="跟进状态">${[['all','全部'],...gdFollowStatuses.map(v=>[v,v]),['empty','暂无']].map(([key,label])=>`<option value="${key}" ${value===key?'selected':''}>${label}</option>`).join('')}</select></label></div>`;
}
document.addEventListener('change',event=>{
 if(!event.target.matches('[data-gd-follow-status]'))return;
 gdTableFilters().followStatus=event.target.value;gdRefreshFilters();
});
