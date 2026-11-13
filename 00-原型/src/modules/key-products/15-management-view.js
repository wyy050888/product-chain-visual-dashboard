function kpmGradeSummaryTable(rows){
 const row=(level,facts,operating=false)=>{
  const kind=operating?'operating':'grade',unrated=level==='unrated';
  const selected=kpmSelectedGrade===level&&(operating?kpmSelectedOperating===level:!kpmSelectedOperating);
  const label=operating?`<span aria-hidden="true">↳</span> ${esc(kpmGrades[level])}`:`<span class="kpm-grade ${level}">${level}级</span>`;
  const name=unrated?'未分级':`<button type="button" data-kpm-summary-select="${kind}" value="${level}" aria-pressed="${selected}">${label}</button>`;
  const shareWidth=Number.isFinite(facts.share)?Math.max(0,Math.min(100,facts.share)):0;
  return `<tr class="${operating?'kpm-summary-operating':'kpm-summary-grade'}" data-kpm-summary-level="${level}"${selected?' data-selected':''}>
   <th scope="row">${name}</th><td>${fmt(facts.count)}</td><td>${upMoney(facts.gsv)}</td>
   <td class="kpm-summary-share"><div class="kpm-summary-share-value"><span class="kpm-summary-share-track" aria-hidden="true"><i style="width:${shareWidth}%"></i></span><span>${upPercent(facts.share)}</span></div></td>
   <td>${formatSalesQuantity(facts.netSales)}</td>
   <td${facts.margin<0?' class="negative"':''}>${upPercent(facts.margin)}</td></tr>`;
 };
 const body=kpmManagementStructure(rows).map(group=>group.level==='unrated'
  ?group.count?row(group.level,group):''
  :row(group.level,group)+row(group.level,group.operating,true)).join('');
 return `<table aria-labelledby="kpm-structure-heading" data-up-basic>
  <thead><tr><th scope="col">等级 / 经营标签</th><th scope="col">产品数</th><th scope="col" data-up-basic>GSV</th>
  <th scope="col" class="kpm-summary-share">GSV占比</th><th scope="col" data-up-basic>${netSalesLabel('销量','netSales')}</th><th scope="col" data-up-basic>利润率</th></tr></thead>
  <tbody>${body}</tbody></table>`;
}

// 六卡共用基础范围，计数忽略自身等级和异动筛选。
function kpmManagementStructureView(rows){
 const changes=['up','down'].map(key=>{
  const count=rows.filter(p=>p.assessment.change===key).length,active=kpmSelectedChange===key&&kpmSelectedGrade==='all';
  return '<button type="button" class="kpm-structure-item kpm-change-card '+key+(active?' active':'')+'" data-kpm-summary-change="'+key+'" aria-pressed="'+active+'"><span class="kpm-structure-title"><i aria-hidden="true"></i>'+kpmChanges[key]+'</span><span class="kpm-structure-quantity"><strong class="kpm-structure-count">'+count+'</strong><span class="kpm-structure-unit">个</span></span></button>';
 }).join('');
 const metric=(s,operating=false)=>{
  const facts=operating?s.operating:s,label=operating?kpmGrades[s.level]:s.level+'级产品';
  const direction=facts.count===facts.before?'flat':facts.count>facts.before?'up':'down',active=kpmSelectedGrade===s.level&&(operating?kpmSelectedOperating===s.level:!kpmSelectedOperating);
  return '<button type="button" class="kpm-structure-metric '+(operating?'kpm-operating-metric':'kpm-scale-metric')+(active?' active':'')+'" data-kpm-'+(operating?'operating':'grade')+'="'+s.level+'" aria-pressed="'+active+'"><span class="'+(operating?'kpm-operating-title':'kpm-structure-title')+'">'+(operating?label:'<i aria-hidden="true"></i><span class="kpm-structure-level">'+s.level+'</span>级产品')+'</span><span class="kpm-metric-quantity"><strong class="'+(operating?'kpm-operating-count':'kpm-structure-count')+'">'+facts.count+'</strong><span class="kpm-structure-unit">个</span></span><span class="kpm-metric-comparison"><span>较上期</span><b class="kpm-structure-delta" data-direction="'+direction+'" aria-label="较上期变化">'+(direction==='flat'?'持平':(direction==='up'?'↑':'↓')+Math.abs(facts.count-facts.before))+'</b></span></button>';
 };
 return '<div class="kpm-structure-summary" role="group" aria-label="等级升降及规模、经营两组指标">'+changes+kpmManagementStructure(rows).filter(s=>s.level!=='unrated').map(s=>'<div class="kpm-structure-item kpm-dual-card" data-kpm-card-grade="'+s.level+'">'+metric(s)+metric(s,true)+'</div>').join('')+'</div>';
}
// 明细上方的六卡独立于两个图表，重绘数量不会移动原矩阵节点。
function kpmManagementStructureSection(rows){
 return '<header class="kpm-structure-heading"><h3>产品分级经营</h3></header>'+kpmManagementStructureView(rows);
}
function kpmManagementView(rows){
 return '<section class="kpm-management" data-management-view="matrix" aria-label="产品经营矩阵"><div class="kpm-management-body"><section class="kpm-management-section" data-kpm-management-section="structure" aria-labelledby="kpm-structure-heading"><div data-kpm-plot-slot></div></section></div></section>';
}
function kpmRenderManagementFacts(rows,gradeRows){
 const structure=$('#matrix.kpm-main #matrix-structure-summary');
 if(structure)structure.innerHTML=kpmManagementStructureSection(gradeRows);
}
function kpmRenderManagementOnly(){
 if(!$('#matrix.kpm-main .kpm-management'))return;
 withPeriod('matrix',()=>{const rows=kpmRows();kpmRenderManagementFacts(kpmFilterRows(rows,true,false),kpmFilterRows(rows,false,false))});
}

document.addEventListener('click',event=>{
 const summary=event.target.closest('#matrix.kpm-main [data-kpm-summary-change]');
 if(summary){
  const key=summary.dataset.kpmSummaryChange;kpmSelectedGrade='all';kpmSelectedOperating=null;
  if(kpmSelectedChange===key){kpmSelectedChange='all';kpmPage.value=1;kpmRender();}else kpmSelectChangeFilter(key);
  $('#matrix [data-kpm-summary-change="'+key+'"]').focus({preventScroll:true});return;
 }
});
document.addEventListener('product-todos-updated',kpmRenderManagementOnly);
