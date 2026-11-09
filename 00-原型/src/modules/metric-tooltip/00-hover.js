// 悬停提示共用关闭缓冲；只响应当前触发点/浮层，避免无关mouseout排入旧计时器。
function createTooltipHover(tooltip,anchor,hide,delay=250){
 const tip=typeof tooltip==='function'?tooltip:()=>tooltip,getAnchor=typeof anchor==='function'?anchor:()=>anchor;let timer=null;
 const inside=target=>target instanceof Node&&Boolean(tip()?.contains(target)||getAnchor()?.contains(target));
 const keep=()=>{clearTimeout(timer);timer=null};
 const schedule=()=>{keep();timer=setTimeout(()=>{timer=null;const panel=tip(),source=getAnchor();if(panel?.matches(':hover')||source?.matches(':hover'))return;hide()},delay)};
 document.addEventListener('pointerover',event=>{if(inside(event.target))keep()});
 document.addEventListener('pointerout',event=>{if(inside(event.target)&&!inside(event.relatedTarget))schedule()});
 document.addEventListener('focusout',event=>{if(inside(event.target)&&!inside(event.relatedTarget))schedule()});
 return {keep,reset:keep,schedule,inside};
}
