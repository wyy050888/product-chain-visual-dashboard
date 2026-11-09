

// Reuse the date-range and platform controls for established products.
const matrixTrendPlatforms=newTrendPlatforms;
const renderMatrixBeforeTrends=renderMatrix;
renderMatrix=function(){renderMatrixBeforeTrends();$$('#matrixtable [data-product^="old,"]').forEach(button=>{
 const cell=button.closest('td');if(!cell||cell.querySelector('[data-matrix-trend]'))return;cell.classList.add('new-product-actions');
 button.insertAdjacentHTML('afterend',`<button type="button" class="link new-trend-button" data-matrix-trend="${button.dataset.product.split(',')[1]}">趋势图</button>`);
})};
document.addEventListener('click',e=>{const button=e.target.closest('[data-matrix-trend]');if(button)openNewProductTrends(button.dataset.matrixTrend,false,'matrix')});