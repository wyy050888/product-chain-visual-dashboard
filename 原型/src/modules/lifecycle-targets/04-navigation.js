const ltRouteHash='#system-lifecycle-targets';
smRegisterPage({route:ltRouteHash,id:'lt-target-page',title:'生命周期目标',group:'目标管理',menuOrder:10,markup:`<header class="lt-page-head sm-target-head"><h2 class="sm-page-title">生命周期目标</h2><div id="lt-categories" class="sm-page-tabs" role="tablist" aria-label="目标类目"></div><label class="lt-year-field"><select id="lt-year" aria-label="目标年度">${dashboardYears(1).map(y=>`<option value="${y}">${y}年</option>`).join('')}</select></label></header>
 <section class="lt-panel">
 <div id="lt-error" role="alert"></div><div id="lt-table" tabindex="0" aria-label="生命周期目标表，可横向滚动"></div></section>`,
 onShow(){ltEditor.year=periodFor('lifecycle').year;ltEditor.error='';ltRenderPage()}
});
$('#lifecycle .titlegroup').insertAdjacentHTML('afterend','<button type="button" class="btn" id="lt-open-targets">配置目标</button>');
$('#lt-open-targets').onclick=()=>smNavigate(ltRouteHash);
window.lifecycleTargetsAudit=()=>({pageOpen:smActiveRoute===ltRouteHash,year:ltEditor.year,category:ltEditor.category,saved:ltClone(ltStore),monthly:Array.from({length:12},(_,m)=>ltMonthValue(ltYearValues(ltEditor.year)[ltEditor.category][0][Math.floor(m/3)],m+1)),sourceActuals:withPeriod('lifecycle',()=>Array.from({length:8},(_,stage)=>lifeSumRows(lifeChannelRows(stage))).map(d=>[d.actual,d.yearActual])),dashboard:withPeriod('lifecycle',()=>ltPlans.filter((p,i,a)=>a.findIndex(x=>x.stage===p.stage)===i).map(p=>ltDashboardTotals(p.stage)))});
