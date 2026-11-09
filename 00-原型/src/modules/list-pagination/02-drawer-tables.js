// Generic read-only drawer tables may not have a business paging controller.
const drawerTablePages=new WeakMap();
function paginateDrawerTables(){
 const body=$('#dialogbody');if(!$('#dialog').classList.contains('drawer'))return;
 const tables=[...body.querySelectorAll('table')],managed=new Set();
 // 业务分页已经截取数据，不能把其 50 条结果再次按通用 20 条截断。
 for(const nav of body.querySelectorAll('.list-pagination')){
  if(nav.closest('.drawer-table-pagination'))continue;
  const table=tables.findLast(table=>table.compareDocumentPosition(nav)&Node.DOCUMENT_POSITION_FOLLOWING);
  if(table)managed.add(table);
 }
 for(const table of tables){
  if(managed.has(table))continue;
  if(table.closest('form')||table.querySelector('input,select,textarea'))continue;
  const rows=[...table.tBodies].flatMap(b=>[...b.rows]);
  if(rows.length<=DRAWER_PAGE_SIZE)continue;
  const previous=drawerTablePages.get(table);
  if(previous&&previous.rows.length===rows.length&&rows.every((row,i)=>row===previous.rows[i]))continue;
  previous?.pager.remove();
  const pager=document.createElement('div');pager.className='drawer-table-pagination';table.after(pager);
  const state={rows,pager,page:1};drawerTablePages.set(table,state);
  const render=()=>{
   const size=listPageSize(pager);
   state.page=Math.max(1,Math.min(state.page,Math.ceil(rows.length/size)));
   const start=(state.page-1)*size;
   rows.forEach((row,i)=>row.classList.toggle('drawer-list-hidden',i<start||i>=start+size));
   mountListPager(pager,rows.length,state.page,page=>{state.page=page;render()});
  };render();
 }
}
let drawerTablesQueued=false;
new MutationObserver(()=>{if(drawerTablesQueued)return;drawerTablesQueued=true;queueMicrotask(()=>{drawerTablesQueued=false;paginateDrawerTables()})}).observe($('#dialogbody'),{childList:true,subtree:true});
