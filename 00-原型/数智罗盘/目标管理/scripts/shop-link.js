// 目标变更只向店铺配置发布归属源数据，不接收反向改写目标。
(()=>{
 const key='goal-prototype-targets-v1',channel=new BroadcastChannel('compass-shop-targets');
 function publish(){try{const state=JSON.parse(localStorage.getItem(key)||'null');if(state?.product&&state?.link)channel.postMessage({type:'targets',state})}catch(_){/* 目标页仍由既有存储流程报告保存失败。 */}}
 channel.onmessage=event=>{if(event.data?.type==='request')publish()};
 window.addEventListener('compass-targets-committed',publish);window.addEventListener('focus',publish);publish();
})();
