// 按字段分配宽度；短字段固定，剩余空间只分给问题描述和行动建议。
const gdAnalysisColumnSpecs=Object.freeze({
 '诊断日期':{width:100,min:96},'更新日期':{width:100,min:96},
 '业务对象':{width:260,min:240},'项目红绿灯':{width:108,min:104},
 '风险榜单':{width:132,min:120},'优先级':{width:82,min:78},
 '建议负责人':{width:150,min:130},'涉及人员':{width:150,min:130},
 '建议整改期限':{width:136,min:124},'跟进状态':{width:164,min:140},
 '操作':{width:104,min:104},
 '问题描述':{min:300,flex:true},'行动建议':{min:340,flex:true}
});
// 重点工作清单进一步让出短字段空间，两类长文本保持各自的阅读宽度。
const gdKeyWorkColumnSpecs=Object.freeze({
 '诊断日期':{width:96,min:96},'更新日期':{width:96,min:96},
 '业务对象':{width:260,min:240},'项目红绿灯':{width:96,min:96},
 '风险榜单':{width:124,min:120},'建议负责人':{width:128,min:128},
 '建议整改期限':{width:120,min:120},'跟进状态':{width:128,min:128}
});
function gdAnalysisColumnSpec(label,profile){
 if(profile.startsWith('key-work')){
  const highRisk=profile==='key-work-high-risk';
  if(label==='问题描述')return {min:highRisk?420:380,flex:true};
  if(label==='行动建议')return {min:highRisk?460:420,flex:true};
  if(gdKeyWorkColumnSpecs[label])return gdKeyWorkColumnSpecs[label];
 }
 return gdAnalysisColumnSpecs[label]||{width:128,min:96};
}
function gdAnalysisColumnLayout(headers,kind){
 const labels=headers.map(h=>typeof h==='string'?h:h.label);
 const profile=kind==='key-work'?'key-work-'+(labels.includes('风险榜单')?'high-risk':'project'):kind;
 const columns=labels.map(label=>gdAnalysisColumnSpec(label,profile));
 const minimum=columns.reduce((sum,col)=>sum+(col.width||col.min),0);
 const key='gd-'+kind+'-readable-columns-'+(kind==='key-work'?'v4':'v3')+'|'+labels.join('|');
 const attributes=`data-gd-column-profile="${profile}" data-gd-minimum-width="${minimum}" data-column-key="${esc(key)}" data-column-minimums="${esc(JSON.stringify(columns.map(col=>col.min)))}" style="width:${minimum}px;min-width:${minimum}px"`;
 const markup=columns.map((col,index)=>{
  const width=(col.width||col.min)+'px';
  return `<col data-gd-column="${esc(labels[index])}" style="width:${width}">`;
 }).join('');
 return {attributes,columns:'<colgroup>'+markup+'</colgroup>'};
}
let gdAnalysisColumnObserver=null;
function gdMountAnalysisColumns(root){
 gdAnalysisColumnObserver?.disconnect();
 const table=root.querySelector('table[data-gd-column-profile]');if(!table)return;
 const host=table.parentElement;
 const measure=()=>{
  // 已保存或手工调整过的宽度由公共列宽组件维护。
  if(!table.isConnected||table.classList.contains('ui-table-widths'))return;
  const minimum=Number(table.dataset.gdMinimumWidth),width=Math.max(minimum,host.clientWidth);
  const columns=[...table.querySelectorAll(':scope>colgroup>col')];
  const specs=columns.map(col=>gdAnalysisColumnSpec(col.dataset.gdColumn,table.dataset.gdColumnProfile));
  const extra=(width-minimum)/Math.max(1,specs.filter(spec=>spec.flex).length);
  const widths=specs.map(spec=>(spec.flex?spec.min+extra:spec.width)+'px');
  return ()=>{
   if(!table.isConnected||table.classList.contains('ui-table-widths'))return;
   columns.forEach((col,index)=>{if(col.style.width!==widths[index])col.style.width=widths[index]});
   if(table.style.width!==width+'px')table.style.width=width+'px';
  };
 };
 const fit=()=>dashboardQueueLayout(host,measure);
 fit();gdAnalysisColumnObserver=new ResizeObserver(fit);gdAnalysisColumnObserver.observe(host);
}
