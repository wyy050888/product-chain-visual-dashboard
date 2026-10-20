

// Use the same catalog asset wherever a concrete product is shown.
function hasProductSummary(body,name){
 const template=document.createElement('template');template.innerHTML=body;
 // Only recognize dedicated summaries; a product appearing in a related-items
 // table must not suppress the current product's own header.
 return [...template.content.querySelectorAll('[data-product-summary],.product-detail-image,.dp-detail-head,.cw-detail-top,.od-hero,.pc-hero,.md-hero,.nt-product')]
  .some(summary=>summary.textContent.includes(name));
}
const openModalWithProductImage=openModal;
openModal=function(title,body,drawer=false,sub=''){
 const name=Object.keys(productImages).find(n=>title.includes(n));
 if(name&&!String(body).includes('data-scp-drawer=')&&!hasProductSummary(body,name))body=`<div class="product-detail-image">${riskThumbnail(name)}<div><strong>${esc(name)}</strong></div></div>`+body;
 return openModalWithProductImage(title,body,drawer,sub);
};