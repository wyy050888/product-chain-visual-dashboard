// 沿用现有AI建议的蓝紫星芒标识，不增加表头文案。
function kpmInsightHeading(){
 return '<span class="kpm-ai-column-heading"><span class="ai-logo ai-logo--icon" aria-hidden="true"></span><span>AI判断</span></span>';
}
// AI判断直接列示，完整方案在同一表格展开；只改展示，不写入或复制任务。
function kpmInlineInsight(item){
 const a=item.advice;
 return `<div class="kpm-inline-summary"><strong>${esc(a.decision)}</strong><div class="kpm-inline-actions">${a.actions.map(([dept,text])=>`<div><b>${esc(dept)}</b><span>${esc(text)}</span></div>`).join('')}</div><button type="button" class="link kpm-inline-toggle" data-kpm-ai-detail="${item.product.spuId}" aria-expanded="false">依据与建议<i aria-hidden="true"></i></button></div>`;
}
function kpmInlineInsightPanel(item){
 const d=kpmDecisionEvidence(item);
 return `<div class="kpm-inline-panel"><dl class="kpm-decision-brief"><dt>关键依据</dt><dd>${d.evidence.map(e=>`<div><span class="kpm-evidence-source">${esc(e.source)}</span>${esc(e.text)}</div>`).join('')}</dd><dt>待核实</dt><dd>${esc(d.pending)}</dd><dt>AI建议</dt><dd>${esc(d.advice)}</dd></dl></div>`;
}
function kpmRenderInlineInsights(root,items,expanded){
 const table=root.querySelector('.kpm-management-products'),body=table?.tBodies[0];if(!body)return;
 body.querySelectorAll(':scope > .kpm-insight-expanded').forEach(row=>row.remove());
 const byId=new Map(items.map(i=>[i.product.spuId,i]));
 for(const row of body.querySelectorAll(':scope > tr[data-kpm-list-spu]')){
  const id=row.dataset.kpmListSpu,item=byId.get(id),toggle=row.querySelector('[data-kpm-ai-detail]'),open=expanded.has(id);if(!item||!toggle)continue;
  toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-controls','kpm-inline-'+id);
  row.classList.toggle('kpm-insight-open',open);if(!open)continue;
  const detail=document.createElement('tr'),cell=document.createElement('td');detail.className='kpm-insight-expanded';detail.dataset.kpmExpandedSpu=id;detail.id='kpm-inline-'+id;
  cell.colSpan=table.tHead.rows[0].cells.length;cell.innerHTML=kpmInlineInsightPanel(item);detail.append(cell);row.after(detail);
 }
}
function kpmToggleInlineInsight(root,id,items,expanded){
 if(expanded.has(id))expanded.delete(id);else expanded.add(id);
 kpmRenderInlineInsights(root,items,expanded);
}
