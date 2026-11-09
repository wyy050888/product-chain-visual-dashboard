// 单行筛选可横向滚动；多选面板放在顶层，避免被滚动区域裁切。
function ppBindFilterMenus(){
 const host=$('#pp-filters');host.ppMenuEvents?.abort();
 const events=new AbortController();host.ppMenuEvents=events;
 const menus=[...host.querySelectorAll('.pf-multi')],positions=new Map(),closeAll=()=>menus.forEach(menu=>{menu.open=false});
 for(const menu of menus){
  const panel=menu.querySelector('.pf-multi-menu'),trigger=menu.querySelector('summary');
  panel.setAttribute('popover','manual');
  const position=()=>{
   const rect=trigger.getBoundingClientRect(),area=host.getBoundingClientRect();
   if(rect.right<=Math.max(0,area.left)||rect.left>=Math.min(innerWidth,area.right)||rect.bottom<=0||rect.top>=innerHeight){menu.open=false;return}
   panel.style.width=Math.max(220,rect.width)+'px';const bounds=panel.getBoundingClientRect();
   panel.style.left=Math.max(8,Math.min(rect.left,innerWidth-bounds.width-8))+'px';
   panel.style.top=Math.max(8,rect.bottom+6+bounds.height>innerHeight?rect.top-bounds.height-6:rect.bottom+6)+'px';
  };
  positions.set(menu,position);
  menu.addEventListener('toggle',()=>{
   if(!menu.open){if(panel.matches(':popover-open'))panel.hidePopover();return}
   panel.showPopover();position();
  },{signal:events.signal});
 }
 document.addEventListener('scroll',event=>{for(const menu of menus){const panel=menu.querySelector('.pf-multi-menu');if(menu.open&&panel.matches(':popover-open')&&!panel.contains(event.target))positions.get(menu)()}},{capture:true,signal:events.signal});
 window.addEventListener('resize',closeAll,{signal:events.signal});
}
