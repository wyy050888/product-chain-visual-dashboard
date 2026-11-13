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
 const button=e.target.closest('#matrix.kpm-main :is([data-kpm-operating],[data-kpm-grade],[data-kpm-summary-select],[data-kpm-sort],[data-kpm-detail])');if(!button)return;
 if(button.dataset.kpmDetail)return kpmOpenDetail(button.dataset.kpmDetail,button.hasAttribute('data-kpm-point')?kpmChartContext:null);
 const {kpmSummarySelect,kpmGrade,kpmOperating}=button.dataset;
 const operating=kpmOperating||(kpmSummarySelect==='operating'?button.value:'');
 const grade=kpmGrade||(kpmSummarySelect==='grade'?button.value:'');
 const summary=button.closest('.kpm-grade-summary'),scrollLeft=summary?.scrollLeft;
 if(operating){kpmSelectedOperating=kpmSelectedOperating===operating?null:operating;kpmSelectedGrade=kpmSelectedOperating?operating:'all';kpmSelectedChange='all';}
 else if(grade){kpmSelectedGrade=kpmSelectedGrade===grade&&!kpmSelectedOperating?'all':grade;kpmSelectedOperating=null;kpmSelectedChange='all';}
 else rpSortCycle(kpmSort,button.dataset.kpmSort,kpmDefaultSort);
 kpmPage.value=1;kpmRender();
 if(summary){
  summary.scrollLeft=scrollLeft;
  summary.querySelector(`[data-kpm-summary-select="${kpmSummarySelect}"][value="${button.value}"]`)?.focus({preventScroll:true});
 }else if(kpmGrade)$('#matrix.kpm-main [data-kpm-grade="'+kpmGrade+'"]')?.focus({preventScroll:true});
});
document.addEventListener('keydown',e=>{
 if(!e.target.matches('#matrix.kpm-main circle[data-kpm-detail]')||!['Enter',' '].includes(e.key))return;
 e.preventDefault();kpmOpenDetail(e.target.dataset.kpmDetail,kpmChartContext);
});
