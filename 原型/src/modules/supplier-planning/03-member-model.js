// 列表状态独立于点击入口；外侧数字只提供初始筛选。
function scpMemberState(kind,scope={},metric='all',range=null){
 const project=scope.kind==='project'?scpProjectFacts().find(row=>String(row.project.id)===String(scope.id)):null;
 const state={kind,dates:scpMemberDateDefaults(metric,range),stars:'all',query:project?project.project.name:'',status:'all',project:scope.kind==='project'?String(scope.id):'all',category:scope.category||'all',leaf:scope.categoryId||'all',group:scope.group||'all',brand:scope.brand||'all',material:scope.material||'all',page:1,scrollTop:0,sort:{key:'',direction:''}};
 const leaf=scpCategories.find(c=>c.id===state.leaf);if(leaf)Object.assign(state,{category:leaf.category,group:leaf.group});return state;
}
function scpListScopeRows(scope){
 const {supplierKind:kind,project,category,leaf,group,brand,material}=scope;
 const specific=[project,category,leaf,group,brand,material].some(value=>value&&value!=='all');
 if(!specific)return scpCompanies.filter(s=>s.kinds.includes(kind)).map(s=>({...s,supplierId:s.id}));
 const rows=project&&project!=='all'?(scpProjectFacts().find(row=>String(row.project.id)===project)?.links||[]):scpCapabilities.filter(row=>row.kind===kind);
 return rows.filter(row=>(!category||category==='all'||row.category===category)&&(!leaf||leaf==='all'||row.categoryId===leaf)&&(!group||group==='all'||row.group===group)&&(!brand||brand==='all'||row.brand===brand)&&pfIncludes(material,row.material));
}
// 两类供应商共用身份、筛选和排序；合作范围按各自能力台账取值。
const scpSupplierProfileCache=new Map();
function scpSupplierProfiles(kind,cutoff){
 const key=kind+'|'+cutoff;if(scpSupplierProfileCache.has(key))return scpSupplierProfileCache.get(key);
 const profiles=new Map(scpCompanies.map(s=>[s.id,{brands:[],categories:[],materials:[],projects:[]}]));
 for(const row of scpCapabilities)if(row.kind===kind&&row.reserved<=cutoff){
  const p=profiles.get(row.supplierId),category=scpCategories.find(c=>c.id===row.categoryId);
  if(category&&!p.categories.some(c=>c.id===category.id))p.categories.push(category);
  if(kind==='material'&&row.brand&&!p.brands.includes(row.brand))p.brands.push(row.brand);
  if(row.material&&!p.materials.includes(row.material))p.materials.push(row.material);
 }
 for(const fact of scpProjectFacts())for(const link of fact.links)if(link.reserved<=cutoff){
  const p=profiles.get(link.supplierId);if(!p.projects.some(project=>project.id===fact.project.id))p.projects.push(fact.project);
  if(kind==='machine'&&fact.project.brand&&!p.brands.includes(fact.project.brand))p.brands.push(fact.project.brand);
 }
 if(scpSupplierProfileCache.size>=24)scpSupplierProfileCache.clear();scpSupplierProfileCache.set(key,profiles);return profiles;
}
function scpMemberRows(state){
 const range={cutoff:DATA_CUTOFF,future:false},profiles=scpSupplierProfiles(state.kind,DATA_CUTOFF),query=state.query.trim().toLocaleLowerCase();
 const scope={kind:'supplier-list',supplierKind:state.kind,project:state.project,category:state.category,group:state.group,leaf:state.leaf,...(state.kind==='material'?{brand:state.brand,material:state.material}:{})};
 // 显式结束日期可查询当时仍有效的历史供方；清空后恢复当前有效池，资料日期始终展示最新事实。
 const disabledCutoff=Object.values(state.dates).reduce((cutoff,{to})=>to&&to<cutoff?to:cutoff,DATA_CUTOFF);
 const rows=scpMembers(scope,'reserved',range,disabledCutoff).map(s=>({...s,...profiles.get(s.id)})).filter(s=>(!query||[s.name,...s.projects.map(p=>p.name)].some(text=>text.toLocaleLowerCase().includes(query)))&&(state.status==='all'||scpStatus(s.scopeDates,range.cutoff)===state.status)&&(state.kind==='material'||state.brand==='all'||s.brands.includes(state.brand))&&(state.stars==='all'||s.stars===+state.stars)&&scpMemberDatesMatch(s,state.dates));
 return scpSort(rows,state.sort,(s,key)=>key==='stars'?s.stars:Date.parse(key==='registered'?s.registered:s.scopeDates[key]||'')||null);
}
