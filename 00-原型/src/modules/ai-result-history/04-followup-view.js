// 仅处理业务事项的来源与跟进展示，不改写核对记录或状态。
function gdFollowTextMarkup(value){
 return gdReadableMarkup(value||'').replace(/【[^】\r\n]+】/g,'<strong>$&</strong>');
}
function gdWorkFollowEvidence(row){
 const f=row.followUp||{},saved=f.records||[];
 const records=saved.length?saved:[{at:row.historyKnownAt||row.date,action:row.suggestion||(row.participants||[]).map(p=>(p.assignee?p.assignee+'：':'')+p.action).join('\n'),status:gdFollowStatus(row),sources:row.sources||[]}];
 const empty='<span class="muted">暂无</span>';
 const rows=records.map((record,index)=>{
  const first=index===0,id='gd-follow-evidence-'+index;
  const previous=first?empty:gdFollowTextMarkup(record.previousAction)||empty;
  const progress=first?empty:[record.progress,record.judgement].filter(Boolean).map(gdFollowTextMarkup).join('<p></p>')||empty;
  // 旧记录只能使用当时保存的来源；缺失时不借用当前来源补齐。
  const sources=(record.sources||[]).length?gdAnalysisSourceTable(record.sources):'<p class="muted">暂无来源依据</p>';
  return `<tr class="gd-follow-record" data-gd-follow-record="${index}"><td data-label="核对日期"><span>${esc(gdSourceDate(record.at)||'未记录')}</span>${first?'<span class="gd-first-diagnosis">首次诊断</span>':''}</td><td data-label="此前待跟进事项">${previous}</td><td data-label="本次进展与判断">${progress}</td><td data-label="跟进状态">${gdFollowStatusMarkup({lifecycle:{status:record.status}})}</td><td data-label="剩余行动及建议接手人">${gdFollowTextMarkup(record.action)||empty}</td><td data-label="操作"><button type="button" class="link" data-gd-follow-evidence="${id}" aria-expanded="false" aria-controls="${id}">查看依据</button></td></tr><tr id="${id}" class="gd-follow-evidence-row" hidden><td colspan="6"><div class="gd-follow-evidence-shell">${sources}</div></td></tr>`;
 }).reverse().join('');
 return `<section class="gd-detail-section gd-work-follow" data-ai-finding-history><h5>来源依据与跟进</h5><div class="gd-follow-table-wrap" data-gd-follow-scroll><table aria-label="问题跟进记录" class="gd-work-follow-table"><colgroup><col style="width:120px"><col style="width:230px"><col style="width:350px"><col style="width:110px"><col style="width:370px"><col style="width:100px"></colgroup><thead><tr><th>核对日期</th><th>此前待跟进事项</th><th>本次进展与判断</th><th>跟进状态</th><th>剩余行动及建议接手人</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

let gdFollowEvidenceObserver;
function gdSyncFollowEvidenceWidth(scroller){
 scroller.style.setProperty('--gd-follow-viewport',scroller.clientWidth+'px');
}
function gdMountFollowEvidence(root){
 gdFollowEvidenceObserver?.disconnect();
 const scroller=root.querySelector('[data-gd-follow-scroll]');
 if(!scroller)return;
 gdSyncFollowEvidenceWidth(scroller);
 gdFollowEvidenceObserver=new ResizeObserver(()=>{
  gdSyncFollowEvidenceWidth(scroller);
  scroller.querySelectorAll('.gd-follow-evidence-row:not([hidden])').forEach(gdPrepareFollowSourceText);
 });
 gdFollowEvidenceObserver.observe(scroller);
}
function gdPrepareFollowSourceText(detail){
 for(const cell of detail.querySelectorAll('.gd-analysis-sources>table>tbody>tr>td:last-child')){
  let content=cell.querySelector(':scope>.gd-follow-source-text');
  if(!content){
   content=document.createElement('div');content.className='gd-follow-source-text';
   while(cell.firstChild)content.append(cell.firstChild);
   const button=document.createElement('button');button.type='button';button.className='link gd-follow-source-more';
   button.dataset.gdFollowSourceMore='';button.setAttribute('aria-expanded','false');button.textContent='展开原文';
   cell.append(content,button);
  }
  const button=cell.querySelector('[data-gd-follow-source-more]');
  button.hidden=!content.classList.contains('is-expanded')&&content.scrollHeight<=content.clientHeight+1;
 }
}
document.addEventListener('click',event=>{
 const more=event.target.closest('[data-gd-follow-source-more]');
 if(more){
  const content=more.previousElementSibling,expand=more.getAttribute('aria-expanded')!=='true';
  content.classList.toggle('is-expanded',expand);more.setAttribute('aria-expanded',String(expand));more.textContent=expand?'收起原文':'展开原文';return;
 }
 const button=event.target.closest('[data-gd-follow-evidence]');
 if(!button)return;
 const scroller=button.closest('[data-gd-follow-scroll]');
 const detail=scroller?.querySelector('#'+button.dataset.gdFollowEvidence);
 if(!detail)return;
 gdSyncFollowEvidenceWidth(scroller);
 const expand=button.getAttribute('aria-expanded')!=='true';
 detail.hidden=!expand;
 button.setAttribute('aria-expanded',String(expand));
 button.textContent=expand?'收起依据':'查看依据';
 if(expand)gdPrepareFollowSourceText(detail);
});
