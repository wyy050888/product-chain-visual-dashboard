// 筛选只作用于总看板生命周期展示；公司事实与部门复用保持各自口径。
let ltChainFilter='all';
function ltCanFilterChains(){return ltDashboardActive()&&document.getElementById('lifecycle')?.parentElement.matches('main.page')}
function ltChainScope(){return ltCanFilterChains()?ltChainFilter:'all'}
function ltChainMatches(index){const chain=ltChainScope();return chain==='all'||Number(chain)===index}
function ltSelectedTotals(stage,p=periodFor('lifecycle')){
 const chain=ltChainScope();return chain==='all'?ltDashboardTotals(stage,p):ltDashboardRows(stage,p)[Number(chain)];
}
function ltRenderChainTabs(){
 const section=$('#lifecycle');if(!section)return;
 let tabs=section.querySelector('#lt-chain-tabs');
 if(!tabs){
  const anchor=section.querySelector('#lt-open-targets');if(!anchor)return;
  tabs=document.createElement('div');tabs.id='lt-chain-tabs';tabs.className='tabs lt-chain-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','生命周期链群筛选');
  tabs.innerHTML=[['all','全部'],...chains.map((name,index)=>[String(index),name])].map(([key,name])=>'<button type="button" role="tab" data-lt-chain="'+key+'">'+esc(name)+'</button>').join('');anchor.before(tabs);
 }
 tabs.hidden=!ltCanFilterChains();
 for(const button of tabs.querySelectorAll('[data-lt-chain]')){const active=button.dataset.ltChain===ltChainScope();button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1}
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#lifecycle #lt-chain-tabs [data-lt-chain]');if(!button||!ltCanFilterChains())return;
 const key=button.dataset.ltChain;if(!['all',...chains.map((_,i)=>String(i))].includes(key)||key===ltChainFilter)return;
 ltChainFilter=key;renderLife();document.querySelector('#lt-chain-tabs [data-lt-chain="'+key+'"]').focus({preventScroll:true});
});
document.addEventListener('keydown',event=>{
 const button=event.target.closest('#lifecycle #lt-chain-tabs [data-lt-chain]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const items=[...button.parentElement.querySelectorAll('[data-lt-chain]')],index=items.indexOf(button),next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowRight'?1:-1)+items.length)%items.length;
 event.preventDefault();items[next].click();items[next].focus({preventScroll:true});
});
