// 页长按列表保存；有 ID 的容器可重建，无 ID 的详情容器随抽屉快照保留。
const listPageSizes=new Map(),listAnonymousPageSizes=new WeakMap(),LIST_PAGE_SIZES=[10,20,50];
const listPageReuseHandlers=new Map();let listPageContext=null;
function listPageKey(key){
 const name=typeof key==='string'?key:key?.id||key||'';
 if(!name||typeof name!=='string'||!listPageContext)return name;
 const {scope,onPage}=listPageContext,scoped=scope+':'+name;
 listPageReuseHandlers.set(scoped,page=>onPage(page,name));return scoped;
}
function listWithPageScope(scope,onPage,render){
 const previous=listPageContext;listPageContext={scope,onPage};
 try{return render()}finally{listPageContext=previous}
}
function listPageSize(key,fallback=20){
 const initial=LIST_PAGE_SIZES.includes(fallback)?fallback:10;
 const name=listPageKey(key),store=typeof name==='object'?listAnonymousPageSizes:listPageSizes;
 return store.get(name)||initial;
}
function listSizeSelect(size){
 return '<select class="list-page-size" aria-label="每页条数">'+LIST_PAGE_SIZES.map(n=>'<option value="'+n+'" '+(n===size?'selected':'')+'>'+n+'条/页</option>').join('')+'</select>';
}
function listDelegatedPage(nav,page){
 const button=document.createElement('button');button.type='button';button.hidden=true;
 button.setAttribute(nav.dataset.listAttr,nav.dataset.listValue||((nav.dataset.listPrefix||'')+page));
 if(nav.dataset.listDelta)button.setAttribute(nav.dataset.listDelta,page-Number(nav.dataset.listCurrent));
 for(const [key,value] of Object.entries(JSON.parse(nav.dataset.listExtra||'{}')))button.setAttribute(key,value);
 nav.append(button);button.click();button.remove();
}
// 捕获阶段消费页长事件，避免它被业务筛选器的 change 委托误认为筛选条件。
document.addEventListener('change',e=>{
 const select=e.target;if(!select.matches('.list-pagination select.list-page-size'))return;
 e.stopPropagation();const nav=select.closest('.list-pagination'),size=Number(select.value);
 if(!LIST_PAGE_SIZES.includes(size))return;
 const key=nav.listSizeKey||nav.dataset.listSizeKey;if(!key)return;
 (typeof key==='object'?listAnonymousPageSizes:listPageSizes).set(key,size);
 const onPage=nav.listOnPage||listPageReuseHandlers.get(key);
 if(onPage)listNavigate(nav,1,onPage);
 else if(nav.dataset.listAttr)listNavigate(nav,1,page=>listDelegatedPage(nav,page));
},true);
