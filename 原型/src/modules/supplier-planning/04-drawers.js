function scpStatus(row,cutoff){return row.cooperation&&row.cooperation<=cutoff?'已合作':row.admitted&&row.admitted<=cutoff?'已准入':'已储备'}
function scpOpenSupplier(id,cutoff){
 const supplier=scpCompanyMap.get(id);if(!supplier)return;
 let tab='capabilities',page=1,query='';const date=key=>supplier[key]&&supplier[key]<=cutoff?supplier[key]:'—';
 openModal(supplier.name,`<article class="scp-drawer" data-scp-drawer="supplier" data-scp-tab="capabilities"><div class="scp-supplier-info">${[['供应商编码',supplier.code],['供应商类型',supplier.kinds.map(kind=>kind==='machine'?'整机':'物料').join(' / ')],['采购人员',supplier.owner],['首次储备日期',date('reserved')],['首次准入日期',date('admitted')],['首次合作日期',date('cooperation')]].map(([label,value])=>`<div><small data-up-basic>${label}</small><strong>${esc(value)}</strong></div>`).join('')}</div><div class="scp-drawer-tools"><input type="search" data-scp-supplier-search placeholder="搜索供货范围 / 项目" aria-label="搜索供应商关联信息"></div><div class="scp-supplier-results"></div><div class="scp-member-pages"></div></article>`);
 const root=$('.scp-drawer'),result=root.querySelector('.scp-supplier-results');
 const capabilities=scpCapabilities.filter(row=>row.supplierId===id&&row.reserved<=cutoff),projectsForSupplier=scpProjectFacts().filter(row=>row.links.some(link=>link.supplierId===id&&link.reserved<=cutoff));
 function paint(){
  root.dataset.scpTab=tab;
  let rows=(tab==='capabilities'?capabilities:projectsForSupplier).filter(row=>(tab==='capabilities'?[row.brand,row.category,row.group,row.name,row.material]:[row.project.name,row.project.model]).join(' ').includes(query));
  const total=rows.length;page=Math.min(page,Math.max(1,Math.ceil(total/DRAWER_PAGE_SIZE)));rows=rows.slice((page-1)*DRAWER_PAGE_SIZE,page*DRAWER_PAGE_SIZE);
  const validDate=value=>value&&value<=cutoff?value:'—';
  result.innerHTML=tab==='capabilities'?scpTable('<tr><th data-up-basic>供应商类型</th><th data-up-basic>品牌</th><th data-up-basic>类目</th><th data-up-basic>供货范围</th><th data-up-basic>准入日期</th><th data-up-basic>合作日期</th></tr>',rows.map(row=>`<tr><td>${row.kind==='machine'?'整机':'物料'}</td><td>${row.brand||'—'}</td><td>${row.category}${row.group?'<small>'+row.group+'</small>':''}</td><td>${esc(row.material||row.name)}</td><td>${validDate(row.admitted)}</td><td>${validDate(row.cooperation)}</td></tr>`).join('')):scpTable('<tr><th data-up-basic>产品名称</th><th data-up-basic>项目类型</th><th data-up-basic>项目经理</th><th data-up-basic>操作</th></tr>',rows.map(row=>`<tr><td>${titleProduct(row.project)}</td><td>${esc(row.project.type)}</td><td>${esc(row.project.owner)}</td><td><button type="button" class="link" data-project="${row.project.id}">查看</button></td></tr>`).join(''));
  mountListPager(root.querySelector('.scp-member-pages'),total,page,next=>{page=next;paint()});
 }
 root.oninput=event=>{if(event.target.matches('[data-scp-supplier-search]')){query=event.target.value.trim();page=1;paint()}};
 root.scpSelect=key=>{tab=key;page=1;paint();drawerQueueRefresh()};paint();
}
const scpPreviousDrawerProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector(':scope>.scp-drawer');if(!root)return scpPreviousDrawerProfile(body,title);
 const supplier=root.dataset.scpDrawer==='supplier',members=root.dataset.scpDrawer==='members',categories=root.dataset.scpDrawer==='categories';
 const tabs=categories?[]:supplier?[{key:'capabilities',label:'供应能力'},{key:'projects',label:'关联项目'}]:members?[{key:'machine',label:'整机供应商'},{key:'material',label:'物料供应商'}]:[{key:'members',label:'类目储备'}];
 return {root,entries:[...root.children].map(node=>({node,key:'shared'})),tabs,activeKey:categories?'base':supplier||members?root.dataset.scpTab:'members',onSelect:supplier||members?(key,focus)=>{root.scpSelect(key);if(focus)queueMicrotask(()=>drawerNav.querySelector(`[data-drawer-tab="${key}"]`)?.focus({preventScroll:true}))}:undefined};
};
