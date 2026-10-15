// 复用现有双月日历的日期网格；独立状态，日期变化不修改上层榜单筛选。
let upCalendarClose=null;
function upOpenCalendar(trigger,range,apply) {
  upCalendarClose?.(false);
  const panel=document.createElement('div');panel.id='up-date-popover';panel.className='risk-date-popover up-calendar';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','选择产品详情日期');
  const state={start:range.start,end:range.end,anchor:'',month:riskCalendarFirst(range.end),focusDate:range.start,preset:''};
  document.body.append(panel);trigger.setAttribute('aria-expanded','true');
  function close(focus=true) {
    if(upCalendarClose!==close)return;upCalendarClose=null;
    panel.remove();trigger.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outside);
    window.removeEventListener('keydown',keyboard,true);window.removeEventListener('resize',render);observer.disconnect();
    if(focus&&trigger.isConnected)trigger.focus({preventScroll:true});
  }
  function render() {
    const prior={...riskCalendar};Object.assign(riskCalendar,state);
    try { panel.innerHTML=`<div class="risk-calendar-body"><nav class="risk-calendar-presets">${riskDatePresets.map(([k,n])=>`<button type="button" data-up-preset="${k}" aria-pressed="${state.preset===k}">${n}</button>`).join('')}</nav><div class="risk-calendar-months"><div class="risk-calendar-nav"><button type="button" data-up-month="-1" aria-label="上一月" ${state.month<=riskDateMin.slice(0,7)?'disabled':''}>‹</button><button type="button" data-up-month="1" aria-label="下一月" ${riskMonthShift(state.month,riskCalendarCount()-1)>=DATA_CUTOFF.slice(0,7)?'disabled':''}>›</button></div>${riskCalendarMonth(state.month)}${riskCalendarCount()===2?riskCalendarMonth(riskMonthShift(state.month,1)):''}</div></div>`.replaceAll('data-risk-date','data-up-date'); }
    finally { Object.assign(riskCalendar,prior); }
    const r=trigger.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(innerWidth-panel.offsetWidth-8,r.right-panel.offsetWidth))+'px';
    panel.style.top=Math.max(8,Math.min(innerHeight-panel.offsetHeight-8,r.bottom+8))+'px';
  }
  function commit(start,end){close();apply(start,end)}
  panel.onclick=e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.upPreset){const [start,end]=riskPresetRange(b.dataset.upPreset);commit(start,end);return}
    if(b.dataset.upMonth){state.month=riskMonthShift(state.month,Number(b.dataset.upMonth));render();return}
    if(b.dataset.upDate){const date=b.dataset.upDate;state.focusDate=date;
      if(state.anchor){commit(...[state.anchor,date].sort());return}
      state.start=state.end=state.anchor=date;render();panel.querySelector(`[data-up-date="${date}"]:not(:disabled)`)?.focus();
    }
  };
  function outside(e){if(!panel.contains(e.target)&&!trigger.contains(e.target))close(false)}
  function keyboard(e) {
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return}
    if(!panel.contains(e.target))return;
    const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7},date=e.target.dataset.upDate;
    if(date&&offsets[e.key]!==undefined){e.preventDefault();e.stopImmediatePropagation();const next=shiftDate(date,offsets[e.key]);
      if(next<riskDateMin||next>DATA_CUTOFF)return;state.focusDate=next;
      if(next.slice(0,7)<state.month||next.slice(0,7)>riskMonthShift(state.month,riskCalendarCount()-1))state.month=riskCalendarFirst(next);
      render();panel.querySelector(`[data-up-date="${next}"]:not(:disabled)`)?.focus();
    }
    if(e.key==='Tab'){const controls=[...panel.querySelectorAll('button:not(:disabled)')].filter(n=>n.tabIndex>=0);
      if(e.shiftKey&&e.target===controls[0]){e.preventDefault();controls.at(-1).focus()}else if(!e.shiftKey&&e.target===controls.at(-1)){e.preventDefault();controls[0].focus()}
    }
  }
  const observer=new MutationObserver(()=>{if(!trigger.isConnected||$('#overlay').hidden)close(false)});
  observer.observe($('#dialogbody'),{childList:true,subtree:true});observer.observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('pointerdown',outside);window.addEventListener('keydown',keyboard,true);window.addEventListener('resize',render);
  upCalendarClose=close;
  render();(panel.querySelector('[tabindex="0"]:not(:disabled)')||panel.querySelector('button')).focus();
}
