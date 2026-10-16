// 导入批次周期：年份与全年/自然季度精确匹配，独立于操作日期。
(() => {
  const app=GoalPrototype,{$}=app,names=['第一季度','第二季度','第三季度','第四季度'];
  let selected='',year,years=[],onChange;
  const panel=()=>$('#historyPeriodPanel'),trigger=()=>$('#historyPeriodTrigger');
  function key(op) {
    if(!Number.isInteger(Number(op.year))||!op.year)return 'unknown';
    const months=[...new Set((op.months || []).map(Number))].sort((a,b)=>a-b);
    if(months.length===12&&months.every((m,i)=>m===i+1))return `${op.year}:year`;
    if(months.length===3&&[1,4,7,10].includes(months[0])&&months.every((m,i)=>m===months[0]+i))return `${op.year}:q${Math.ceil(months[0]/3)}`;
    return 'unknown';
  }
  const label=value=>{if(!value)return '全部';if(value==='unknown')return '未识别';const [y,p]=value.split(':');return `${y}年 · ${p==='all'?'全部周期':p==='year'?'全年':names[Number(p.slice(1))-1]}`;};
  const matches=(op,value)=>!value||(value.endsWith(':all')?String(op.year)===value.split(':')[0]:key(op)===value);
  function options(records) {years=[...new Set(records.filter(op=>op.source==='import'&&Number.isInteger(Number(op.year))&&Number(op.year)>0).map(op=>Number(op.year)))].sort((a,b)=>b-a);}
  function set(value) {selected=value || '';$('#historyPeriodText').textContent=label(selected);}
  function close(focus=false) {panel().hidden=true;trigger().setAttribute('aria-expanded','false');if(focus)trigger().focus();}
  function position() {const box=trigger().getBoundingClientRect(),el=panel();el.style.left=`${Math.max(8,Math.min(box.left,innerWidth-el.offsetWidth-8))}px`;el.style.top=`${box.bottom+el.offsetHeight+6<=innerHeight?box.bottom+6:Math.max(8,box.top-el.offsetHeight-6)}px`;}
  function render() {
    const button=(value,text)=>`<button type="button" data-import-period="${value}" aria-pressed="${selected===value}" class="${selected===value?'selected':''}">${text}</button>`;
    panel().innerHTML=`<div class="import-period-years">${button('','全部')}${button('unknown','未识别')}${years.map(y=>`<button type="button" data-import-year="${y}" aria-pressed="${y===year}" class="${y===year?'selected':''}">${y}年 <span>›</span></button>`).join('')}</div><div class="import-period-options">${year?[button(`${year}:all`,'全部周期'),button(`${year}:year`,'全年'),...names.map((name,i)=>button(`${year}:q${i+1}`,`${name}（${i*3+1}—${i*3+3}月）`))].join(''):'暂无可选年份'}</div>`;position();
  }
  function init(callback) {
    onChange=callback;
    trigger().addEventListener('click',()=>{
      if(!panel().hidden){close();return;}
      app.periodPicker.close();app.historyDateRange.close();year=selected.includes(':')?Number(selected.split(':')[0]):years[0];panel().hidden=false;trigger().setAttribute('aria-expanded','true');render();
      panel().querySelector('.selected')?.focus({preventScroll:true});
    });
    panel().addEventListener('click',event=>{
      const y=event.target.closest('[data-import-year]'),value=event.target.closest('[data-import-period]');
      if(y){year=Number(y.dataset.importYear);render();panel().querySelector('.import-period-options button')?.focus({preventScroll:true});}
      if(value){set(value.dataset.importPeriod);close(true);onChange(selected);}
    });
    document.addEventListener('pointerdown',event=>{if(!panel().hidden&&!panel().contains(event.target)&&!trigger().contains(event.target))close();});
    trigger().addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(panel().hidden)trigger().click();}});
    panel().addEventListener('keydown',event=>{
      const column=event.target.closest('.import-period-years,.import-period-options');if(!column)return;
      if(event.key==='ArrowRight'&&column.classList.contains('import-period-years')) {
        event.preventDefault();if(event.target.dataset.importYear){year=Number(event.target.dataset.importYear);render();}panel().querySelector('.import-period-options button')?.focus();
      } else if(event.key==='ArrowLeft'&&column.classList.contains('import-period-options')) {
        event.preventDefault();(panel().querySelector(`[data-import-year="${year}"]`)||panel().querySelector('.import-period-years button'))?.focus();
      } else app.calendarGrid.keyboard(event,column,'button',1);
    });
    document.addEventListener('focusin',event=>{if(!panel().hidden&&!panel().contains(event.target)&&!trigger().contains(event.target))close();});
    document.addEventListener('keydown',event=>{if(!panel().hidden&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}},true);
    window.addEventListener('resize',()=>{if(!panel().hidden)position();});
    $('#historyScroll').addEventListener('scroll',()=>{if(!panel().hidden)position();});
  }
  app.historyPeriod={key,label,matches,options,set,close,init};
})();
