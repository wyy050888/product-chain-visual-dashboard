// 卡片仅展示拼多多链接数量；抽屉表格提供明细浮层，取数口径保持一致。
function rpPddLinkCount(field,card=false){
 const tone=field.linkTone,label=tone==='red'?'红灯':'黄灯',count=field.sortValue;
 if(count===null)return `<span class="rp-pdd-count" aria-label="${field.unconfigured?'未配置核心链接':'考核数据缺失'}"><strong>--</strong>${card?'<span>条链接'+label+'</span>':''}</span>`;
 if(card)return `<span class="rp-pdd-count rp-pdd-count--${tone} rp-pdd-count--card" data-rp-field="${field.key}"><strong>${count}</strong><span>条链接${label}</span></span>`;
 return `<button type="button" class="rp-pdd-count rp-pdd-count--${tone}${card?' rp-pdd-count--card':''}" data-rp-pdd-shop="${esc(field.shopId)}" data-rp-pdd-tone="${tone}" data-rp-pdd-end="${esc(field.linkEnd)}" aria-label="查看${count}条${label}链接" aria-haspopup="dialog" aria-expanded="false" aria-controls="rp-pdd-links-popover"><strong>${count}</strong>${card?'<span>条链接'+label+'</span>':''}</button>`;
}
function rpPddLinkTable(shop,tone,end,detail=false){
 const rows=rpPddLinkGroups(shop,end)[tone],label=tone==='red'?'红灯':tone==='yellow'?'黄灯':'待补数据',title=detail?label+'链接明细':shop.name+' · '+label+'链接';
 return rpPddLinksTableMarkup(rows,title,end,false,!detail);
}
// 店铺与产品共用考核明细，产品范围可附所属店铺。
function rpPddLinksTableMarkup(rows,title,end,showShop=false,showRange=true){
 const headings=[...(showShop?['所属店铺']:[]),'商品链接',...['三级分类','主营链群'].flatMap(category=>['品质退款率','品质求助平台率','品质文本情感分'].map(name=>'近30天'+name+'（'+category+'）'))];
 const values=link=>['thirdRank','mainRank'].flatMap(key=>link.metrics.map(metric=>{const text=metric[key]||'--';return `<td class="${text.startsWith('处于同行后')?'rp-pdd-value-alert':''}">${esc(text)}</td>`}));
 return `<div class="rp-pdd-popover-heading"><h4>${esc(title)} <span>${rows.length}条</span></h4>${showRange?`<span>${shiftDate(end,-29)} — ${end}</span>`:''}</div><div class="rp-pdd-link-scroll"><table><colgroup>${showShop?'<col style="width:220px">':''}<col style="width:260px">${'<col>'.repeat(6)}</colgroup><thead><tr>${headings.map(name=>'<th>'+name+'</th>').join('')}</tr></thead><tbody>${rows.map(link=>`<tr data-rp-pdd-link="${esc(link.id)}"${showShop?` data-up-pdd-shop="${esc(link.shopId)}"`: ''}>${showShop?`<td><b>${esc(link.shopName)}</b><small class="up-pdd-shop-id">店铺ID：${esc(link.shopId)}</small></td>`:''}<td><div class="rp-pdd-link-product">${riskThumbnail(link.product)}<div><b>${esc(link.name)}</b><small>ID：${esc(link.id)}</small></div></div></td>${values(link).join('')}</tr>`).join('')||`<tr><td colspan="${showShop?8:7}" class="rp-pdd-links-empty">暂无链接</td></tr>`}</tbody></table></div>`;
}
// 顶层浮层不受卡片或抽屉表格的横向滚动区域裁切。
let rpPddPopover,rpPddAnchor,rpPddTimer,rpPddObserver,rpPddFocusFrame;
function rpHidePddLinks(){
 clearTimeout(rpPddTimer);cancelAnimationFrame(rpPddFocusFrame);rpPddFocusFrame=0;rpPddObserver?.disconnect();
 if(rpPddPopover?.matches(':popover-open'))rpPddPopover.hidePopover();
 rpPddAnchor?.setAttribute('aria-expanded','false');rpPddAnchor=null;
}
function rpShowPddLinks(anchor){
 clearTimeout(rpPddTimer);
 if(rpPddAnchor===anchor&&rpPddPopover?.matches(':popover-open'))return;
 const shop=withPeriod('risk',()=>sbAllShops().find(s=>String(s.id)===anchor.dataset.rpPddShop));
 if(!shop||shop.channel!=='拼多多')return;
 rpHidePddLinks();uiHideCellTooltip();
 if(!rpPddPopover){
  rpPddPopover=document.createElement('div');rpPddPopover.id='rp-pdd-links-popover';
  rpPddPopover.setAttribute('popover','manual');rpPddPopover.setAttribute('role','dialog');
  rpPddPopover.tabIndex=-1;document.body.append(rpPddPopover);
 }
 const tone=anchor.dataset.rpPddTone;
 rpPddPopover.setAttribute('aria-label',tone==='red'?'红灯链接明细':'黄灯链接明细');
 rpPddPopover.innerHTML=rpPddLinkTable(shop,tone,anchor.dataset.rpPddEnd);
 rpPddAnchor=anchor;anchor.setAttribute('aria-expanded','true');rpPddPopover.showPopover();
 rpPositionPddLinks();
 rpPddObserver||=new MutationObserver(()=>{if(rpPddAnchor&&!rpPddAnchor.isConnected)rpHidePddLinks()});
 rpPddObserver.observe(document.body,{childList:true,subtree:true});
}
function rpPositionPddLinks(){
 if(!rpPddAnchor||!rpPddPopover?.matches(':popover-open'))return;
 const rect=rpPddAnchor.getBoundingClientRect(),box=rpPddPopover.getBoundingClientRect();
 const left=Math.max(12,Math.min(rect.left+rect.width/2-box.width/2,innerWidth-box.width-12));
 const below=rect.bottom+10+box.height<=innerHeight-12;
 rpPddPopover.style.left=left+'px';rpPddPopover.style.top=Math.max(12,Math.min(innerHeight-box.height-12,below?rect.bottom+10:rect.top-box.height-10))+'px';
}
function rpPddCloseLater(){clearTimeout(rpPddTimer);rpPddTimer=setTimeout(rpHidePddLinks,180)}
document.addEventListener('pointerover',e=>{
 const anchor=e.target.closest('[data-rp-pdd-shop]');
 if(anchor)rpShowPddLinks(anchor);else if(rpPddPopover?.contains(e.target))clearTimeout(rpPddTimer);
});
document.addEventListener('pointerout',e=>{
 if(rpPddAnchor?.contains(e.relatedTarget)||rpPddPopover?.contains(e.relatedTarget))return;
 if(rpPddAnchor?.contains(e.target)||rpPddPopover?.contains(e.target))rpPddCloseLater();
});
document.addEventListener('focusin',e=>{
 const anchor=e.target.closest('[data-rp-pdd-shop]');
 if(anchor){
  // 键盘聚焦会自动滚动页面；等滚动完成再定位浮层。
  cancelAnimationFrame(rpPddFocusFrame);anchor.scrollIntoView({block:'nearest',inline:'nearest'});
  rpPddFocusFrame=requestAnimationFrame(()=>{rpPddFocusFrame=0;if(anchor.isConnected&&anchor.contains(document.activeElement))rpShowPddLinks(anchor)});
 }else if(!rpPddPopover?.contains(e.target))rpHidePddLinks();
});
document.addEventListener('focusout',e=>{
 if(rpPddAnchor?.contains(e.relatedTarget)||rpPddPopover?.contains(e.relatedTarget))return;
 if(rpPddAnchor?.contains(e.target)||rpPddPopover?.contains(e.target))rpPddCloseLater();
});
document.addEventListener('click',e=>{
 const anchor=e.target.closest('[data-rp-pdd-shop]');
 if(anchor){e.preventDefault();rpShowPddLinks(anchor)}else if(!rpPddPopover?.contains(e.target))rpHidePddLinks();
});
document.addEventListener('scroll',e=>{
 if(rpPddFocusFrame||rpPddPopover?.contains(e.target))return;
 if(rpPddAnchor?.contains(document.activeElement))rpPositionPddLinks();else rpHidePddLinks();
},true);
window.addEventListener('resize',rpHidePddLinks);
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&(rpPddFocusFrame||rpPddPopover?.matches(':popover-open'))){e.preventDefault();e.stopImmediatePropagation();rpHidePddLinks()}
},true);
