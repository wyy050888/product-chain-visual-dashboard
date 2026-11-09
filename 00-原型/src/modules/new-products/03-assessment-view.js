// 筛选集中在汇总表上方；整体随父抽屉快照恢复，详情返回不重建状态。
function nspAssessmentHeaderHTML(period,developmentType='all'){
 const years=dashboardYears(2,period.year).filter(y=>y<=Number(DATA_CUTOFF.slice(0,4)));
 return '<select data-nsp-assess-year aria-label="考核年份">'+years.map(y=>'<option value="'+y+'" '+(y===period.year?'selected':'')+'>'+y+'年</option>').join('')+'</select><span class="period-segment" role="group" aria-label="考核视图">'+[['quarter','季度总览'],['year','年度考核']].map(([key,label])=>'<button type="button" data-nsp-assess-kind="'+key+'" aria-pressed="'+(period.mode===key)+'">'+label+'</button>').join('')+'</span><span class="period-segment" role="group" aria-label="项目类型">'+[['all','全部'],...filterCatalog.developmentTypes.map(name=>[name,name])].map(([key,label])=>'<button type="button" data-nsp-assess-development="'+key+'" aria-pressed="'+(developmentType===key)+'">'+label+'</button>').join('')+'</span>';
}
// 保留年份触发器和周期按钮，期间变化只更新选项与选中状态，避免重复挂载测量。
function nspRenderAssessmentHeader(host,period,developmentType='all'){
 const source=host.querySelector('[data-nsp-assess-year]');
 if(!source){host.innerHTML=nspAssessmentHeaderHTML(period,developmentType);return}
 const template=document.createElement('template');template.innerHTML=nspAssessmentHeaderHTML(period,developmentType);
 const nextYear=template.content.querySelector('[data-nsp-assess-year]');
 const optionsKey=select=>JSON.stringify([...select.options].map(o=>[o.value,o.textContent,o.disabled]));
 if(optionsKey(source)!==optionsKey(nextYear))source.replaceChildren(...nextYear.options);
 if(source.value!==String(period.year))source.value=String(period.year);
 for(const button of host.querySelectorAll('[data-nsp-assess-kind]')){const selected=String(button.dataset.nspAssessKind===period.mode);if(button.getAttribute('aria-pressed')!==selected)button.setAttribute('aria-pressed',selected)}
 for(const button of host.querySelectorAll('[data-nsp-assess-development]')){const selected=String(button.dataset.nspAssessDevelopment===developmentType);if(button.getAttribute('aria-pressed')!==selected)button.setAttribute('aria-pressed',selected)}
}
// 数据行变化保留表头、排序按钮和用户列宽，避免重新初始化整张表。
function nspRenderAssessmentTable(host,markup,sort){
 const current=host.querySelector(':scope>table');
 if(!current||!markup.startsWith('<table'))host.innerHTML=markup;
 else{const template=document.createElement('template');template.innerHTML=markup;const next=template.content.querySelector('table');
  if(current.tHead.rows[0].cells.length!==next.tHead.rows[0].cells.length)host.replaceChildren(next);
  else current.tBodies[0].replaceChildren(...next.tBodies[0].children);
 }
 nspAssessmentSortAria(host,sort);
}
function nspAssessmentResultTabs(data){
 const total=data.rows.length,success=data.summary.success;
 return [['all','全部纳入',total],['success','成功',success],['failure','不成功',total-success]].map(([key,label,count])=>({key,label:label+' '+count}));
}
// 上市季度只取实际上市日期，独立于当前考核季度及滚入状态。
function nspAssessmentLaunchQuarterTag(launch){
 if(!uiPeriodValidDate(launch))return '<span class="muted">—</span>';
 const year=launch.slice(0,4),quarter=Math.ceil(Number(launch.slice(5,7))/3);
 return '<span class="nsp-launch-quarter" data-launch-quarter="'+quarter+'" data-launch-year="'+year+'">'+year.slice(-2)+'/Q'+quarter+'</span>';
}
const nspAssessmentPreviousProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector(':scope>.nsp-assessment');if(!root)return nspAssessmentPreviousProfile(body,title);
 return {root,entries:[{node:root,key:'shared'}],tabs:[],activeKey:'shared'};
};
