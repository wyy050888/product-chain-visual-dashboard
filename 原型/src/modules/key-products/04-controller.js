function kpmOpenDetail(spuId){kpmHidePointTooltip();withPeriod('matrix',()=>{
 const range=upWindow(),period={...periodFor('matrix')};
 upOpenDetail({spuId,...range,period,module:'matrix',platform:'all',tab:'operating'});
});}
document.addEventListener('input',e=>{
 if(!e.target.matches('#matrix.kpm-main [data-kpm-search]'))return;
 kpmFilters.query=e.target.value;kpmPage.value=1;kpmRender();
});
document.addEventListener('change',e=>{
 if(!e.target.matches('#matrix.kpm-main [data-kpm-filter]'))return;
 kpmFilters[e.target.dataset.kpmFilter]=pfControlValue(e.target);kpmPage.value=1;kpmRender();
});
document.addEventListener('click',e=>{
 const button=e.target.closest('#matrix.kpm-main [data-kpm-grade],#matrix.kpm-main [data-kpm-sort],#matrix.kpm-main [data-kpm-reset],#matrix.kpm-main [data-kpm-detail]');if(!button)return;
 if(button.dataset.kpmDetail)return kpmOpenDetail(button.dataset.kpmDetail);
 if(button.hasAttribute('data-kpm-reset')){
  for(const key of Object.keys(kpmFilters))kpmFilters[key]=key==='query'?'':'all';
  kpmSelectedGrade='all';kpmSort.key='sales';kpmSort.direction='desc';
  $('#matrix [data-kpm-search]').value='';
  for(const select of $$('#matrix [data-kpm-filter]'))pfControlSet(select,'all');
 }else if(button.dataset.kpmGrade)kpmSelectedGrade=kpmSelectedGrade===button.dataset.kpmGrade?'all':button.dataset.kpmGrade;
 else{const key=button.dataset.kpmSort;kpmSort.direction=kpmSort.key===key&&kpmSort.direction==='desc'?'asc':'desc';kpmSort.key=key}
 kpmPage.value=1;kpmRender();
});
document.addEventListener('keydown',e=>{
 if(!e.target.matches('#matrix.kpm-main circle[data-kpm-detail]')||!['Enter',' '].includes(e.key))return;
 e.preventDefault();kpmOpenDetail(e.target.dataset.kpmDetail);
});
