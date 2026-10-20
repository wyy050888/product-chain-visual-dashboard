// 字段与筛选由同一入口维护；物料列表只扩展合作物料一列。
function scpSupplierFilters(state){
 const status=['已储备','已准入','已合作'].map(value=>[value,value]);
 const select=(key,label,options)=>`<label>${label}<select data-scp-member-filter="${key}" ${key==='status'?'data-scp-member-status':''} ${key==='material'?'data-pf-multiple data-pf-label="合作物料"':''} aria-label="${label}"><option value="all">全部</option>${options.map(([value,text])=>`<option value="${esc(String(value))}" ${pfOptionSelected(state[key],value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
 const brands=[...new Set([...scpSupplierProfiles(state.kind,DATA_CUTOFF).values()].flatMap(p=>p.brands))];
 return `<label class="ui-search-field"><input type="search" data-scp-member-search placeholder="供应商名称 / 项目名称" aria-label="搜索供应商名称或项目名称" value="${esc(state.query)}"></label>${select('status','供应商状态',status)}${select('brand','合作品牌',brands.map(name=>[name,name]))}${scpCategoryPicker(state)}${state.kind==='material'?select('material','合作物料',scpCooperationMaterials.map(name=>[name,name])):''}${select('stars','供应商星级',[[1,'一星'],[2,'二星'],[3,'三星']])}${scpMemberDateFilters(state)}<button type="button" class="link" data-scp-member-reset>重置</button>`;
}
function scpSupplierTable(rows,state){
 const material=state.kind==='material',columns=[['supplier','供应商信息'],['status','供应商状态'],['brands','合作品牌'],['categories','合作类目'],...(material?[['materials','合作物料']]:[]),['stars','供应商星级',true],... [['registered','注册日期'],['reserved','储备日期'],['admitted','准入日期'],['cooperation','合作日期']].map(([key,label])=>[key,label,true]),['owner','负责采购'],['action','操作']];
 const text=value=>value.length?value.map(esc).join('、'):'—';
 const header=columns.map(([key,label,sort])=>sort?scpSortHead(key,label,state.sort).replace('<th ',`<th class="scp-col-${key}" `):`<th data-up-basic class="scp-col-${key}">${label}</th>`).join('');
 const body=rows.map(s=>{
  const cells={supplier:`<strong>${esc(s.name)}</strong>`,status:`<span class="scp-state-tag ${scpStatus(s.scopeDates,DATA_CUTOFF)==='已合作'?'green':''}">${scpStatus(s.scopeDates,DATA_CUTOFF)}</span>`,brands:`<div class="scp-cooperation-text">${text(s.brands)}</div>`,categories:`<div class="scp-cooperation-text">${text(s.categories.map(c=>c.path))}</div>`,materials:`<div class="scp-cooperation-text">${text(s.materials)}</div>`,stars:`<span class="scp-supplier-stars" aria-label="${['','一星','二星','三星'][s.stars]}">${'★'.repeat(s.stars)}</span>`,registered:s.registered||'—',...Object.fromEntries(['reserved','admitted','cooperation'].map(key=>[key,s.scopeDates[key]||'—'])),owner:esc(s.owner),action:'<button type="button" class="link" data-scp-supplier-view data-metric-rule="跳转至供应商详情页">查看</button>'};
  return `<tr data-scp-supplier-row="${s.id}">${columns.map(([key])=>`<td class="scp-col-${key}">${cells[key]}</td>`).join('')}</tr>`;
 }).join('')||`<tr><td class="empty" colspan="${columns.length}">暂无数据</td></tr>`;
 // 新版列宽单独保存，避免旧窄列偏好覆盖此次调整，两个Tab仍各自保留后续拖拽。
 return scpTable('<tr>'+header+'</tr>',body,'scp-member-table scp-supplier-member-table'+(material?' scp-material-member-table':'')).replace('<table ',`<table data-column-key="scp-supplier-${state.kind}-cooperation-wide-v1" `);
}
