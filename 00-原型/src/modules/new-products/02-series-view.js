function nspSpuCell(product){
 const names=product.members.map(member=>member.name);
 return '<div class="prodname nsp-spu-cell" title="'+esc(names.join('\n'))+'">'+riskThumbnail(names[0])+
  '<ul class="nsp-spu-names">'+names.slice(0,3).map(name=>'<li>'+esc(name)+'</li>').join('')+
  (names.length>3?'<li class="nsp-spu-more">另有 '+(names.length-3)+' 个 SPU</li>':'')+'</ul></div>';
}

function nspGuidePriceText({guidePriceCents,guidePriceMaxCents}){
 if(!Number.isFinite(guidePriceCents))return '—';
 const low=fmt(guidePriceCents/100,2);
 return (guidePriceCents===guidePriceMaxCents?low:low+'–'+fmt(guidePriceMaxCents/100,2))+'元';
}

function nspSpuPicker(product,assessment=false){
 const attr=assessment?'data-nsp-assess-product':'data-nsp-view';
 const button='<button type="button" class="link nsp-spu-trigger" '+attr+'="'+esc(product.spuId)+'"';
 if(product.members.length===1)return button+' data-nsp-open-spu="'+esc(product.members[0].spuId)+'">查看</button>';
 const id='nsp-spu-picker-'+(assessment?'assess-':'main-')+product.seriesId;
 return button+' popovertarget="'+esc(id)+'"><span>查看</span><svg aria-hidden="true" viewBox="0 0 12 12"><path d="m3 4.5 3 3 3-3"/></svg></button>'+
  '<div class="nsp-spu-picker" id="'+esc(id)+'" popover aria-label="选择 SPU">'+product.members.map(member=>
   '<button type="button" data-nsp-open-spu="'+esc(member.spuId)+'">'+esc(member.name)+'</button>').join('')+'</div>';
}

function nspHandleSpuPicker(event,open){
 const option=event.target.closest('[data-nsp-open-spu]');
 if(option){
  const panel=option.closest('.nsp-spu-picker');
  if(panel){
   panel.hidePopover();
   panel.previousElementSibling.focus({preventScroll:true});
  }
  open(option.dataset.nspOpenSpu);
  return;
 }
 const trigger=event.target.closest('.nsp-spu-trigger[popovertarget]');
 if(trigger){
  const panel=trigger.popoverTargetElement;
  if(!panel||panel.matches(':popover-open'))return;
  const rect=trigger.getBoundingClientRect(),width=Math.min(320,window.innerWidth-24);
  panel.style.width=width+'px';
  panel.style.left=Math.max(12,Math.min(rect.right-width,window.innerWidth-width-12))+'px';
  const below=window.innerHeight-rect.bottom,above=rect.top;
  const opensBelow=below>=160||below>=above;
  panel.style.maxHeight=Math.max(40,Math.min(240,(opensBelow?below:above)-12))+'px';
  panel.style.top=opensBelow?rect.bottom+4+'px':'auto';
  panel.style.bottom=opensBelow?'auto':window.innerHeight-rect.top+4+'px';
 }
}
