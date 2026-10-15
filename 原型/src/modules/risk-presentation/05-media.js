// 图片直接在背景蒙版上放大；关闭只退出图片，不影响业务抽屉栈。
const rpImageViewer=document.createElement('dialog');
rpImageViewer.id='product-image-viewer';rpImageViewer.setAttribute('aria-label','放大产品图片');
rpImageViewer.innerHTML='<button type="button" class="rp-image-close" aria-label="关闭图片">×</button><div class="rp-image-canvas"><img alt=""><p class="rp-image-error" hidden>图片加载失败</p></div>';
document.body.append(rpImageViewer);
const rpImageSelector='img.risk-thumb,.product-detail-image img,.dp-detail-head img,.pc-hero img,.md-hero img,.nt-product img';
let rpImageOrigin=null,rpImageScale=1;
function rpImageClose(){if(!rpImageViewer.open)return;rpImageViewer.close();rpImageOrigin?.isConnected&&rpImageOrigin.focus({preventScroll:true})}
function rpImageOpen(img){if(!img.src)return;rpImageOrigin=img;rpImageScale=1;const target=rpImageViewer.querySelector('img');target.src=img.currentSrc||img.src;target.alt=img.alt||'产品图片';target.style.transform='';rpImageViewer.querySelector('.rp-image-error').hidden=true;hideMetricTooltip();rpImageViewer.showModal();rpImageViewer.querySelector('button').focus()}
rpImageViewer.querySelector('button').onclick=rpImageClose;
rpImageViewer.addEventListener('click',e=>{if(e.target===rpImageViewer||e.target.classList.contains('rp-image-canvas'))rpImageClose()});
rpImageViewer.querySelector('img').onerror=()=>{rpImageViewer.querySelector('.rp-image-error').hidden=false};
rpImageViewer.querySelector('.rp-image-canvas').addEventListener('wheel',e=>{e.preventDefault();rpImageScale=Math.max(1,Math.min(4,rpImageScale+(e.deltaY<0?.2:-.2)));rpImageViewer.querySelector('img').style.transform=`scale(${rpImageScale})`},{passive:false});
rpImageViewer.querySelector('img').ondblclick=()=>{rpImageScale=1;rpImageViewer.querySelector('img').style.transform=''};
window.addEventListener('keydown',e=>{if(rpImageViewer.open&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();rpImageClose()}},true);
document.addEventListener('click',e=>{const img=e.target.closest(rpImageSelector);if(!img||img.closest('.drawer-parent-layer,#product-image-viewer'))return;e.preventDefault();e.stopImmediatePropagation();rpImageOpen(img)},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches(rpImageSelector)){e.preventDefault();e.stopImmediatePropagation();rpImageOpen(e.target)}},true);
function rpImageDecorate(root){for(const img of root.querySelectorAll(rpImageSelector)){if(img.closest('#product-image-viewer'))continue;img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','放大图片：'+(img.alt||'产品'));img.removeAttribute('title');img.classList.add('rp-preview-image')}}
let rpMediaQueued=false;new MutationObserver(()=>{if(rpMediaQueued)return;rpMediaQueued=true;queueMicrotask(()=>{rpMediaQueued=false;rpImageDecorate(document.body)})}).observe(document.body,{childList:true,subtree:true});
rpImageDecorate(document.body);
