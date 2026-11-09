function kpmOpenDetail(spuId,selectedRange=null,tab='operating'){kpmSuspendChartZoom();kpmHidePointTooltip();withPeriod('matrix',()=>{
 const range=selectedRange||upWindow(),period=selectedRange?drawerPeriodFromRange(range):{...periodFor('matrix')};
 upOpenDetail({spuId,...range,period,module:'matrix',platform:kpmBusinessPlatforms(),tab});
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
 const button=e.target.closest('#matrix.kpm-main [data-kpm-operating],#matrix.kpm-main [data-kpm-grade],#matrix.kpm-main [data-kpm-sort],#matrix.kpm-main [data-kpm-detail]');if(!button)return;
 if(button.dataset.kpmDetail)return kpmOpenDetail(button.dataset.kpmDetail,button.hasAttribute('data-kpm-point')?kpmChartContext:null);
 if(button.dataset.kpmOperating){const level=button.dataset.kpmOperating;kpmSelectedOperating=kpmSelectedOperating===level?null:level;kpmSelectedGrade=kpmSelectedOperating?level:'all';kpmSelectedChange='all';}
 else if(button.dataset.kpmGrade){const level=button.dataset.kpmGrade;kpmSelectedGrade=kpmSelectedGrade===level&&!kpmSelectedOperating?'all':level;kpmSelectedOperating=null;kpmSelectedChange='all';}
 else rpSortCycle(kpmSort,button.dataset.kpmSort,kpmDefaultSort);
 kpmPage.value=1;kpmRender();
 if(button.dataset.kpmGrade)$('#matrix.kpm-main [data-kpm-grade="'+button.dataset.kpmGrade+'"]')?.focus({preventScroll:true});
});
document.addEventListener('keydown',e=>{
 if(!e.target.matches('#matrix.kpm-main circle[data-kpm-detail]')||!['Enter',' '].includes(e.key))return;
 e.preventDefault();kpmOpenDetail(e.target.dataset.kpmDetail,kpmChartContext);
});
