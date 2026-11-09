// 变更记录只读取真实保存日志；旧数据没有时间或操作者时不补造记录。
const gdLedgerInfoFields=['priority','status','due','completedAt','requestor','primaryOwner','secondaryOwner','department','gdCategory','registrationDate'];
const gdLedgerContentFields=['ledgerTaskType','title','deliverable','latestProgress'];
function gdLedgerFieldLabel(key){return gdLedgerColumns.find(([name])=>name===key)?.[1]||key}
function gdLedgerChanges(before,after){
 const normalized=(key,value)=>['registrationDate','due','completedAt'].includes(key)?upTodoDate(value):key==='gdCategory'?gdLedgerChain(value):String(value??'');
 return gdLedgerColumns.filter(([key])=>normalized(key,before[key])!==normalized(key,after[key])).map(([field])=>({field,label:gdLedgerFieldLabel(field),before:String(before[field]??''),after:String(after[field]??'')}));
}
function gdLedgerChangeTime(value){
 const date=new Date(value);if(!value||!Number.isFinite(date.getTime()))return '—';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 return parts.year+'/'+parts.month+'/'+parts.day+' '+parts.hour+':'+parts.minute+':'+parts.second;
}
function gdLedgerChangeValue(field,value){
 const text=String(value??'');if(!text)return '未填写';
 if(field==='priority')return upTodoPriorities[text]||text;
 if(field==='status')return gdLedgerStatus[text]||text;
 return text;
}
function gdLedgerChangeMarkup(task){
 const logs=(task.logs||[]).map((log,index)=>({log,index})).sort((a,b)=>(Date.parse(b.log.at)||0)-(Date.parse(a.log.at)||0)||b.index-a.index);
 if(!logs.length)return '<p class="gd-ledger-change-empty">暂无变更记录</p>';
 return logs.flatMap(({log})=>{
  const actor='<b>'+esc(log.actor||'操作人未记录')+'</b>',stamp='<time datetime="'+esc(log.at||'')+'">'+esc(gdLedgerChangeTime(log.at))+'</time>';
  const changes=log.changes?.length?log.changes:log.from&&log.to&&log.from!==log.to?[{field:'status',before:log.from,after:log.to}]:[];
  const article=(text,detail='')=>'<article class="gd-ledger-change"><div class="gd-ledger-change-heading"><span>'+actor+' '+text+'</span>'+stamp+'</div>'+detail+'</article>';
  if(changes.length)return changes.map(change=>{
   const label=esc(gdLedgerFieldLabel(change.field)),before=esc(gdLedgerChangeValue(change.field,change.before)),after=esc(gdLedgerChangeValue(change.field,change.after));
   return gdLedgerContentFields.includes(change.field)?article('更新了'+label,'<blockquote>'+after+'</blockquote>'):article('将'+label+'从 '+before+' 变更为 '+after);
  });
  return [article(esc(({create:'创建了任务',import:'导入了任务',edit:'更新了任务'})[log.action]||'更新了任务记录'),log.note?'<blockquote>'+esc(log.note)+'</blockquote>':'')];
 }).join('');
}
function gdLedgerMainMarkup(task,creating=false){
 const field=key=>gdLedgerFieldMarkup([key,gdLedgerFieldLabel(key)],task,!creating);
 return '<div class="gd-ledger-detail-main gd-ledger-form"><div class="gd-ledger-info">'+gdLedgerInfoFields.filter(key=>!creating||key!=='completedAt').map(field).join('')+'</div><div class="gd-ledger-content">'+gdLedgerContentFields.map(field).join('')+'</div></div>';
}
function gdLedgerDetailMarkup(task){
 return '<div class="gd-ledger-detail-layout">'+gdLedgerMainMarkup(task)+'<aside class="gd-ledger-change-panel" aria-label="变更记录"><h4>变更记录</h4>'+gdLedgerChangeMarkup(task)+'</aside></div>';
}
