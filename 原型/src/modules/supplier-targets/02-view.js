const stRoute='#system-supplier-targets';
function stInput(value,scope,label){return `<input type="number" min="${scope.type==='standards'?1:0}" max="99999" step="1" class="lt-target-input" value="${value??''}" placeholder="未配置" data-st-value="${esc(JSON.stringify({year:stEditor.year,...scope}))}" aria-label="${esc(label)}">`}
function stSummary(values){const total=stTotal(values);return total===null?'<span class="lt-unconfigured">未配置</span>':`<span class="lt-amount">${fmt(total)}</span>`}
function stRenderFeedback(){$('#st-error').textContent=stEditor.error}
function stPrimaryTargets(values){
 const rows=[['一级核心战略合作供应商','年度新增合作',stInput(stResourceAnnual(stEditor.year),{type:'resource'},'一级供应商年度新增合作目标数量')],
 ...[['每个项目（自研、自选）','意向储备','projectReserved'],['每个项目（自研、自选）','准入储备','projectAdmitted'],['每个三级类目（年度）','新增准入','categoryAdmitted'],['每个三级类目（年度）','新增合作','categoryCooperation']].map(([scope,label,key])=>[scope,label,stInput(values.standards[key],{type:'standards',key},scope+label+'目标数量')])];
 const body=rows.map(([scope,label,input],index)=>{
  const first=index===0||rows[index-1][0]!==scope;let span=1;
  while(rows[index+span]?.[0]===scope)span++;
  return `<tr>${first?`<th scope="${span>1?'rowgroup':'row'}" rowspan="${span}">${scope}</th>`:''}<td>${label}</td><td>${input}</td></tr>`;
 }).join('');
 return `<h3>一级供应商</h3><table class="cec-table st-primary-table" aria-label="一级供应商目标"><thead><tr><th>适用范围</th><th>指标</th><th>目标数量</th></tr></thead><tbody>${body}</tbody></table>`;
}
function stRenderPage(){
 $('#st-year').value=String(stEditor.year);
 const values=stYear(stEditor.year);
 $('#st-table').innerHTML=stPrimaryTargets(values)+stMaterialTargetsView();
 stRenderFeedback();
}
smRegisterPage({route:stRoute,id:'st-target-page',title:'供应商目标',group:'目标管理',menuOrder:30,markup:`<header class="lt-page-head sm-target-head"><h2 class="sm-page-title">供应商目标</h2><label class="lt-year-field"><select id="st-year" aria-label="目标年度">${stYears.map(year=>`<option value="${year}">${year}年</option>`).join('')}</select></label></header><section class="lt-panel"><div id="st-error" role="alert"></div><div id="st-table" tabindex="0" aria-label="供应商目标配置表"></div></section>`,onShow(){stEditor.year=stYears.includes(scpState.materialPeriod.year)?scpState.materialPeriod.year:2026;stEditor.error='';stRenderPage()}});
$('#suppliers .titlegroup').insertAdjacentHTML('afterend','<button type="button" class="btn" id="st-open-targets">配置目标</button>');
$('#st-open-targets').onclick=()=>smNavigate(stRoute);
