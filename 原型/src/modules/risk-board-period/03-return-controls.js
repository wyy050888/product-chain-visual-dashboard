// 周为滚动七日窗口；月以21日开放当月，不把成熟月初区间等长裁切上月。
function rpMountReturnPeriod(host,initial,onChange){
 let period={...initial};
 const icon='<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2v4m8-4v4M3 8h14"/></svg>';
 function apply(next){period=next;paint();onChange({...period})}
 function paint(){
  const monthly=period.comparisonMode==='month',reference=dashboardSyncDate(),latest=rpLatestReturnMonth(reference);
  const years=dashboardYears(0,period.year).reverse(),max=period.year===+latest.slice(0,4)?+latest.slice(5,7):period.year>+latest.slice(0,4)?0:12;
  host.innerHTML=`<div class="period-picker rp-return-period" role="group" aria-label="退货恶化对比期间"><div class="period-segment">${[['week','周对比'],['month','月对比']].map(([mode,label])=>`<button type="button" data-rp-return-mode="${mode}" aria-pressed="${period.comparisonMode===mode}">${label}</button>`).join('')}</div>${monthly?`<select data-drawer-time-year data-rp-return-year aria-label="退货对比年份">${years.filter(year=>year<=+latest.slice(0,4)).map(year=>`<option value="${year}" ${year===period.year?'selected':''}>${year} 年</option>`).join('')}</select><select data-rp-return-month aria-label="退货对比月份">${Array.from({length:max},(_,i)=>`<option value="${i+1}" ${period.value===i+1?'selected':''}>${i+1} 月</option>`).join('')}</select>`:`<button type="button" class="risk-date-trigger" data-rp-return-anchor aria-label="选择退货周对比基准日" aria-haspopup="dialog" aria-expanded="false"><span>基准日 ${period.reference}</span>${icon}</button>`}</div>`;
  host.querySelectorAll('[data-rp-return-mode]').forEach(button=>button.onclick=()=>{
   const mode=button.dataset.rpReturnMode;if(mode===period.comparisonMode)return;
   apply(rpReturnPeriod(mode,mode==='month'?rpLatestReturnMonth():dashboardSyncDate()));
  });
  const anchor=host.querySelector('[data-rp-return-anchor]');
  if(anchor)anchor.onclick=()=>{
   if(anchor.getAttribute('aria-expanded')==='true'){dateRangeActive?.close();return}
   openDateRangePicker(anchor,{start:period.reference,end:period.reference},date=>apply(rpReturnPeriod('week',date,date)),{
    id:'rp-return-date-popover',label:'选择退货周对比基准日',single:true,presets:[],min:shiftDate(riskDateMin,29),max:dashboardSyncDate
   });
  };
  host.querySelector('[data-rp-return-year]')?.addEventListener('change',event=>{
   const year=+event.target.value,limit=year===+latest.slice(0,4)?+latest.slice(5,7):12;
   apply(rpReturnPeriod('month',year+'-'+String(Math.min(period.value,limit)).padStart(2,'0')));
  });
  host.querySelector('[data-rp-return-month]')?.addEventListener('change',event=>apply(rpReturnPeriod('month',period.year+'-'+String(event.target.value).padStart(2,'0'))));
 }
 paint();
}
