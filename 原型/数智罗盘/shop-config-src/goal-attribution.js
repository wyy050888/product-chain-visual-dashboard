// 与随附目标管理共用目标存储；产品和链接全部历史归属分别去重汇总，保留多人多品牌。
const ShopAttribution=(()=>{
 const key='goal-prototype-targets-v1',fields=['brand','region','strategy','promotion'];
 const channel=new BroadcastChannel('compass-shop-targets');let listeners=new Set();
 const unique=values=>[...new Set(values.filter(Boolean).map(String))];
 function read(date){
  let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'null')||{}}catch(_){return {error:'目标数据读取失败，请刷新后重试',rows:new Map()}}
  const rows=new Map();
  for(const kind of ['product','link']){
   const records={...shopGoalSeed[kind],...(saved[kind]||{})};
   for(const value of Object.values(records)){
    if(!value)continue;
    const master=shopGoalSeed.shops.find(shop=>shop.shopId===value.shopId);if(!master)continue;
    const identity=master.channel+'|'+master.shopId;
    const row=rows.get(identity)||Object.fromEntries(fields.map(field=>[field,[]]));
    for(const field of fields){const id=value[field+'Id'],person=['strategy','promotion'].includes(field)?shopGoalSeed.people.find(p=>p.id===id||p.id===value[field]):null;row[field].push(person?.name||value[field]||'')}
    rows.set(identity,row);
   }
  }
  for(const row of rows.values())for(const field of fields)row[field]=unique(row[field]);
  return {rows,period:'全部历史',revision:saved.revision||0};
 }
 function notify(){for(const fn of listeners)fn()}
 channel.onmessage=event=>{
  if(event.data?.type!=='targets'||!event.data.state?.product||!event.data.state?.link)return;
  try{const current=JSON.parse(localStorage.getItem(key)||'null');if((event.data.state?.revision||0)>=(current?.revision||0)){localStorage.setItem(key,JSON.stringify(event.data.state));notify()}}catch(_){notify()}
 };
 channel.postMessage({type:'request'});
 window.addEventListener('storage',e=>{if(e.key===key)notify()});window.addEventListener('focus',notify);
 return {read,subscribe(fn){listeners.add(fn)}};
})();
