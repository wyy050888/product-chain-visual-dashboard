// 批次内明细筛选，复用填报字段名称；店铺/链接可检索变更前后的身份。
(() => {
  const app=GoalPrototype,{$,escape:esc}=app;
  const defaults=()=>({month:'',product:'',shop:'',linkId:'',type:''});
  let monthScope;
  function syncMonth() { const select=$('[data-detail-filter="month"]'); if(select)$('#historyDetailMonthTrigger').textContent=select.selectedOptions[0]?.textContent || '全部'; }
  function configure(op) {
    monthScope={year:op.year,allowed:[...new Set(op.months || [])].map(Number)};
    const {filterLabels:labels,searches}=app.entryView;
    const search=field=>`<label><span>${esc(labels[field])}</span><input class="input" type="search" data-detail-filter="${field}" placeholder="${esc(searches[field])}" autocomplete="off"></label>`;
    $('#historyDetailFilters').innerHTML=`<label><span>${esc(app.config.labels.month)}</span><select class="select" data-detail-filter="month"><option value="">全部</option>${[...new Set(op.months || [])].sort((a,b)=>a-b).map(m=>`<option value="${m}">${op.year}/${String(m).padStart(2,'0')}</option>`).join('')}</select></label>${search('product')}${search('shop')}${op.kind==='link'?search('linkId'):''}<label><span>变更类型</span><select class="select" data-detail-filter="type"><option value="">全部</option><option value="added">新增</option><option value="updated">修改</option><option value="removed">删除</option></select></label><div class="history-detail-reset"><button class="btn" id="historyDetailReset">重置</button></div>`;
    const select=$('[data-detail-filter="month"]'),button=document.createElement('button');
    select.hidden=true;button.type='button';button.id='historyDetailMonthTrigger';button.className='select calendar-trigger';button.setAttribute('aria-label','筛选月份');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','periodPicker');select.after(button);syncMonth();
  }
  function matches({group,detail},filters) {
    const contains=(values,query)=>!query.trim()||values.some(value=>String(value || '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    if(filters.month&&Number(filters.month)!==group.monthNumber||filters.type&&filters.type!==detail.type)return false;
    if(!contains([group.product,group.productCode],filters.product))return false;
    return [detail.before,detail.after].filter(Boolean).some(row=>contains([row.shop,row.shopId,row.shopCode],filters.shop)&&contains([row.linkName,row.linkId],filters.linkId));
  }
  function init(onChange) {
    const root=$('#historyDetailFilters');
    const change=event=>{
      if(event.isComposing||!event.target.matches('[data-detail-filter]'))return;
      if(event.type==='input'&&event.target.tagName==='SELECT'||event.type==='change'&&event.target.tagName==='INPUT')return;
      const values=defaults();root.querySelectorAll('[data-detail-filter]').forEach(el=>values[el.dataset.detailFilter]=el.value);syncMonth();onChange(values);
    };
    const openMonth=()=>{const select=$('[data-detail-filter="month"]');app.periodPicker.openMonth($('#historyDetailMonthTrigger'),{...monthScope,month:select.value,allowAll:true,commit:(_,month)=>{select.value=String(month);select.dispatchEvent(new Event('change',{bubbles:true}));}});};
    root.addEventListener('click',event=>{if(event.target.closest('#historyDetailMonthTrigger'))openMonth();});
    root.addEventListener('keydown',event=>{if(event.target.id==='historyDetailMonthTrigger'&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();openMonth();}});
    ['input','change','compositionend'].forEach(type=>root.addEventListener(type,change));
    root.addEventListener('click',event=>{if(event.target.closest('#historyDetailReset')){root.querySelectorAll('[data-detail-filter]').forEach(el=>el.value='');syncMonth();onChange(defaults());}});
  }
  app.historyDetailFilters={defaults,configure,matches,init};
})();
