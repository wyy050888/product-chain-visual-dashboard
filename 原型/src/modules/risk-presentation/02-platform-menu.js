// 原生 select 保留取值和 change 协议；自定义菜单负责平台 Logo 与键盘操作。
function rpPlatformMenuLabel(platform){
 return (qrPlatforms.includes(platform)?rpPlatformMark(platform):'')+'<span title="'+esc(platform==='all'?'全平台':platform)+'">'+esc(platform==='all'?'全平台':platform)+'</span>';
}
function rpPlatformMenu(k){
 const value=rpCardPlatform(k),platforms=['all',...qrPlatforms],label=rpTitles[k]+'平台';
 return `<details class="rp-platform-menu" data-rp-platform-menu="${k}"><summary aria-label="${esc(label)}" aria-haspopup="menu">${rpPlatformMenuLabel(value)}<i aria-hidden="true"></i></summary><div class="rp-platform-options" role="menu" aria-label="${esc(label)}选项">${platforms.map(p=>`<button type="button" role="menuitemradio" tabindex="-1" aria-checked="${value===p}" data-rp-platform-option="${p}">${rpPlatformMenuLabel(p)}</button>`).join('')}</div><select hidden tabindex="-1" data-rp-card-platform="${k}" aria-label="${esc(label)}">${rpPlatformOptions(value,true)}</select></details>`;
}
function rpPlatformMenuClose(menu,focus=false){menu.open=false;if(focus)menu.querySelector('summary').focus({preventScroll:true})}
document.addEventListener('click',e=>{
 const menu=e.target.closest('#riskrail .rp-platform-menu');
 for(const other of document.querySelectorAll('#riskrail .rp-platform-menu[open]'))if(other!==menu)rpPlatformMenuClose(other);
 const option=e.target.closest('[data-rp-platform-option]');if(!option||!menu)return;
 const select=menu.querySelector('select'),kind=menu.dataset.rpPlatformMenu;
 const value=option.dataset.rpPlatformOption;
 pfControlSet(select,value);
 select.dispatchEvent(new Event('change',{bubbles:true}));
 const replacement=document.querySelector('#riskrail [data-rp-platform-menu="'+kind+'"]');
 if(replacement)rpPlatformMenuClose(replacement,true);
});
document.addEventListener('keydown',e=>{
 const menu=e.target.closest('#riskrail .rp-platform-menu');if(!menu)return;
 const options=[...menu.querySelectorAll('[data-rp-platform-option]')],index=options.indexOf(e.target);
 if(e.key==='Escape'&&menu.open){e.preventDefault();e.stopImmediatePropagation();rpPlatformMenuClose(menu,true);return}
 if(e.key==='Tab'){rpPlatformMenuClose(menu);return}
 if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
 e.preventDefault();menu.open=true;
 const next=e.key==='Home'?0:e.key==='End'?options.length-1:index<0?Math.max(0,options.findIndex(b=>b.getAttribute('aria-checked')==='true')):(index+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
 options[next]?.focus();
},true);
