// 移动现有筛选和周期节点，保留原 ID、值、事件及各榜单时间口径。
function alignRiskCardFilters(){
  for(const card of $$('#riskrail .riskcard')){
    const head=card.querySelector('.rhead'),filter=card.querySelector(':scope > .qr-card-filter');
    if(!head)continue;
    // 品质榜试版：平台、风险筛选与查看全部同组，保留原控件事件。
    if(card.querySelector('.rp-quality-columns,.rp-shop-columns')){
      if(filter){
        const actions=document.createElement('div');actions.className='rp-quality-actions';
        const more=head.querySelector('[data-risk]');
        actions.append(filter);if(more)actions.append(more);head.append(actions);
      }
      card.querySelector(':scope > .qr-card-date')?.remove();
      continue;
    }
    // 六榜使用标题行与条件行，保留原下拉节点及联动事件。
    if(card.querySelector('.rp-items')){
      const date=card.querySelector(':scope > .qr-card-date');
      if(filter||date){
        const toolbar=document.createElement('div');toolbar.className='rp-card-toolbar';
        head.after(toolbar);
        if(date){date.classList.add('risk-card-subtitle');toolbar.append(date)}
        if(filter)toolbar.append(filter);
      }
      continue;
    }
    if(filter){
      let actions=head.querySelector('.risk-card-actions');
      if(!actions){actions=document.createElement('div');actions.className='risk-card-actions';head.append(actions)}
      const more=head.querySelector('[data-risk]');
      for(const node of [...filter.children].filter(n=>n.matches('select,label:has(select)')))actions.append(node);
      if(more&&more.parentElement!==actions)actions.append(more);
      filter.remove();
    }
    const date=card.querySelector(':scope > .qr-card-date');
    if(date){date.classList.add('risk-card-subtitle');head.after(date)}
  }
}
const riskCardsRender=renderRisks;
renderRisks=function(...args){const result=riskCardsRender(...args);alignRiskCardFilters();return result};
