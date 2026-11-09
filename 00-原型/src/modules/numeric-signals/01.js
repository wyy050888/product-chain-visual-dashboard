// 仅负责数值呈现：调用方继续提供原判灯结果，不在这里计算阈值。
function numberSignalClass(tone,allTones=false){
 const color=({red:'red','rp-quality-red':'red',orange:'yellow',yellow:'yellow','rp-quality-yellow':'yellow'})[tone]||(allTones&&['green','rp-quality-green'].includes(tone)?'green':'');
 return color?'number-signal number-signal--'+color:'';
}
function numberSignal(value,tone,options=false){
 // 兼容原纯文字布尔参数；同组判灯要求完整标签时显式开启全部灯色。
 const settings=typeof options==='boolean'?{plain:options}:options||{};
 const text=String(value??'—'),classes=numberSignalClass(tone,settings.allTones);
 // 缺失、持平及文字状态不套数值标签。
 return !settings.plain&&classes&&/\d/.test(text)?'<span class="'+classes+' number-signal-text">'+esc(text)+'</span>':esc(text);
}

// 总退/已收退主值、呆滞及罚款冻结字段仅保留文字色；偏差另由辅助行呈现。
function numberSignalMain(field){
 const plain=field.noNumericSignal||['return','returns','returnRate','returned','received','receivedRate','fine','frozen','fineAmount','frozenAmount','fineCount','frozenCount','sanctions'].includes(field.key)||/^stale/.test(field.key||'');
 return numberSignal(field.value,field.tone,plain);
}
