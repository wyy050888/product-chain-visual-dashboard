// 原型的版本库；生产环境须用服务端事务库替换同一接口，不能把浏览器存储当共享台账。
const aiHistoryKey='dashboard.ai-results.v1';
let aiHistoryError='';
let aiHistoryReadFailed=false;
function aiHistoryRead(){
 try{const value=JSON.parse(localStorage.getItem(aiHistoryKey)||'null');return value?.version===1?value:{version:1,streams:{}}}
 catch(_){aiHistoryReadFailed=true;aiHistoryError='历史读取失败，未覆盖旧记录';return {version:1,streams:{}}}
}
let aiHistoryState=aiHistoryRead();
const aiHistoryClone=value=>JSON.parse(JSON.stringify(value));
function aiHistorySave(next){
 if(aiHistoryReadFailed)return false;
 try{localStorage.setItem(aiHistoryKey,JSON.stringify(next));aiHistoryState=next;aiHistoryError='';return true}
 catch(_){aiHistoryError='历史保存失败，当前结果尚未持久化';return false}
}
function aiHistoryStream(key){return aiHistoryState.streams[key]||{revisions:[],failure:null}}
function aiHistoryScopeKey(prefix,scope){
 let hash=2166136261;for(const c of JSON.stringify(scope)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)}
 return prefix+'|scope-'+(hash>>>0).toString(16);
}
// 同一天更正追加版本；失败不写空结果，也不移动最后成功时间。
function aiHistoryPublish(key,{date,payload,strategy='prototype-demo',request=null,knownAt=new Date().toISOString()}){
 if(!date||payload==null)throw new Error('诊断版本缺日期或结果');
 const current=aiHistoryStream(key),fingerprint=JSON.stringify({date,payload,strategy});
 const last=current.revisions.at(-1);
 if(last&&JSON.stringify({date:last.date,payload:last.payload,strategy:last.strategy})===fingerprint&&!current.failure)return last;
 const revision={id:key+'|'+date+'|'+(current.revisions.length+1),date,knownAt,strategy,request:aiHistoryClone(request),payload:aiHistoryClone(payload)};
 const next=aiHistoryClone(aiHistoryState);
 next.streams[key]={revisions:[...current.revisions,revision],failure:null};
 return aiHistorySave(next)?revision:{...revision,notPersisted:true};
}
function aiHistoryFail(key,reason){
 const next=aiHistoryClone(aiHistoryState),stream=aiHistoryClone(aiHistoryStream(key));
 stream.failure={at:new Date().toISOString(),reason:String(reason)};next.streams[key]=stream;aiHistorySave(next);
 return stream.revisions.at(-1)||null;
}
function aiHistoryAsOf(key,date){return aiHistoryStream(key).revisions.filter(r=>r.date<=date).at(-1)||null}
function aiHistoryStatus(key){
 const stream=aiHistoryStream(key),last=stream.revisions.at(-1);
 return {lastSuccess:last?.knownAt||'',businessDate:last?.date||'',failure:stream.failure,storageError:aiHistoryError,versions:stream.revisions.length};
}
function aiHistoryCompute(key,date,compute,strategy='prototype-demo',{force=false}={}){
 const last=aiHistoryStream(key).revisions.at(-1);
 if(!force&&last?.date===date&&JSON.stringify(last.strategy)===JSON.stringify(strategy))return aiHistoryClone(last.payload);
 try{const payload=compute();aiHistoryPublish(key,{date,payload,strategy});return payload}
 catch(error){const old=aiHistoryFail(key,error.message||error);if(old)return aiHistoryClone(old.payload);throw error}
}
// 状态必须有明示事实；未再次提及、未取到数据、超出筛选都不等于解决。
function aiFindingTransition(prior,observation){
 const previous=prior?.status||'';
 const known=['未开始','跟进中','已暂停','已完成','已解决','已转办','待验证','进展更新'];
 const retained=known.includes(previous)?previous:known.includes(prior?.lastActiveStatus)?prior.lastActiveStatus:'';
 if(!observation||observation.complete===false)return {status:known.includes(previous)||['不再命中','已撤销'].includes(previous)?previous:retained,verificationPending:true,reason:observation?.reason||'本轮缺少可确认状态变化的新证据，保留原处理状态和最后依据',evidence:prior?.evidence||[],previous:retained,lastActiveStatus:retained};
 if(['active','reappeared'].includes(observation.kind)){
  if(!observation.evidence?.length)throw new Error('状态核对必须携带依据');
  // 再次命中只证明问题仍存在；旧版“待跟进”不算明确的未开始证据。
  const status=['已解决','已完成'].includes(retained)?'':retained;
  return {status,verificationPending:!status,reason:status?'本轮仍命中，沿用已有跟进进度；尚无新的进度变化依据':'本轮仍命中，但缺少本事项的明确跟进证据',evidence:status?prior?.evidence||[]:[],checkEvidence:observation.evidence,previous:status,lastActiveStatus:status};
 }
 const states={pending:'未开始',paused:'已暂停',resolved:'已解决',transferred:'已转办',verified:'已解决',verification:'待验证',not_hit:'不再命中',progress:'跟进中'};
 const status=states[observation.kind];
 if(!status)return {status:retained,verificationPending:true,reason:'缺少本事项的明确跟进证据',evidence:prior?.evidence||[],previous:retained,lastActiveStatus:retained};
 if(!observation.evidence?.length)throw new Error('状态变更必须携带依据');
 return {status,reason:observation.reason||'依据本事项处理记录核对',evidence:observation.evidence,previous:retained,lastActiveStatus:status==='不再命中'?retained:status};
}
// 汇总父项不能因一个故障修好而整体关闭；父项只作历史汇总，子项各自续更。
function aiFindingGroupStatus(children){
 if(!children.length||children.some(c=>!c?.status))return '待核实';
 if(children.every(c=>c.status==='已解决'))return '已解决';
 if(children.some(c=>c.status==='待核实'))return '待核实';
 return '跟进中';
}
function aiHistoryDetailMarkup(key){
 const state=aiHistoryStatus(key);
 return `<div class="ai-result-history" data-ai-history="${esc(key)}">结论更新：${esc(gdSourceDate(state.lastSuccess)||'尚未生成')}${state.failure?' · 本次更新失败，保留上次结果':''}${state.storageError?' · '+esc(state.storageError):''}</div>`;
}
window.aiResultHistoryAudit=()=>aiHistoryClone(aiHistoryState);
