// 周报按部门过滤后再交给共用分页、计数和 PDF 下载。
const pcWeeklyRows=gdWeeklyReportRows,pcWeeklyTable=gdWeeklyReportTable;
gdWeeklyReportRows=function(){
 const weeks=pcWeeklyRows();
 return pcIsActive()?weeks.filter(week=>week.reports.product).map(week=>({...week,reports:{product:week.reports.product}})):weeks;
};
function pcReportDownload(week,label){
 return `<button type="button" class="${label==='下载周报'?'btn small primary':'link'}" data-gd-weekly-download="${week.monday}" data-gd-weekly-file="${esc(week.reports.product)}" aria-label="下载周报 · ${esc(week.label)} · 产品中心">${label}</button>`;
}
gdWeeklyReportTable=function(weeks){
 if(!pcIsActive())return pcWeeklyTable(weeks);
 const latest=gdWeeklyReportRows()[0];
 if(!latest)return '<div class="empty">暂无已生成的产品中心周报</div>';
 const featured=weeks[0]?.monday===latest.monday;
 const archive=featured?weeks.slice(1):weeks;
 return `<section class="pc-weekly" aria-label="产品中心周报">
  ${featured?`<article class="pc-weekly-feature"><span class="pc-weekly-icon" aria-hidden="true">PDF</span><div><span class="pc-eyebrow">最新周报</span><h3>产品中心周报 · ${esc(latest.label)}</h3></div>${pcReportDownload(latest,'下载周报')}</article>`:''}
  ${archive.length?`<h3 class="pc-weekly-caption">历史周报</h3><ul class="pc-weekly-archive">${archive.map(week=>`<li><div><strong>${esc(week.label)}</strong><small>${esc(week.reports.product)}</small></div>${pcReportDownload(week,'下载 PDF')}</li>`).join('')}</ul>`:''}
 </section>`;
};
