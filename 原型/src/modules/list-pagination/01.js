const DRAWER_PAGE_SIZE=20;
function listPageNumbers(page,pages){
 const visible=new Set([1,pages,...Array.from({length:5},(_,i)=>page+i-2)].filter(n=>n>=1&&n<=pages));
 const result=[];for(const n of [...visible].sort((a,b)=>a-b)){const last=result.at(-1);if(typeof last==='number'&&n-last>1)result.push(n-last===2?last+1:'…');result.push(n)}return result;
}
function listPager(total,page,size=DRAWER_PAGE_SIZE,delegate={}){
 const pages=Math.max(1,Math.ceil(total/size));page=Math.max(1,Math.min(page,pages));
 const extra=Object.entries(delegate.extra||{}).map(([key,value])=>`${key}="${esc(String(value))}"`).join(' ');
 const attrs=n=>delegate.attr?`${delegate.attr}="${esc(String(delegate.value??((delegate.prefix||'')+n)))}" ${extra} ${delegate.delta?`${delegate.delta}="${n-page}"`:''}`:'';
 const button=(n,label,disabled=false,arrow=false)=>`<button type="button" class="list-page-button ${arrow?'list-page-arrow':''} ${!arrow&&n===page?'selected':''}" data-list-page="${n}" ${attrs(n)} ${disabled?'disabled':''} ${!arrow&&n===page?'aria-current="page"':''} aria-label="${arrow?(n<page?'上一页':'下一页'):'第'+n+'页'}">${label}</button>`;
 return `<nav class="list-pagination" aria-label="列表分页" data-list-total="${total}" data-list-current="${page}" data-list-pages="${pages}" data-list-size="${size}" data-list-prefix="${esc(delegate.prefix||'')}" data-list-attr="${delegate.attr||''}" data-list-value="${esc(String(delegate.value??''))}" data-list-delta="${delegate.delta||''}" data-list-extra="${esc(JSON.stringify(delegate.extra||{}))}"><span class="list-page-total">共 ${fmt(total)} 条</span><span class="list-page-size">${size}条/页</span><div class="list-page-numbers">${button(page-1,'‹',page===1,true)}${listPageNumbers(page,pages).map(n=>n==='…'?'<span class="list-page-ellipsis">…</span>':button(n,n)).join('')}${button(page+1,'›',page===pages,true)}</div><label class="list-page-jump">前往<input type="number" min="1" max="${pages}" step="1" value="${page}" aria-label="跳转页码" inputmode="numeric">页</label></nav>`;
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
function bindListPager(host,onPage){
 const nav=host.querySelector('.list-pagination');if(!nav)return;nav.dataset.listDirect='true';
 nav.onclick=e=>{const b=e.target.closest('[data-list-page]');if(b&&!b.disabled){e.stopPropagation();const n=Number(b.dataset.listPage);if(n!==Number(nav.dataset.listCurrent))listNavigate(nav,n,onPage)}};
 const input=nav.querySelector('input');input.onchange=()=>listJump(nav,input,onPage);
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();listJump(nav,input,onPage)}};
}
function mountListPager(host,total,page,onPage){host.innerHTML=listPager(total,page);bindListPager(host,onPage)}
// Delegated lists keep their existing page event contract; jumps dispatch once.
function listDelegatedJump(input){
 const nav=input.closest('.list-pagination');if(!nav||nav.dataset.listDirect||!nav.dataset.listAttr)return;
 listJump(nav,input,page=>{const button=document.createElement('button');button.type='button';button.hidden=true;button.setAttribute(nav.dataset.listAttr,nav.dataset.listValue||((nav.dataset.listPrefix||'')+page));if(nav.dataset.listDelta)button.setAttribute(nav.dataset.listDelta,page-Number(nav.dataset.listCurrent));for(const [key,value] of Object.entries(JSON.parse(nav.dataset.listExtra||'{}')))button.setAttribute(key,value);nav.append(button);button.click();button.remove()});
}
document.addEventListener('change',e=>{if(e.target.matches('.list-page-jump input'))listDelegatedJump(e.target)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.list-page-jump input')){e.preventDefault();listDelegatedJump(e.target)}});
