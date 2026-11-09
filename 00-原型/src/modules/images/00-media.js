// Shared image paths: all product surfaces use the same small, retina and full variants.
const productMediaIndex=new Map();
for(const [source,[id,width,height]] of Object.entries(productMediaAssets)){
 const prefix='assets/product-media/'+id,media={small:prefix+'-112.webp',retina:prefix+'-224.webp',full:prefix+'-full.webp',width,height};
 for(const key of [source,media.small,media.retina,media.full])productMediaIndex.set(key,media);
}
function productMediaInfo(source){
 const key=String(source||'').split(/[?#]/)[0].match(/(?:^|\/)(assets\/.+)$/)?.[1];
 return key?productMediaIndex.get(key):null;
}
function productMediaThumbnail(source){return productMediaInfo(source)?.small||source;}
// Normalize before identity adapters copy image fields; metric and product identity data remain unchanged.
for(const row of [...sampleSpus,...sampleProjects1,...sampleProjects2,...sampleProjects3,...sampleProjects4]){
 if(row.image)row.image=productMediaThumbnail(row.image);
}
function productMediaSizes(image){
 if(image.closest('.product-detail-image'))return '(max-width:600px)84px,96px';
 if(image.closest('.up-hero,.dp-detail-head,.pc-product,.pc-hero,.md-hero,.nt-product,.na-hero,.od-hero,.ns-detail-hero,.psw-hero,.cw-detail-top'))return '(max-width:600px)64px,72px';
 return '(max-width:600px)48px,56px';
}
function productMediaAttributes(source){
 const media=productMediaInfo(source);
 if(!media)return `src="${esc(source)}"`;
 return `src="${media.small}" srcset="${media.small} 112w, ${media.retina} 224w" sizes="(max-width:600px)48px,56px" data-product-full="${media.full}"`;
}
function productMediaDecorate(root){
 const images=[...(root.matches?.('img')?[root]:[]),...(root.querySelectorAll?.('img')||[])];
 for(const image of images){
  if(image.closest('#product-image-viewer'))continue;
  const media=productMediaInfo(image.getAttribute('src'));
  if(!media)continue;
  image.dataset.productFull=media.full;image.decoding='async';image.loading='lazy';
  if(!image.hasAttribute('width'))image.width=56;
  if(!image.hasAttribute('height'))image.height=56;
  if(image.dataset.productMedia===media.small)continue;
  image.dataset.productMedia=media.small;
  image.sizes=productMediaSizes(image);
  image.srcset=media.small+' 112w, '+media.retina+' 224w';
  if(image.getAttribute('src')!==media.small)image.src=media.small;
 }
}
