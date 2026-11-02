const DRAWER_PAGE_SIZE=20;
function listPageNumbers(page,pages){
 const visible=new Set([1,pages,...Array.from({length:5},(_,i)=>page+i-2)].filter(n=>n>=1&&n<=pages));
 const result=[];for(const n of [...visible].sort((a,b)=>a-b)){const last=result.at(-1);if(typeof last==='number'&&n-last>1)result.push(n-last===2?last+1:'…');result.push(n)}return result;
}
function listPager(total,page,size=DRAWER_PAGE_SIZE,delegate={}){
 size=LIST_PAGE_SIZES.includes(size)?size:10;
 const pages=Math.max(1,Math.ceil(total/size));page=Math.max(1,Math.min(page,pages));
 const extra=Object.entries(delegate.extra||{}).map(([key,value])=>`${key}="${esc(String(value))}"`).join(' ');
 const attrs=n=>delegate.attr?`${delegate.attr}="${esc(String(delegate.value??((delegate.prefix||'')+n)))}" ${extra} ${delegate.delta?`${delegate.delta}="${n-page}"`:''}`:'';
 const button=(n,label,disabled=false,arrow=false)=>`<button type="button" class="list-page-button ${arrow?'list-page-arrow':''} ${!arrow&&n===page?'selected':''}" data-list-page="${n}" ${attrs(n)} ${disabled?'disabled':''} ${!arrow&&n===page?'aria-current="page"':''} aria-label="${arrow?(n<page?'上一页':'下一页'):'第'+n+'页'}">${label}</button>`;
 return `<nav class="list-pagination" aria-label="列表分页" data-list-size-key="${esc(listPageKey(delegate.sizeKey||''))}" data-list-total="${total}" data-list-current="${page}" data-list-pages="${pages}" data-list-size="${size}" data-list-prefix="${esc(delegate.prefix||'')}" data-list-attr="${delegate.attr||''}" data-list-value="${esc(String(delegate.value??''))}" data-list-delta="${delegate.delta||''}" data-list-extra="${esc(JSON.stringify(delegate.extra||{}))}"><span class="list-page-total">共 ${fmt(total)} 条</span>${listSizeSelect(size)}<div class="list-page-numbers">${button(page-1,'‹',page===1,true)}${listPageNumbers(page,pages).map(n=>n==='…'?'<span class="list-page-ellipsis">…</span>':button(n,n)).join('')}${button(page+1,'›',page===pages,true)}</div><label class="list-page-jump">前往<input type="number" min="1" max="${pages}" step="1" value="${page}" aria-label="跳转页码" inputmode="numeric">页</label></nav>`;
}
function listNavigate(nav,page,onPage){
 if(nav.dataset.listNavigating)return;nav.dataset.listNavigating='true';
 try{onPage(page)}finally{delete nav.dataset.listNavigating}
}
function listJump(nav,input,onPage){
 if(nav.dataset.listNavigating)return;
 const raw=input.value.trim(),n=Number(raw),current=Number(nav.dataset.listCurrent),pages=Number(nav.dataset.listPages);
 if(!raw||!Number.isInteger(n)){input.value=current;return}
 const page=Math.max(1,Math.min(n,pages));input.value=page;if(page!==current)listNavigate(nav,page,onPage);
}
function bindListPager(host,onPage,key=host){
 const nav=host.querySelector('.list-pagination');if(!nav)return;nav.dataset.listDirect='true';nav.listSizeKey=listPageKey(key);nav.listOnPage=onPage;
 if(typeof nav.listSizeKey==='string')nav.dataset.listSizeKey=nav.listSizeKey;
 nav.onclick=e=>{const b=e.target.closest('[data-list-page]');if(b&&!b.disabled){e.stopPropagation();const n=Number(b.dataset.listPage);if(n!==Number(nav.dataset.listCurrent))listNavigate(nav,n,onPage)}};
 const input=nav.querySelector('input');input.onchange=()=>listJump(nav,input,onPage);
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();listJump(nav,input,onPage)}};
}
function mountListPager(host,total,page,onPage,key=host){host.innerHTML=listPager(total,page,listPageSize(key));bindListPager(host,onPage,key)}
// Delegated lists keep their existing page event contract; jumps dispatch once.
function listDelegatedJump(input){
 const nav=input.closest('.list-pagination');if(!nav||nav.dataset.listDirect||!nav.dataset.listAttr)return;
 listJump(nav,input,page=>listDelegatedPage(nav,page));
}
document.addEventListener('change',e=>{if(e.target.matches('.list-page-jump input'))listDelegatedJump(e.target)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.list-page-jump input')){e.preventDefault();listDelegatedJump(e.target)}});
