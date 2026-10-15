// Generic read-only drawer tables may not have a business paging controller.const drawerTablePages=new WeakMap();
function paginateDrawerTables(){
 const body=$('#dialogbody');if(!$('#dialog').classList.contains('drawer'))return;
 for(const table of body.querySelectorAll('table')){
  if(table.closest('form')||table.querySelector('input,select,textarea'))continue;
  const rows=[...table.tBodies].flatMap(b=>[...b.rows]);
  if(rows.length<=DRAWER_PAGE_SIZE)continue;
  const previous=drawerTablePages.get(table);
  if(previous&&previous.rows.length===rows.length&&rows.every((row,i)=>row===previous.rows[i]))continue;
  previous?.pager.remove();
  const pager=document.createElement('div');pager.className='drawer-table-pagination';table.after(pager);
  const state={rows,pager,page:1};drawerTablePages.set(table,state);
  const render=()=>{
   state.page=Math.max(1,Math.min(state.page,Math.ceil(rows.length/DRAWER_PAGE_SIZE)));
   const start=(state.page-1)*DRAWER_PAGE_SIZE;
   rows.forEach((row,i)=>row.classList.toggle('drawer-list-hidden',i<start||i>=start+DRAWER_PAGE_SIZE));
   mountListPager(pager,rows.length,state.page,page=>{state.page=page;render()});
  };render();
 }
}
let drawerTablesQueued=false;
new MutationObserver(()=>{if(drawerTablesQueued)return;drawerTablesQueued=true;queueMicrotask(()=>{drawerTablesQueued=false;paginateDrawerTables()})}).observe($('#dialogbody'),{childList:true,subtree:true});
