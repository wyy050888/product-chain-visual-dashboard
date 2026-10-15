

// Reuse the date-range and platform controls for established products.
const matrixTrendPlatforms=[
 {name:'天猫',color:'#7167ed'},{name:'京东',color:'#35a9d4'},
 {name:'抖音',color:'#f0a346'},{name:'快手',color:'#4eb69c'},
 {name:'视频号',color:'#cf73ad'},{name:'拼多多',color:'#e77369'},
 {name:'跨境',color:'#7c92c3'},{name:'线下',color:'#92a54c'}
];
const renderMatrixBeforeTrends=renderMatrix;
renderMatrix=function(){renderMatrixBeforeTrends();$$('#matrixtable [data-product^="old,"]').forEach(button=>{
 const cell=button.closest('td');if(!cell||cell.querySelector('[data-matrix-trend]'))return;cell.classList.add('new-product-actions');
 button.insertAdjacentHTML('afterend',`<button type="button" class="link new-trend-button" data-matrix-trend="${button.dataset.product.split(',')[1]}">趋势图</button>`);
})};
document.addEventListener('click',e=>{const button=e.target.closest('[data-matrix-trend]');if(button)openNewProductTrends(button.dataset.matrixTrend,false,'matrix')});