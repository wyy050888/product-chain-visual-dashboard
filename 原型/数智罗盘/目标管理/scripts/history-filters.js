// 导入列表筛选：全部条件取交集，日期按本地操作日期包含首尾两天。
(() => {
  const app=GoalPrototype,{$,escape:esc}=app;
  const defaults=()=>({kind:'',cid:'',actor:'',start:'',end:'',status:'',period:''});
  const control=key=>$(`#historyFilter-${key}`);
  let dates={start:'',end:''},period='';
  function options(records) {
    app.historyPeriod.options(records);
    control('cid').innerHTML='<option value="">全部</option>'+[...new Set(records.filter(op=>op.source==='import').map(op=>op.cid).filter(Boolean))].map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
  }
  function sync(filters) {
    for(const key of ['kind','cid','actor','status']){if(control(key).value!==filters[key])control(key).value=filters[key];}
    dates={start:filters.start,end:filters.end};app.historyDateRange.set(filters.start,filters.end);
    period=filters.period;app.historyPeriod.set(period);
  }
  function matches(op,filters) {
    if(!app.historyPeriod.matches(op,filters.period))return false;
    if(['kind','cid','status'].some(key=>filters[key]&&op[key]!==filters[key]))return false;
    if(filters.actor.trim()&&!String(op.actor || '').toLocaleLowerCase().includes(filters.actor.trim().toLocaleLowerCase()))return false;
    if(!filters.start&&!filters.end)return true;
    const date=new Date(op.timestamp);
    if(Number.isNaN(date.getTime()))return false;
    const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return (!filters.start||day>=filters.start)&&(!filters.end||day<=filters.end);
  }
  function init(onChange) {
    const submit=()=>onChange({...Object.fromEntries(['kind','cid','actor','status'].map(key=>[key,control(key).value])),...dates,period});
    $('#historyFilters').addEventListener('change',event=>{if(event.target.matches('select[id^="historyFilter-"]'))submit();});
    const search=event=>{if(!event.isComposing)submit();};
    control('actor').addEventListener('input',search);control('actor').addEventListener('compositionend',search);
    app.historyDateRange.init((start,end)=>{dates={start,end};submit();});
    app.historyPeriod.init(value=>{period=value;submit();});
  }
  app.historyFilters={defaults,options,sync,matches,init};
})();
