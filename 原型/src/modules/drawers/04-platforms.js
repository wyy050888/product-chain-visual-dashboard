// 平台按钮复用原 select/change 与详情按钮，统一展示，不重写业务筛选。
const drawerPlatformOrder=['抖音','快手','视频号','天猫','京东','拼多多'];
// 采用各官方站点实际使用的图标，来源记录见 assets/platform-logos/sources.json。
const drawerPlatformLogos={'抖音':'douyin','快手':'kuaishou','视频号':'channels','天猫':'tmall','京东':'jd','拼多多':'pinduoduo'};
function drawerPlatformIcon(name){const icon=document.createElement('img');icon.className='platform-mark';icon.src='assets/platform-logos/'+drawerPlatformLogos[name]+'.png';icon.alt='';icon.width=16;icon.height=16;icon.decoding='async';icon.setAttribute('aria-hidden','true');icon.onerror=()=>{icon.hidden=true};return icon}
function drawerAppendPlatforms(host,buttons){
 for(const name of drawerPlatformOrder){const button=buttons.get(name);if(button)host.append(button)}
}
function drawerAllPlatformLabel(name){return /^(全部平台|全平台(?:汇总)?|全公司|全部渠道|全部)$/.test(name)?'全平台':name}
function drawerEnhancePlatforms(){
 const body=$('#dialogbody');if($('#overlay').hidden)return;
 for(const select of body.querySelectorAll('select:not([data-platform-enhanced])')){
  if(select.multiple||select.hasAttribute('data-pf-multiple'))continue;
  // 选项由业务模块定义，展示层不额外增加平台入口。
  const options=[...select.options],platforms=options.filter(o=>drawerPlatformLogos[o.textContent.trim()]);
  if(platforms.length<2)continue;
  select.dataset.platformEnhanced='true';select.hidden=true;select.tabIndex=-1;
  const host=document.createElement('div');host.className='drawer-platform-switch';
  host.setAttribute('aria-label','平台筛选');const buttons=new Map();
  const sync=()=>{for(const b of host.querySelectorAll('button')){const active=b.dataset.platformValue===select.value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))}};
  for(const option of options){
   const name=option.textContent.trim(),button=document.createElement('button');button.type='button';button.className='platform-button';button.dataset.platformValue=option.value;button.disabled=option.disabled;
   if(drawerPlatformLogos[name])button.append(drawerPlatformIcon(name));button.append(document.createTextNode(drawerAllPlatformLabel(name)));
   button.onclick=()=>{if(select.value===option.value)return;select.value=option.value;sync();select.dispatchEvent(new Event('change',{bubbles:true}))};
   if(drawerPlatformLogos[name])buttons.set(name,button);else host.append(button);
  }
  drawerAppendPlatforms(host,buttons);select.addEventListener('change',sync);sync();
  const label=select.closest('label');
  if(label&&label.children.length===1){label.classList.add('platform-source-label');label.after(host)}else select.after(host);
 }
 for(const host of body.querySelectorAll('.qr-platform-tabs:not([data-platform-enhanced]),.nt-platforms:not([data-platform-enhanced])')){
  host.dataset.platformEnhanced='true';host.classList.add('drawer-platform-switch');const buttons=new Map(),extras=[];
  for(const button of host.querySelectorAll('button')){
   const name=button.dataset.qrPlatform||button.textContent.trim();button.classList.add('platform-button');
   if(!drawerPlatformLogos[name]){const label=drawerAllPlatformLabel(name);if(label!==name)button.textContent=label;extras.push(button);continue}
   button.title=button.textContent.trim();button.replaceChildren(drawerPlatformIcon(name),document.createTextNode(name));buttons.set(name,button);
  }
  host.replaceChildren(...extras);drawerAppendPlatforms(host,buttons);
 }
}
let drawerPlatformQueued=false;
new MutationObserver(()=>{
 if(drawerPlatformQueued)return;drawerPlatformQueued=true;
 queueMicrotask(()=>{drawerPlatformQueued=false;drawerEnhancePlatforms()});
}).observe($('#dialogbody'),{childList:true,subtree:true});
