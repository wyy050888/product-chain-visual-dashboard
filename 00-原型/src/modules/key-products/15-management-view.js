function kpmGradeSummaryTables(rows){
 const structure=kpmManagementStructure(rows),groups=structure.filter(group=>group.level!=='unrated');
 const row=(level,facts,operating=false)=>{
  const kind=operating?'operating':'grade';
  const selected=kpmSelectedGrade===level&&(operating?kpmSelectedOperating===level:!kpmSelectedOperating);
  const label=operating?esc(kpmGrades[level]):`<span class="kpm-grade ${level}">${level}级</span>`;
  const shareWidth=Number.isFinite(facts.share)?Math.max(0,Math.min(100,facts.share)):0;
  return `<tr class="${operating?'kpm-summary-operating':'kpm-summary-grade'}" data-kpm-summary-level="${level}"${selected?' data-selected':''}>
   <th scope="row"><button type="button" data-kpm-summary-select="${kind}" value="${level}" aria-pressed="${selected}">${label}</button></th><td>${fmt(facts.count)} 个</td><td>${upMoney(facts.gsv)}</td>
   <td><span class="kpm-summary-share-value" style="--kpm-share-width:${shareWidth}%">${upPercent(facts.share)}</span></td>
   <td>${formatSalesQuantity(facts.netSales)}</td>
   <td${facts.margin<0?' class="negative"':''}>${upPercent(facts.margin)}</td></tr>`;
 };
 const table=(heading,body)=>`<table aria-label="${heading}" data-up-basic>
  <thead><tr><th scope="col">${heading}</th><th scope="col">产品数</th><th scope="col" data-up-basic>GSV</th>
  <th scope="col">GSV占比</th><th scope="col" data-up-basic>${netSalesLabel('销量','netSales')}</th><th scope="col" data-up-basic>利润率</th></tr></thead>
  <tbody>${body}</tbody></table>`;
 const unrated=structure.find(group=>group.level==='unrated');
 const note=unrated?.count?`<p class="kpm-summary-unrated">未分级 ${fmt(unrated.count)} 个</p>`:'';
 return table('等级',groups.map(group=>row(group.level,group)).join(''))
  +table('经营标签',groups.map(group=>row(group.level,group.operating,true)).join(''))+note;
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
 return `<header class="kpm-structure-heading"><h3>产品分级经营</h3>
  <button type="button" class="link" data-kpm-guide-open aria-haspopup="dialog" aria-controls="dialog">
   <svg class="kpm-guide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <path d="m8 11 1 1 2-2m2 1h3m-8 5 1 1 2-2m2 1h3"/>
   </svg>
   查看经营指引
  </button>
 </header>`+kpmManagementStructureView(rows);
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
