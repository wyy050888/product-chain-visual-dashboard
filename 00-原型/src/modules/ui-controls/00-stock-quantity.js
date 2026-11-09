// 只格式化实物库存件数；原始数值继续用于计算、排序及data属性。
function stockQuantity(value,digits=0){return Number.isFinite(value)?fmt(value,digits)+'件':'—'}
function stockQuantityMarkup(value,digits=0){
 return Number.isFinite(value)?fmt(value,digits)+'<span class="unit stock-quantity-unit">件</span>':'—';
}
