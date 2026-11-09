// 商品身份独立；经用户允许，图片可使用同品牌同品类示意素材。缺图仍保留占位。
for(const name of Object.keys(productImages))productImages[name]=productMediaThumbnail(productImages[name]);
function riskThumbnail(name,isShop=false){
  if(isShop)return `<img class="risk-thumb risk-shop-avatar" src="${esc(shopAvatarSource(name))}" alt="${esc(name)}店铺头像" loading="lazy" decoding="async" width="56" height="56">`;
  const spu=sampleSpuByName(name),src=spu?spu.image:productImages[name];
  return src?`<img class="risk-thumb" ${productMediaAttributes(src)} alt="${esc(name)}" loading="lazy" decoding="async" width="56" height="56">`:'<span class="risk-thumb risk-shop-icon" aria-label="产品暂无图片">品</span>';
}

// 处理公开站点的偶发图片传输失败；更换请求地址绕过失败缓存，最多重试两次。
const imageLoadRetries = new WeakMap();
document.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.getAttribute('src')) return;
  const failedSource = image.currentSrc || image.src;
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
    if (!image.isConnected || (image.currentSrc || image.src) !== failedSource
        || image.naturalWidth > 0) return;
    url.searchParams.set('_img_retry', String(attempt));
    image.removeAttribute('srcset');
    image.src = url.href;
  }, attempt === 1 ? 300 : 1000);
}, true);
document.addEventListener('load', event => {
  if (event.target instanceof HTMLImageElement && event.target.naturalWidth > 0) {
    imageLoadRetries.delete(event.target);
  }
}, true);
