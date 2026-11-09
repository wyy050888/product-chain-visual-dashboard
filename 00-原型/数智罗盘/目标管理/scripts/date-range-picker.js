// 单一入口的日期范围选择：草稿与已应用值分离，取消/关闭不改变筛选。
(() => {
  const app=GoalPrototype,{$}=app;
  let start='',end='',draftStart='',draftEnd='',month,onChange;
  const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const panel=()=>$('#historyDatePanel'),trigger=()=>$('#historyDateTrigger');
  function close(focus=false) {panel().hidden=true;trigger().setAttribute('aria-expanded','false');if(focus)trigger().focus();}
  function set(a,b) {start=a;end=b;$('#historyDateText').textContent=a&&b?`${a.replaceAll('-','/')} 至 ${b.replaceAll('-','/')}`:'开始日期 至 结束日期';trigger().classList.toggle('has-value',Boolean(a&&b));}
  function position() {
    const box=trigger().getBoundingClientRect(),el=panel();
    el.style.left=`${Math.max(8,Math.min(box.left,innerWidth-el.offsetWidth-8))}px`;
    el.style.top=`${box.bottom+el.offsetHeight+6<=innerHeight?box.bottom+6:Math.max(8,box.top-el.offsetHeight-6)}px`;
  }
  function calendar(offset) {
    const date=new Date(month.getFullYear(),month.getMonth()+offset,1),year=date.getFullYear(),m=date.getMonth(),first=(date.getDay()+6)%7,count=new Date(year,m+1,0).getDate();
    return `<section class="range-month"><h3>${year}年${m+1}月</h3><div class="range-days">${['一','二','三','四','五','六','日'].map(d=>`<span>${d}</span>`).join('')}${'<i></i>'.repeat(first)}${Array.from({length:count},(_,i)=>{
      const value=day(new Date(year,m,i+1)),edge=value===draftStart||value===draftEnd,within=draftStart&&draftEnd&&value>draftStart&&value<draftEnd;
      return `<button type="button" data-range-day="${value}" class="${edge?'selected':within?'in-range':''}" aria-label="${value}" aria-pressed="${edge}">${i+1}</button>`;
    }).join('')}</div></section>`;
  }
  function render() {
    panel().innerHTML=`<div class="range-heading"><button type="button" data-range-nav="-12" aria-label="上一年">«</button><button type="button" data-range-nav="-1" aria-label="上个月">‹</button><span>${draftStart?`${draftStart.replaceAll('-','/')} 至 ${draftEnd?draftEnd.replaceAll('-','/'):'结束日期'}`:'选择开始日期和结束日期'}</span><button type="button" data-range-nav="1" aria-label="下个月">›</button><button type="button" data-range-nav="12" aria-label="下一年">»</button></div><div class="range-months">${calendar(0)}${calendar(1)}</div><footer><button type="button" class="text-link" data-range-clear>清空</button><button type="button" class="btn" data-range-cancel>取消</button><button type="button" class="btn primary" data-range-confirm ${draftEnd?'':'disabled'}>确定</button></footer>`;
    position();
  }
  function init(callback) {
    onChange=callback;
    trigger().addEventListener('click',()=>{
      if(!panel().hidden){close();return;}
      app.historyPeriod?.close();
      app.periodPicker.close();
      draftStart=start;draftEnd=end;const date=new Date(`${start||app.clock.today()}T00:00:00`);month=new Date(date.getFullYear(),date.getMonth(),1);
      panel().hidden=false;trigger().setAttribute('aria-expanded','true');render();
      (panel().querySelector('.selected') || panel().querySelector('[data-range-day]')).focus({preventScroll:true});
    });
    panel().addEventListener('click',event=>{
      const date=event.target.closest('[data-range-day]'),nav=event.target.closest('[data-range-nav]');
      if(date){const value=date.dataset.rangeDay;if(!draftStart||draftEnd){draftStart=value;draftEnd='';}else{[draftStart,draftEnd]=[draftStart,value].sort();}render();panel().querySelector(`[data-range-day="${value}"]`)?.focus({preventScroll:true});}
      if(nav){month=new Date(month.getFullYear(),month.getMonth()+Number(nav.dataset.rangeNav),1);render();panel().querySelector(`[data-range-nav="${nav.dataset.rangeNav}"]`).focus({preventScroll:true});}
      if(event.target.closest('[data-range-confirm]')&&draftEnd){set(draftStart,draftEnd);close(true);onChange(start,end);}
      if(event.target.closest('[data-range-clear]')){set('','');close(true);onChange('','');}
      if(event.target.closest('[data-range-cancel]'))close(true);
    });
    document.addEventListener('pointerdown',event=>{if(!panel().hidden&&!panel().contains(event.target)&&!trigger().contains(event.target))close();});
    trigger().addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(panel().hidden)trigger().click();}});
    panel().addEventListener('keydown',event=>{
      const value=event.target.dataset.rangeDay;if(!value)return;
      const date=new Date(`${value}T00:00:00`),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
      if(delta!==undefined)date.setDate(date.getDate()+delta);
      else if(event.key==='Home'||event.key==='End'){const weekday=(date.getDay()+6)%7;date.setDate(date.getDate()+(event.key==='Home'?-weekday:6-weekday));}
      else if(event.key==='PageUp'||event.key==='PageDown'){const d=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+(event.key==='PageUp'?-1:1));date.setDate(Math.min(d,new Date(date.getFullYear(),date.getMonth()+1,0).getDate()));}
      else return;
      event.preventDefault();const key=day(date);let target=panel().querySelector(`[data-range-day="${key}"]`);
      if(!target||!target.getClientRects().length){month=new Date(date.getFullYear(),date.getMonth(),1);render();target=panel().querySelector(`[data-range-day="${key}"]`);}
      target?.focus({preventScroll:true});
    });
    document.addEventListener('focusin',event=>{if(!panel().hidden&&!panel().contains(event.target)&&!trigger().contains(event.target))close();});
    document.addEventListener('keydown',event=>{if(!panel().hidden&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}},true);
    window.addEventListener('resize',()=>{if(!panel().hidden)position();});
    $('#historyScroll').addEventListener('scroll',()=>{if(!panel().hidden)position();});
  }
  app.historyDateRange={init,set,close};
})();
