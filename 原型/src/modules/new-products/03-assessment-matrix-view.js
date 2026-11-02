// 汇总矩阵按季度分组，纳入/成功可直接筛选下方明细，不新增弹层。
function nspAssessmentMatrixHTML(matrix,quarter,chain,result){
 const label=p=>matrix.annual?'年度考核':'Q'+p.quarter;
 const action=(p,key,value,text,extra='')=>'<button type="button" data-nsp-assess-matrix="'+(p.quarter||'year')+'" data-nsp-assess-chain="'+esc(key)+'" data-nsp-assess-pool="'+value+'" '+extra+'>'+text+'</button>';
 const heading=matrix.periods.map(period=>'<th colspan="3" scope="colgroup" class="nsp-quarter-group">'+label(period)+'</th>').join('');
 const subheads=matrix.periods.map(()=>'<th>纳入数</th><th>成功数</th><th>成功率</th>').join('');
 const rows=matrix.groups.map(group=>'<tr data-nsp-matrix-group="'+esc(group.key)+'" class="'+(group.key==='all'?'nsp-matrix-company':'')+'"><th scope="row">'+esc(group.label)+'</th>'+matrix.periods.map((period,index)=>{
  const summary=group.summaries[index],active=group.key===chain&&(matrix.annual||period.quarter===quarter),className=active?'nsp-matrix-selected':'';
  if(!summary)return '<td colspan="3" class="nsp-matrix-future">未开始</td>';
  const marker=' data-nsp-matrix-quarter="'+(period.quarter||'year')+'"';
  return '<td'+marker+' class="'+className+'">'+action(period,group.key,'all',fmt(summary.total),'aria-pressed="'+(active&&result==='all')+'" aria-label="'+label(period)+' '+esc(group.label)+' 纳入数 '+summary.total+'"')+'</td>'
   +'<td'+marker+' class="'+className+'">'+action(period,group.key,'success',fmt(summary.success),'aria-pressed="'+(active&&result==='success')+'" aria-label="'+label(period)+' '+esc(group.label)+' 成功数 '+summary.success+'"')+'</td>'
   +'<td'+marker+' class="'+className+' nsp-matrix-rate">'+upPercent(summary.rate)+'</td>';
 }).join('')+'</tr>').join('');
 return '<div class="nsp-assessment-matrix-scroll"><table class="nsp-assessment-matrix'+(matrix.annual?' is-annual':'')+'" aria-label="'+(matrix.annual?'年度考核汇总':'四季考核汇总')+'"><thead><tr><th rowspan="2" scope="col">产品链</th>'+heading+'</tr><tr>'+subheads+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function nspUpdateAssessmentMatrixSelection(root,quarter,chain,result){
 for(const row of root.querySelectorAll('[data-nsp-matrix-group]'))for(const cell of row.querySelectorAll('[data-nsp-matrix-quarter]')){
  const selected=row.dataset.nspMatrixGroup===chain&&['year',String(quarter)].includes(cell.dataset.nspMatrixQuarter);
  cell.classList.toggle('nsp-matrix-selected',selected);
  const button=cell.querySelector('[aria-pressed]'),pressed=String(selected&&button?.dataset.nspAssessPool===result);if(button&&button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);
 }
 // 窄屏仅横向露出当前季度，页面纵向位置保持不变。
 requestAnimationFrame(()=>{
  if(!root.isConnected)return;
  const host=root.querySelector('.nsp-assessment-matrix-scroll'),cell=host.querySelector('.nsp-matrix-selected');
  if(!cell||host.scrollWidth<=host.clientWidth+1)return;
  const label=cell.closest('tr').querySelector('th'),edge=host.getBoundingClientRect().left+label.getBoundingClientRect().width;
  host.scrollLeft+=cell.getBoundingClientRect().left-edge;
 });
}
function nspRenderAssessmentDetailHeader(host,data,result,chain,query=''){
 if(!host.firstElementChild)host.innerHTML='<div class="nsp-assessment-detail-heading"><h3></h3><span class="nsp-assessment-range"></span></div><div class="nsp-assessment-detail-controls"><label class="ui-search-field nsp-assessment-search"><input type="search" data-nsp-assess-search aria-label="搜索考核产品名称、SPU码或型号" placeholder="搜索产品名称 / SPU码 / 型号" autocomplete="off"></label><div class="nsp-assessment-results" data-nsp-assess-results role="tablist" aria-label="考核结果"></div></div>';
 const search=host.querySelector('[data-nsp-assess-search]');if(search.value!==query)search.value=query;
 const title=host.querySelector('h3'),label=(data.assessment.annual?'年度':data.assessment.label)+' · '+(chain==='all'?'公司汇总':chain);
 if(title.textContent!==label)title.textContent=label;
 const range=host.querySelector('.nsp-assessment-range'),dates=data.assessment.start.slice(5).replace('-','/')+' — '+data.assessment.end.slice(5).replace('-','/');if(range.textContent!==dates)range.textContent=dates;
 const tabs=host.querySelector('[data-nsp-assess-results]');
 for(const [index,item] of nspAssessmentResultTabs(data).entries()){
  let button=tabs.children[index];if(!button){button=document.createElement('button');button.type='button';button.setAttribute('role','tab');tabs.append(button)}
  if(button.dataset.nspAssessResult!==item.key)button.dataset.nspAssessResult=item.key;if(button.textContent!==item.label)button.textContent=item.label;
  const selected=String(item.key===result),tabIndex=item.key===result?0:-1;if(button.getAttribute('aria-selected')!==selected)button.setAttribute('aria-selected',selected);if(button.tabIndex!==tabIndex)button.tabIndex=tabIndex;
 }
}
