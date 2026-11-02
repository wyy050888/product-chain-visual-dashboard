// 考核明细与主表使用同一台账；独立期间不回写外侧，历史名单不按当前在池状态裁剪。
function nspAssessmentBadge(success,included=true,approval=null){if(!included)return '<span class="tag nsp-success-status nsp-success-quarter-empty">未纳入</span>';return '<span class="tag nsp-success-status '+(success?'green':'nsp-success-quarter-empty')+'"'+(approval?' title="'+esc('特批原因：'+approval.reason)+'"':'')+'>'+(success?(approval?'特批成功':'成功'):'不成功')+'</span>'}
function nspStatusRule(annual=false){return annual?'年度GSV门槛按当年上市天数折算，利润率和总退率门槛不变；季度成功不代表年度成功。未纳入年度名单的产品显示“未纳入”。':'截至统计截止日已取得季度成功。首次成功后保留，后续季度不重复考核。'}
function nspAssessmentData(period,cutoff=null,filters={...nspFilters}){
 return drawerWithPeriod(period,()=>{
  const range=bounds(period);if(cutoff&&cutoff<range.cutoff)range.cutoff=cutoff;
  const assessment={...nspSuccessPeriod(period),end:range.cutoff};
  const scoped=nspCategoryRows(filters.season,range);
  const rows=nspFilterRows(scoped,{...filters,success:'all',launchStart:'',launchEnd:''})
   .filter(p=>p.successAssessment.included&&(!filters.developmentType||filters.developmentType==='all'||p.developmentType===filters.developmentType));
  const unique=[...new Map(rows.map(p=>[p.spuId,p])).values()];
  return {period:{...period},assessment,summary:nspSuccessSummary(unique,assessment),rows:unique};
 },'new');
}
let nspAssessmentCurrent=null;
function nspOpenAssessment(initial=null,result='all',mode=null){
 const summary=withPeriod('new',()=>nspSuccessPeriod());
 // 文字和数字入口均沿用卡片考核周期与截止日，年度复核保持独立。
 const kind=mode||(summary.annual?'year':'quarter');
 let period=initial||{mode:kind,year:Number(summary.end.slice(0,4)),value:kind==='year'?1:Math.ceil(Number(summary.end.slice(5,7))/3)};
 let cutoff=initial?null:summary.end,page=1,data=null,matrix=null,chain='all',query='',quarter=period.mode==='quarter'?period.value:Math.ceil(Number(summary.end.slice(5,7))/3);
 const matrices=new Map();
 const filters={...nspFilters,developmentType:'all'},sort={key:'gsv',direction:'desc'};
 openModal('新品销售成功考核','<div class="nsp-assessment"><div class="nsp-assessment-head-controls" data-nsp-assessment-controls role="group" aria-label="考核筛选"></div><div data-nsp-assessment-summary></div><div class="nsp-assessment-detail-toolbar" data-nsp-assessment-detail-header></div><div class="up-table" data-nsp-assessment-table></div><div data-nsp-assessment-pages></div></div>',false);
 const root=$('#dialogbody .nsp-assessment');
 const header=root.querySelector('[data-nsp-assessment-controls]');
 const selectData=()=>{
  if(!matrix.groups.some(group=>group.key===chain))chain='all';
  const selected=period.mode==='year'?matrix.periods[0]:matrix.periods.find(p=>p.quarter===quarter&&p.available)||matrix.periods.filter(p=>p.available).at(-1);
  if(period.mode==='quarter')quarter=selected.quarter;
  period.value=period.mode==='year'?1:quarter;
  data=nspAssessmentScopedData(selected.data,chain);
 };
 const render=()=>{
  const key=period.year+'|'+period.mode+'|'+(cutoff||DATA_CUTOFF)+'|'+filters.developmentType+'|'+nspApprovalRevision;
  if(!matrices.has(key))matrices.set(key,nspAssessmentMatrix(period.year,period.mode==='year',cutoff,filters));
  matrix=matrices.get(key);selectData();
  nspRenderAssessmentHeader(header,period,filters.developmentType);
  root.querySelector('[data-nsp-assessment-summary]').innerHTML=nspAssessmentMatrixHTML(matrix,quarter,chain,result);
  fillTable();nspUpdateAssessmentMatrixSelection(root,quarter,chain,result);
 };
 const fillTable=()=>{
  const detail=nspAssessmentSearchData(data,query),rows=nspAssessmentSortRows(detail.rows.filter(p=>result==='all'||p.successAssessment.success===(result==='success')),sort);
  page=Math.max(1,Math.min(page,Math.max(1,Math.ceil(rows.length/listPageSize('nsp-assessment',10)))));
  nspAssessmentCurrent={...detail,result,sort:{...sort},page,chain,query,developmentType:filters.developmentType,matrix:nspAssessmentMatrixSnapshot(matrix)};
  nspRenderAssessmentDetailHeader(root.querySelector('[data-nsp-assessment-detail-header]'),detail,result,chain,query);
  const tableHost=root.querySelector('[data-nsp-assessment-table]');
  const tableMarkup=rows.length?table(nspAssessmentTableHeaders(sort),rows.slice((page-1)*listPageSize('nsp-assessment',10),page*listPageSize('nsp-assessment',10)).map(p=>{
   const a=p.successAssessment,f=a.facts;
   return [titleProduct(p,{showBrand:false}),nspAssessmentLaunchQuarterTag(p.actualLaunch),upMoney(f.gsvCents),upPercent(f.profitRate),upPercent(f.returnRate),nspAssessmentBadge(a.success,true,a.approval),p.actualLaunch,nspApprovalActions(p,data.assessment)];
  })):'<div class="empty">'+(query.trim()?'暂无匹配产品':'该周期暂无符合条件的考核产品')+'</div>';
  nspRenderAssessmentTable(tableHost,tableMarkup,sort);
  const host=root.querySelector('[data-nsp-assessment-pages]');host.innerHTML=listPager(rows.length,page,listPageSize('nsp-assessment',10),{sizeKey:'nsp-assessment',attr:'data-nsp-assess-page'});
 };
 header.onchange=e=>{
  if(!e.target.matches('[data-nsp-assess-year]'))return;
  period.year=Number(e.target.value);cutoff=null;matrices.clear();chain='all';page=1;render();
 };
 header.onclick=e=>{
  const development=e.target.closest('[data-nsp-assess-development]');
  if(development){const value=development.dataset.nspAssessDevelopment;if(!['all',...filterCatalog.developmentTypes].includes(value)||value===filters.developmentType)return;
   filters.developmentType=value;page=1;render();return;
  }
  const button=e.target.closest('[data-nsp-assess-kind]');if(!button||button.dataset.nspAssessKind===period.mode)return;
  period.mode=button.dataset.nspAssessKind;cutoff=null;page=1;render();
 };
 root.nspAssessmentSelect=key=>{if(!['all','success','failure'].includes(key)||key===result)return;
  result=key;page=1;fillTable();nspUpdateAssessmentMatrixSelection(root,quarter,chain,result);
 };
 const searchDetails=event=>{
  if(!event.target.matches('[data-nsp-assess-search]')||event.isComposing)return;
  query=event.target.value;page=1;fillTable();
 };
 root.oninput=searchDetails;root.addEventListener('compositionend',searchDetails);
 root.onclick=e=>{
  const approval=e.target.closest('[data-nsp-approval]');
  if(approval){const product=data.rows.find(row=>row.spuId===approval.dataset.nspApprovalSpu);if(!product)return;
   nspOpenApproval(product,{...data.assessment},approval.dataset.nspApproval==='revoke',approval,()=>{matrices.clear();render();nspRefreshResults()});return;
  }
  const matrixCell=e.target.closest('[data-nsp-assess-matrix]'),resultButton=e.target.closest('[data-nsp-assess-result]');
  if(matrixCell){
   if(period.mode==='quarter')quarter=Number(matrixCell.dataset.nspAssessMatrix);
   chain=matrixCell.dataset.nspAssessChain;result=matrixCell.dataset.nspAssessPool;page=1;selectData();fillTable();nspUpdateAssessmentMatrixSelection(root,quarter,chain,result);return;
  }
  if(resultButton){root.nspAssessmentSelect(resultButton.dataset.nspAssessResult);return}
  const order=e.target.closest('[data-nsp-assess-sort]');
  if(order){const key=order.dataset.nspAssessSort;if(!Object.hasOwn(nspAssessmentSortFields,key))return;
   sort.direction=sort.key===key&&sort.direction==='desc'?'asc':'desc';sort.key=key;page=1;fillTable();
   root.querySelector('[data-nsp-assess-sort="'+key+'"]')?.focus({preventScroll:true});return;
  }
  const pager=e.target.closest('[data-nsp-assess-page]'),product=e.target.closest('[data-nsp-assess-product]');
  if(pager&&!pager.disabled){page=Number(pager.dataset.nspAssessPage);fillTable()}
  else if(product)upOpenDetail({spuId:product.dataset.nspAssessProduct,start:data.assessment.start,end:data.assessment.end,period:{...period},tab:'operating',platform:'all',module:'new'});
 };
 root.onkeydown=e=>{
  const tab=e.target.closest('[data-nsp-assess-result]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();const tabs=[...root.querySelectorAll('[data-nsp-assess-result]')],index=tabs.indexOf(tab),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  tabs[next].click();tabs[next].focus({preventScroll:true});
 };
 render();
}
window.dashboardNewProductAssessmentSnapshot=()=>nspAssessmentCurrent;
