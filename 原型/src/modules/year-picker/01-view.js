// 年份只来自原控件的选项；四位业务编码不会被当成年份。
function uiYearOptions(select){
 if(!select.matches('select')||select.multiple)return null;
 const options=[...select.options];if(!options.length)return null;
 const rows=options.map(option=>{const text=option.textContent.trim(),match=text.match(/^(\d{4})\s*年?$/);return {option,year:match?Number(match[1]):null}});
 if(!rows.some(row=>row.year)||rows.some(row=>!row.year&&!/^(全部(年份|年度)?|请选择(年份|年度)?|—)$/.test(row.option.textContent.trim())))return null;
 return rows;
}
function uiYearLabel(select){return select.getAttribute('aria-label')||'选择年份'}
// 在任何挂载写入前一次性读取样式，避免逐属性读取 live computedStyle 强制布局。
const uiYearStyleProperties=['color','backgroundColor','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderStyle','borderColor','borderRadius','fontFamily','fontSize','fontWeight','textAlign'];
function uiYearReadStyle(select){
 const computed=getComputedStyle(select);if(computed.display==='none')return null;
 return Object.fromEntries(['width','height','flex',...uiYearStyleProperties].map(key=>[key,computed[key]]));
}
function uiYearPaint(control){
 control.panelHeight=0;
 const {select,panel,decade}=control,rows=uiYearOptions(select)||[],years=rows.filter(row=>row.year),current=rows.find(row=>row.option.selected)?.year;
 const minimum=Math.min(...years.map(row=>row.year)),maximum=Math.max(...years.map(row=>row.year));
 panel.replaceChildren();
 const head=document.createElement('div');head.className='ui-year-heading';
 for(const step of [-1,0,1]){
  const node=document.createElement(step?'button':'span');
  if(step){node.type='button';node.dataset.uiYearStep=step;node.textContent=step<0?'«':'»';node.setAttribute('aria-label',step<0?'上十年':'下十年');node.disabled=step<0?decade<=Math.floor(minimum/10)*10:decade+9>=maximum}
  else node.textContent=decade+' 年 - '+Math.min(decade+9,9999)+' 年';head.append(node);
 }
 const grid=document.createElement('div');grid.className='ui-year-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label','年份');
 for(let year=decade;year<=Math.min(decade+9,9999);year++){
  const row=rows.find(row=>row.year===year),button=document.createElement('button'),value=document.createElement('span');
  button.type='button';button.dataset.uiYearValue=year;button.setAttribute('aria-label',year+'年');button.setAttribute('aria-pressed',String(current===year));
  button.disabled=!row||row.option.disabled||!!row.option.closest('optgroup')?.disabled;button.tabIndex=current===year&&!button.disabled?0:-1;
  value.textContent=year;button.append(value);grid.append(button);
 }
 panel.append(head,grid);
 const clear=rows.find(row=>!row.year);
 if(clear){const button=document.createElement('button');button.type='button';button.className='ui-year-clear';button.dataset.uiYearClear='';button.textContent=clear.option.textContent;button.disabled=clear.option.disabled;panel.append(button)}
}
function uiYearPlace(control){
 const box=control.button.getBoundingClientRect(),panel=control.panel,width=Math.min(312,innerWidth-16)+'px',maxHeight=Math.max(120,innerHeight-16)+'px';
 for(const [key,value] of [['width',width],['maxHeight',maxHeight]])if(panel.style[key]!==value){panel.style[key]=value;control.panelHeight=0}
 const height=control.panelHeight||(control.panelHeight=panel.getBoundingClientRect().height),size=parseFloat(width);
 const left=Math.max(8,Math.min(box.right-size,innerWidth-size-8))+'px',top=Math.max(8,box.bottom+height+6<=innerHeight-8?box.bottom+6:box.top-height-6)+'px';
 if(panel.style.left!==left)panel.style.left=left;if(panel.style.top!==top)panel.style.top=top;
}
