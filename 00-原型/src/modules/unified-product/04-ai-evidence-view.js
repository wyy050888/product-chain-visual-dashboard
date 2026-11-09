function upAiEvidenceMarkup(snapshot,productId){
 if(!snapshot)return '<p class="up-ai-evidence-empty">本次诊断未保存可核对的依据，暂无法回查；不会用当前数据补写。</p>';
 const subject=snapshot.subject||{...snapshot.product,type:'SPU'};
 if(subject.id!==String(productId))return '<p class="up-ai-evidence-empty">本次依据与当前主体不一致，暂不展示。</p>';
 const date=value=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date(value)):value;
 const records=s=>s.records?.length?`<details><summary>查看本次事件记录（${s.records.length}条）</summary><div class="up-ai-source-scroll"><table><thead><tr><th>日期</th><th>平台</th><th>事件</th><th>金额</th></tr></thead><tbody>${s.records.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.platform)}</td><td>${esc(r.type)}</td><td>${Number.isFinite(r.amount)?esc(pfMoneyYuan(r.amount)):'未提供'}</td></tr>`).join('')}</tbody></table></div></details>`:'';
 const sections=['经营结论','问题分析','部门行动'];
 const source=s=>{const display=upAiEvidenceSourcePresentation(s,subject);return `<tr class="up-ai-source"><td data-label="来源"><div class="gd-source-location"><div class="gd-source-type">${esc(display.name)}</div></div></td><td data-label="内容"><p>${esc(display.content)}</p>${records(s)}</td></tr>`};
 return `<div class="up-ai-evidence-context"><p class="up-ai-evidence-scope"><b>${esc(subject.name)}</b><span>${subject.type==='店铺'?'店铺ID':'SPU'}：${esc(subject.code)}</span><span>分析期间：${esc(snapshot.period)}；数据截至：${esc(snapshot.cutoff)}</span><span>本次生成：${esc(date(snapshot.generatedAt))}</span></p><nav class="up-ai-evidence-nav" aria-label="诊断依据板块">${sections.map((section,index)=>`<button type="button" data-up-ai-evidence-target="${index}"${index===0?' aria-current="location"':''}>${section}</button>`).join('')}</nav></div>${sections.map((section,index)=>`<section class="up-ai-evidence-section" data-up-ai-evidence-section="${index}"><h5>${section}</h5>${snapshot.items.filter(i=>i.section===section).map(i=>`<article class="up-ai-evidence-item">${i.nature&&i.nature!=='分析判断'?`<small class="up-ai-evidence-nature">${esc(i.nature)}</small>`:''}<p class="up-ai-evidence-statement">${esc(i.statement)}</p><h6>对应依据</h6><div class="gd-analysis-sources up-ai-sources"><table class="up-ai-source-table" aria-label="来源与内容"><thead><tr><th scope="col">来源</th><th scope="col">内容</th></tr></thead><tbody>${i.sources.map(source).join('')}</tbody></table></div>${i.note?`<p class="up-ai-evidence-note">${esc(upAiEvidenceNote(i.note))}</p>`:''}</article>`).join('')}</section>`).join('')}`;
}
function upMountAiEvidence(host,saved,productId){
 const button=host.querySelector('[data-up-ai-evidence]'),dialog=host.querySelector('[data-up-ai-evidence-dialog]'),body=dialog.querySelector('[data-up-ai-evidence-body]');
 const parent=host.closest('#dialogbody');let parentScroll=0;
 const markSection=()=>{
  const threshold=body.getBoundingClientRect().top+(body.querySelector('.up-ai-evidence-context')?.offsetHeight||0)+24;
  let current='0';
  for(const section of body.querySelectorAll('[data-up-ai-evidence-section]'))if(section.getBoundingClientRect().top<=threshold)current=section.dataset.upAiEvidenceSection;
  for(const link of body.querySelectorAll('[data-up-ai-evidence-target]'))if(link.dataset.upAiEvidenceTarget===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
 };
 button.onclick=()=>{parentScroll=parent?.scrollTop||0;body.innerHTML=upAiEvidenceMarkup(saved.evidence,productId);dialog.showModal();body.scrollTop=0;button.setAttribute('aria-expanded','true')};
 body.addEventListener('click',event=>{
  const link=event.target.closest('[data-up-ai-evidence-target]');if(!link)return;
  const section=body.querySelector(`[data-up-ai-evidence-section="${link.dataset.upAiEvidenceTarget}"]`);if(!section)return;
  const top=body.scrollTop+section.getBoundingClientRect().top-body.getBoundingClientRect().top-body.querySelector('.up-ai-evidence-context').offsetHeight-16;
  body.scrollTo({top,behavior:'instant'});markSection();
 });
 body.addEventListener('scroll',markSection,{passive:true});
 dialog.querySelector('[data-up-ai-evidence-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');if(parent)parent.scrollTop=parentScroll;if(button.isConnected)button.focus({preventScroll:true})});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()});
}
