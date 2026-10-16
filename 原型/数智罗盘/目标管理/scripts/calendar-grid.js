// 年/月/季度共用视图与键盘规则；业务模块只提供已选值和提交回调。
(() => {
  const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const range = count => Array.from({length:count}, (_, i) => i + 1);
  const current = () => { const now = new Date(); return {year:now.getFullYear(), month:now.getMonth()+1}; };
  function render({kind='month',year,selectedYear=year,values=[],multiple=false,nav='data-calendar-nav',preset='data-calendar-preset',allowed=null,allowAll=false}) {
    const start=kind==='year'?Math.floor(year/10)*10:1, count=kind==='year'?10:kind==='quarter'?4:12;
    const title=kind==='year'?`${start} 年 - ${Math.min(start+9,9999)} 年`:`${year}年`;
    const heading=`<div class="calendar-heading"><button type="button" ${nav}="-1" aria-label="${kind==='year'?'上十年':'上一年'}" ${year<=1900||allowed?'disabled':''}>«</button><span>${title}</span><button type="button" ${nav}="1" aria-label="${kind==='year'?'下十年':'下一年'}" ${year>=(kind==='year'?9990:9999)||allowed?'disabled':''}>»</button></div>`;
    const shortcuts=multiple||allowAll?`<div class="calendar-shortcut-row"><button type="button" ${preset}="all">全部${kind==='quarter'?'季度':'月份'}</button>${!allowed?`<button type="button" ${preset}="current">${kind==='quarter'?'本季度':'本月'}</button>`:''}</div>`:'';
    const options=range(count).map(index=>{
      const value=start+index-1, selected=(kind==='year'||year===selectedYear)&&values.includes(value), unavailable=allowed&&!allowed.includes(value);
      const text=kind==='year'?value:kind==='quarter'?`Q${value}`:months[index-1];
      return multiple?`<label><input type="checkbox" value="${value}" aria-label="${text}" ${selected?'checked':''} ${unavailable||selected&&values.length===1?'disabled':''}><span>${text}</span></label>`
        :`<button type="button" data-calendar-value="${value}" aria-pressed="${selected}" class="${selected?'selected':''}" ${unavailable?'disabled':''}>${text}</button>`;
    }).join('');
    return `${heading}${shortcuts}<div class="calendar-grid">${options}</div>`;
  }
  function keyboard(event, root, selector='.calendar-grid button:not(:disabled),.calendar-grid input:not(:disabled)', columns=4) {
    const controls=[...root.querySelectorAll(selector)], index=controls.indexOf(event.target);
    if(index<0)return;
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
    if(delta!==undefined||['Home','End'].includes(event.key)) {
      event.preventDefault(); const next=event.key==='Home'?0:event.key==='End'?controls.length-1:Math.max(0,Math.min(controls.length-1,index+delta)); controls[next]?.focus();
    }
    if(event.key==='Enter'&&event.target.type==='checkbox'){event.preventDefault();event.target.click();}
  }
  function bindMulti(panel,{get,change,nav='data-calendar-nav',preset='data-calendar-preset'}) {
    const sync=()=>{const state=get();panel.dataset.kind=state.kind;panel.innerHTML=render({...state,multiple:true,nav,preset});};
    panel.addEventListener('change',event=>{
      const value=event.target.value, values=[...panel.querySelectorAll('input:checked')].map(el=>Number(el.value));
      if(values.length)change({...get(),values});sync();panel.querySelector(`input[value="${value}"]:not(:disabled)`)?.focus();
    });
    panel.addEventListener('click',event=>{
      const navigation=event.target.closest(`[${nav}]`), shortcut=event.target.closest(`[${preset}]`), state=get();
      if(!navigation&&!shortcut)return;
      if(navigation)state.year=Math.max(1900,Math.min(9999,state.year+Number(navigation.getAttribute(nav))));
      if(shortcut){const now=current();state.values=shortcut.getAttribute(preset)==='all'?range(state.kind==='quarter'?4:12):[state.kind==='quarter'?Math.ceil(now.month/3):now.month];if(shortcut.getAttribute(preset)==='current')state.year=now.year;}
      change(state);sync();
      const attr=navigation?nav:preset, value=(navigation||shortcut).getAttribute(attr);panel.querySelector(`[${attr}="${value}"]:not(:disabled)`)?.focus();
    });
    panel.addEventListener('keydown',event=>keyboard(event,panel));
    return {sync};
  }
  GoalPrototype.calendarGrid={render,keyboard,bindMulti,current};
})();
