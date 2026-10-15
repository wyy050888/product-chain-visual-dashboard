// SPU图片与项目图片独立；SPU缺图时不拿相似项目图片替代。
function riskThumbnail(name,isShop=false){
  if(isShop)return '<span class="risk-thumb risk-shop-icon" aria-label="店铺">店</span>';
  const spu=sampleSpuByName(name),src=spu?spu.image:productImages[name];
  return src?`<img class="risk-thumb" src="${src}" alt="${esc(name)}" loading="lazy" width="38" height="38">`:'<span class="risk-thumb risk-shop-icon" aria-label="产品暂无图片">品</span>';
}

// 处理公开站点的偶发图片传输失败；更换请求地址绕过失败缓存，最多重试两次。
const imageLoadRetries = new WeakMap();
document.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.getAttribute('src')) return;
  const failedSource = image.getAttribute('src');
  const url = new URL(failedSource, document.baseURI);
  if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin
      || !url.pathname.startsWith('/assets/')) return;
  url.searchParams.delete('_img_retry');
  const source = url.href;
  const previous = imageLoadRetries.get(image);
  const attempt = previous?.source === source ? previous.attempt + 1 : 1;
  if (attempt > 2) return;
  imageLoadRetries.set(image, { source, attempt });
  setTimeout(() => {
    if (!image.isConnected || image.getAttribute('src') !== failedSource
        || image.naturalWidth > 0) return;
    url.searchParams.set('_img_retry', String(attempt));
    image.src = url.href;
  }, attempt === 1 ? 300 : 1000);
}, true);
document.addEventListener('load', event => {
  if (event.target instanceof HTMLImageElement && event.target.naturalWidth > 0) {
    imageLoadRetries.delete(event.target);
  }
}, true);
