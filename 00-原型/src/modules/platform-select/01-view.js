// 只识别真实平台枚举，复用官方图标；不改选项值、业务分组或“全部”文案。
function uiIsPlatformSelect(select){
 const count=[...select.options].filter(option=>drawerPlatformLogos[option.textContent.trim()]).length;
 const label=[select.id,select.name,select.getAttribute('aria-label'),select.parentElement.querySelector('.unified-field-name')?.textContent].join(' ');
 return count>=2||count===1&&/平台|渠道|platform|channel/i.test(label);
}
function uiPlatformLabel(host,text){
 host.replaceChildren();
 if(drawerPlatformLogos[text])host.append(drawerPlatformIcon(text));
 const label=document.createElement('span');label.textContent=text;host.append(label);
}
function uiPlatformSyncMulti(select){
 const menu=select.closest('.pf-multi');if(!menu)return;
 for(const option of select.options){
  const text=option.textContent.trim(),box=[...menu.querySelectorAll('[data-pf-multi-option]')].find(n=>n.value===option.value);
  const label=box?.parentElement.querySelector('span');
  if(label&&drawerPlatformLogos[text]&&!label.querySelector('img'))uiPlatformLabel(label,text);
 }
 const value=menu.querySelector('.pf-multi-value'),selected=[...select.selectedOptions].filter(o=>drawerPlatformLogos[o.textContent.trim()]);
 if(value&&selected.length===1&&!value.querySelector('img'))uiPlatformLabel(value,selected[0].textContent.trim());
}
function uiPlatformPaintOptions(select,panel){
 panel.replaceChildren();
 for(const option of select.options){
  const row=document.createElement('button');row.type='button';row.className='ui-platform-option';
  row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.selected));
  row.dataset.uiPlatformValue=option.value;row.tabIndex=-1;
  row.disabled=option.disabled||!!option.closest('optgroup')?.disabled;
  uiPlatformLabel(row,option.textContent.trim());panel.append(row);
 }
}
function uiPlatformPlace(button,panel){
 const box=button.closest('.ui-platform-select').getBoundingClientRect(),width=Math.min(Math.max(box.width,160),document.documentElement.clientWidth-16);
 const height=Math.min(panel.scrollHeight,300,innerHeight-24);
 panel.style.width=width+'px';panel.style.maxHeight=height+'px';
 panel.style.left=Math.max(8,Math.min(box.left,document.documentElement.clientWidth-width-8))+'px';
 panel.style.top=Math.max(8,box.bottom+height+6<=innerHeight?box.bottom+6:box.top-height-6)+'px';
}
