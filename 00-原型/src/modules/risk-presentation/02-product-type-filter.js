// 产品违规/退货恶化各自保存新老品选择；缺失标记只在全部中显示。
const rpCardProductTypes={0:'all',6:'all'};
const rpReturnTypeChoices=[{value:'all',label:'全部'},{value:'new',label:'新品'},{value:'old',label:'老品'}];
function rpCardProductFilters(kind){
 return {attribute:rpCardSeasons[kind]||'all',productType:rpCardProductTypes[kind]||'all'};
}
function rpReturnProductTypeControl(kind){
 if(!Object.hasOwn(rpCardProductTypes,kind))return '';
 // 统计完整入榜记录，保留当前平台/季品，忽略新老品自身选择，与查看全部口径一致。
 const rows=rpRowsForPlatform(kind,rpCardPlatform(kind)),filters=rpCardProductFilters(kind);
 return '<div class="rp-return-type-tags" role="radiogroup" aria-label="'+esc(rpTitles[kind]+'新老品')+'">'+rpReturnTypeChoices.map(({value,label})=>{
  const count=rows.filter(row=>pfMatches(row,{...filters,productType:value})).length;
  return '<button type="button" class="rp-platform-tag" role="radio" aria-checked="'+(rpCardProductTypes[kind]===value)+'" tabindex="'+(rpCardProductTypes[kind]===value?'0':'-1')+'" data-rp-product-type="'+value+'" data-rp-product-type-kind="'+kind+'"'+(kind===6?' data-rp-return-type="'+value+'"':'')+' aria-label="'+esc(label+'，'+count+'条入榜记录')+'">'+label+'<b class="rp-platform-count">'+count+'</b></button>';
 }).join('')+'</div>';
}
function rpSetCardProductType(kind,value){
 if(!Object.hasOwn(rpCardProductTypes,kind)||!rpReturnTypeChoices.some(choice=>choice.value===value))return;
 if(rpCardProductTypes[kind]!==value){rpCardProductTypes[kind]=value;renderRisks([kind])}
 document.querySelector('#riskrail [data-rp-product-type-kind="'+kind+'"][data-rp-product-type="'+value+'"]')?.focus({preventScroll:true});
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#riskrail [data-rp-product-type]');if(button)rpSetCardProductType(Number(button.dataset.rpProductTypeKind),button.dataset.rpProductType);
});
document.addEventListener('keydown',event=>{
 const button=event.target.closest('#riskrail [data-rp-product-type]');if(!button||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
 event.preventDefault();
 const index=rpReturnTypeChoices.findIndex(choice=>choice.value===button.dataset.rpProductType),next=event.key==='Home'?0:event.key==='End'?2:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:2))%3;
 rpSetCardProductType(Number(button.dataset.rpProductTypeKind),rpReturnTypeChoices[next].value);
});
