function nspOpenDeliveryProjects(summary=nspDeliverySummary()){
 let page=1;
 openModal('新品上线及时率 · 项目明细','<div id="nsp-delivery-table"></div><div id="nsp-delivery-pager"></div>',false);
 const render=()=>{
  const rows=summary.rows.slice((page-1)*10,page*10);
  $('#nsp-delivery-table').innerHTML=rows.length?table(['项目名称','品牌','类目','大货交付计划日期','实际完成日期','判定'],rows.map(row=>[
   esc(row.name),esc(row.brand),esc(row.category),row.tasks.map(task=>esc(task.planned)).join('<br>'),
   row.tasks.map(task=>esc(task.actual||'—')).join('<br>'),row.onTime?'按期完成':row.tasks.some(task=>!task.actual)?'未完成':'超期完成'
  ])):'<div class="empty">暂无应上线项目</div>';
  $('#nsp-delivery-pager').innerHTML=listPager(summary.planned,page,10,{attr:'data-nsp-delivery-page'});
 };
 $('#nsp-delivery-pager').onclick=e=>{const button=e.target.closest('[data-nsp-delivery-page]');if(button&&!button.disabled){page=Number(button.dataset.nspDeliveryPage);render()}};
 render();
}
