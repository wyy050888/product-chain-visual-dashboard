// 文件读取前先绘制忙碌状态；结果只来自实际校验和保存，不模拟进度。
(() => {
 const app=GoalPrototype,{$}=app;let revision=0,busy=false;
 function lock(value){busy=value;['#importChoose','#importReplace','#importFile','#importCid','#importTemplate','#importConfirm'].forEach(selector=>$(selector).disabled=value);$('#importDrop').setAttribute('aria-disabled',String(value));$('#importConfirm').textContent=value?'导入中…':'确认导入'}
 function cancel(){revision++;lock(false)}
 async function run(prepare){if(busy)return null;const current=++revision;lock(true);await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));try{const result=await prepare();return current===revision?result:null}finally{if(current===revision)lock(false)}}
 app.importFlow={run,cancel,isBusy:()=>busy};
})();
