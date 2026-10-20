// 仅管理关键产品筛选菜单的位置；选值与互斥仍复用共享多选控件。
const kpmDropdownSelector='#matrix.kpm-main :is(.kpm-tools,.kpm-zoom-filters) .pf-multi';
function kpmPositionDropdown(menu){
 const panel=menu.querySelector('.pf-multi-menu'),anchor=menu.getBoundingClientRect();
 const modal=menu.closest('dialog[open]'),bounds=modal?.getBoundingClientRect();
 let safeTop=bounds?bounds.top+8:8;
 for(const header of document.querySelectorAll('.head,.navigation-toolbar,.jumpnav')){
  const rect=header.getBoundingClientRect(),position=getComputedStyle(header).position;
  if(!modal&&['fixed','sticky'].includes(position)&&rect.top<=safeTop&&rect.bottom>0)safeTop=Math.max(safeTop,rect.bottom+8);
 }
 if(anchor.bottom<=safeTop||anchor.top>=innerHeight-8){pfMultiClose(menu);return}
 const minLeft=bounds?bounds.left+8:8,maxRight=bounds?bounds.right-8:innerWidth-8,bottom=bounds?bounds.bottom-8:innerHeight-8;
 const width=Math.min(Math.max(anchor.width,200),maxRight-minLeft),left=Math.max(minLeft,Math.min(anchor.left,maxRight-width));
 Object.assign(panel.style,{width:width+'px',minWidth:'0',maxWidth:'none',left:(left-anchor.left)+'px'});
 const desired=Math.min(270,panel.scrollHeight+2),below=Math.max(0,bottom-anchor.bottom-6),above=Math.max(0,anchor.top-safeTop-6);
 const upward=below<desired&&above>below,space=upward?above:below;
 Object.assign(panel.style,{top:upward?'auto':'calc(100% + 6px)',bottom:upward?'calc(100% + 6px)':'auto',maxHeight:Math.min(270,space)+'px'});
 menu.dataset.kpmDropDirection=upward?'up':'down';
}
let kpmDropdownFrame=0;
function kpmScheduleDropdowns(){
 if(kpmDropdownFrame||!document.querySelector(kpmDropdownSelector+'[open]'))return;
 kpmDropdownFrame=requestAnimationFrame(()=>{
  kpmDropdownFrame=0;
  for(const menu of document.querySelectorAll(kpmDropdownSelector+'[open]'))kpmPositionDropdown(menu);
 });
}
document.addEventListener('toggle',e=>{
 if(e.target.matches(kpmDropdownSelector)&&e.target.open)kpmPositionDropdown(e.target);
},true);
window.addEventListener('resize',kpmScheduleDropdowns);
document.addEventListener('scroll',kpmScheduleDropdowns,true);
// Tab 离开整个控件时收起，菜单内部移动焦点可继续多选。
document.addEventListener('focusin',e=>{
 for(const menu of document.querySelectorAll(kpmDropdownSelector+'[open]'))if(!menu.contains(e.target))pfMultiClose(menu);
});
