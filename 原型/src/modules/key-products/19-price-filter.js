// 关键产品及新品共用区间、校验和即时输入交互；金额以分比较。
const kpmPriceBands=[
 {key:'all',label:'全部'}, {key:'under100',label:'100元以下',max:10000},
 {key:'100-300',label:'100–300元',min:10000,max:30000}, {key:'300-500',label:'300–500元',min:30000,max:50000},
 {key:'500-1000',label:'500–1000元',min:50000,max:100000}, {key:'over1000',label:'1000元及以上',min:100000}, {key:'custom',label:'自定义'}
];
function kpmPriceRange(filters){
 if(filters.price!=='custom')return kpmPriceBands.find(b=>b.key===filters.price)||kpmPriceBands[0];
 const min=filters.min===''?undefined:Math.round(Number(filters.min)*100),max=filters.max===''?undefined:Math.round(Number(filters.max)*100);
 const invalid=[min,max].some(v=>v!==undefined&&!Number.isFinite(v)),negative=[min,max].some(v=>v<0);
 return {min,max,inclusive:true,error:invalid?'请输入有效价格':negative?'价格不能为负数':min!==undefined&&max!==undefined&&min>max?'最低价不能高于最高价':''};
}
function kpmPriceMatch(row,filters){
 if(!filters.price||filters.price==='all')return true;
 const band=kpmPriceRange(filters),price=row.priceCents;
 return !band.error&&Number.isFinite(price)&&(band.min===undefined||price>=band.min)&&(band.max===undefined||(band.inclusive?price<=band.max:price<band.max));
}
function kpmPriceMarkup(filters,scope){
 const name={main:'关键产品',drawer:'经营明细',zoom:'放大图',new:'新品'}[scope],zoom=scope==='zoom';
 return `<div class="kpm-price-filter" data-kpm-price-host="${scope}"><button type="button" class="kpm-price-trigger" data-kpm-price-trigger aria-label="${name}价格带" aria-expanded="false"><span>价格带</span><span data-kpm-price-value>全部</span><i aria-hidden="true"></i></button><select hidden data-kpm-price-mode ${zoom?'data-kpm-zoom-filter="price"':''} aria-label="${name}价格带值">${kpmPriceBands.map(b=>`<option value="${b.key}" ${b.key===filters.price?'selected':''}>${b.label}</option>`).join('')}</select><div class="kpm-price-panel" data-kpm-price-panel role="group" aria-label="价格带选项" hidden><div class="kpm-price-presets" role="radiogroup" aria-label="默认价格带">${kpmPriceBands.filter(b=>b.key!=='custom').map(b=>`<button type="button" data-kpm-price-preset="${b.key}" role="radio" aria-checked="false">${b.label}</button>`).join('')}</div><div class="kpm-price-custom kpm-zoom-custom"><span class="kpm-price-custom-title">自定义区间</span><span class="kpm-price-inputs kpm-zoom-custom-inputs"><input type="number" min="0" step="0.01" data-kpm-price-min ${zoom?'data-kpm-zoom-min':''} aria-label="最低价格" placeholder="最低价"><span aria-hidden="true">—</span><input type="number" min="0" step="0.01" data-kpm-price-max ${zoom?'data-kpm-zoom-max':''} aria-label="最高价格" placeholder="最高价"><span>元</span></span><span class="kpm-price-error kpm-zoom-price-error" role="status"></span></div></div></div>`;
}
let kpmPricePanelId=0;
function kpmPositionPricePanel(host){
 const panel=host.querySelector('[data-kpm-price-panel]');if(panel.hidden)return;
 const anchor=host.getBoundingClientRect(),container=host.closest('dialog[open],.dialogbody'),box=container?.getBoundingClientRect();
 const top=Math.max(8,(box?.top||0)+8),bottom=Math.min(innerHeight-8,(box?.bottom||innerHeight)-8),left=Math.max(8,(box?.left||0)+8),right=Math.min(innerWidth-8,(box?.right||innerWidth)-8);
 const width=Math.min(280,right-left),below=bottom-anchor.bottom-6,above=anchor.top-top-6,up=below<310&&above>below;
 Object.assign(panel.style,{width:width+'px',left:(Math.max(left,Math.min(anchor.left,right-width))-anchor.left)+'px',top:up?'auto':'calc(100% + 6px)',bottom:up?'calc(100% + 6px)':'auto',maxHeight:Math.max(80,Math.min(360,up?above:below))+'px'});
}
function kpmMountPriceFilter(host,filters,onChange){
 const mode=host.querySelector('[data-kpm-price-mode]'),trigger=host.querySelector('[data-kpm-price-trigger]'),panel=host.querySelector('[data-kpm-price-panel]'),value=host.querySelector('[data-kpm-price-value]'),min=host.querySelector('[data-kpm-price-min]'),max=host.querySelector('[data-kpm-price-max]'),error=host.querySelector('.kpm-price-error');
 panel.id='kpm-price-panel-'+(++kpmPricePanelId);trigger.setAttribute('aria-controls',panel.id);
 function close(focus=false){panel.hidden=true;host.removeAttribute('data-price-open');trigger.setAttribute('aria-expanded','false');if(focus&&trigger.isConnected)trigger.focus({preventScroll:true})}
 function open(){
  for(const other of document.querySelectorAll('[data-kpm-price-host][data-price-open]'))if(other!==host)other.kpmPriceControl?.close();
  for(const menu of document.querySelectorAll('.pf-multi[open]'))pfMultiClose(menu);
  panel.hidden=false;host.setAttribute('data-price-open','');trigger.setAttribute('aria-expanded','true');kpmPositionPricePanel(host);
 }
 function sync(){
  mode.value=filters.price;const band=kpmPriceRange(filters),custom=filters.price==='custom',minValue=filters.min,maxValue=filters.max;
  value.textContent=!custom?(kpmPriceBands.find(b=>b.key===filters.price)?.label||'全部'):band.error||(!minValue&&!maxValue)?'自定义':minValue&&maxValue?minValue+'–'+maxValue+'元':minValue?'≥'+minValue+'元':'≤'+maxValue+'元';value.title=value.textContent;
  for(const [input,key] of [[min,'min'],[max,'max']])if(filters[key]!=='invalid'&&input.value!==filters[key])input.value=filters[key];
  error.textContent=custom?band.error||'':'';for(const input of [min,max])input.setAttribute('aria-invalid',String(Boolean(error.textContent)));
  for(const button of host.querySelectorAll('[data-kpm-price-preset]'))button.setAttribute('aria-checked',String(button.dataset.kpmPricePreset===filters.price));
  host.querySelector('.kpm-price-custom').classList.toggle('active',custom);trigger.classList.toggle('filtered',filters.price!=='all');
  if(!panel.hidden)kpmPositionPricePanel(host);
 }
 function apply(key){filters.price=key;sync();onChange()}
 trigger.onclick=()=>{if(panel.hidden)open();else close()};
 host.addEventListener('click',event=>{const button=event.target.closest('[data-kpm-price-preset]');if(!button)return;event.stopPropagation();apply(button.dataset.kpmPricePreset);close(true)});
 mode.addEventListener('change',event=>{event.stopPropagation();apply(mode.value);if(filters.price==='custom'){open();min.focus({preventScroll:true})}else close()});
 host.addEventListener('input',event=>{if(!event.target.matches('[data-kpm-price-min],[data-kpm-price-max]'))return;event.stopPropagation();filters.min=min.validity.badInput?'invalid':min.value;filters.max=max.validity.badInput?'invalid':max.value;apply('custom')});
 host.addEventListener('focusout',event=>{if(event.relatedTarget){if(!host.contains(event.relatedTarget))close();return}setTimeout(()=>{if(!host.contains(document.activeElement))close()},0)});
 trigger.onkeydown=event=>{if(!['ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();open();const buttons=host.querySelectorAll('[data-kpm-price-preset]');buttons[event.key==='ArrowDown'?0:buttons.length-1].focus()};
 panel.onkeydown=event=>{if(!event.target.matches('[data-kpm-price-preset]')||!['ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();const buttons=[...host.querySelectorAll('[data-kpm-price-preset]')],index=buttons.indexOf(event.target);buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus()};
 sync();const control={sync,open,close,reset(){Object.assign(filters,{price:'all',min:'',max:''});sync();close()}};host.kpmPriceControl=control;return control;
}
document.addEventListener('click',event=>{for(const host of document.querySelectorAll('[data-kpm-price-host][data-price-open]'))if(!host.contains(event.target))host.kpmPriceControl?.close()});
window.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const host=document.querySelector('[data-kpm-price-host][data-price-open]');if(!host)return;host.kpmPriceControl?.close(true);event.preventDefault();event.stopImmediatePropagation()},true);
function kpmRepositionPricePanels(){for(const host of document.querySelectorAll('[data-kpm-price-host][data-price-open]'))kpmPositionPricePanel(host)}
window.addEventListener('resize',kpmRepositionPricePanels);document.addEventListener('scroll',kpmRepositionPricePanels,true);
