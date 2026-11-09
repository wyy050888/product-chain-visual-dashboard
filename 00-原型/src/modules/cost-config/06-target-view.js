// 目标以所选年份完整展开；季度、年度只汇总原有月度值，不写回或分摊目标。
function cecTargetPeriods(){
 return cecYearPeriods().map((period,index)=>({...period,label:cecState.mode==='quarter'?'Q'+(index+1)+'目标（元）':cecState.mode==='year'?'年度目标（元）':period.label}));
}
function cecTargetPeriodCell(department,months){
 const cells=months.map(month=>cecDepartmentTargetCell(department,month)),known=cells.map(cell=>cell.targetCents).filter(Number.isFinite);
 return {targetCents:known.length?known.reduce((sum,value)=>sum+value,0):null,...cecLatestUpdate(cells)};
}
function cecRenderTargetTable(){
 const periods=cecTargetPeriods(),annualSummary=cecState.mode!=='year';
 const rows=ccDepartments.map(department=>{
  const annual=cecTargetPeriodCell(department.id,Array.from({length:12},(_,index)=>cecMonth(cecState.year,index+1)));
  return {...department,annual:annual.targetCents,periods:periods.map(period=>cecTargetPeriodCell(department.id,period.months).targetCents),...cecLatestUpdate([annual])};
 });
 const headers=['责任部门',...(annualSummary?['年度目标（元）']:[]),...periods.map(period=>period.label),'更新人','更新时间'];
 const widths=[180,...(annualSummary?[160]:[]),...periods.map(()=>150),100,180],table=$('#cec-page .cec-table');
 table.querySelector('colgroup')?.remove();table.insertAdjacentHTML('afterbegin','<colgroup>'+widths.map(width=>'<col style="width:'+width+'px">').join('')+'</colgroup>');table.style.minWidth=widths.reduce((sum,width)=>sum+width,0)+'px';
 $('#cec-head').innerHTML='<tr>'+headers.map((label,index)=>'<th'+(index>0&&index<headers.length-2?' class="cec-number"':'')+'>'+label+'</th>').join('')+'</tr>';
 const money=(value,attributes='')=>'<td class="cec-number" '+attributes+'>'+cecDisplayMoney(value)+'</td>';
 const amounts=row=>(annualSummary?money(row.annual,'data-cec-annual-target'):'')+row.periods.map((value,index)=>money(value,'data-cec-target-period="'+periods[index].key+'"')).join('');
 const size=cecPageSize();cecState.page=Math.max(1,Math.min(cecState.page,Math.ceil(rows.length/size)||1));
 $('#cec-body').innerHTML=rows.slice((cecState.page-1)*size,cecState.page*size).map(row=>'<tr data-cec-target-department="'+row.id+'"><td>'+esc(row.name)+'</td>'+amounts(row)+'<td class="cec-updater">'+esc(row.actor||'—')+'</td><td class="cec-updated">'+esc(row.updatedAt||'—')+'</td></tr>').join('')||'<tr><td colspan="'+headers.length+'" class="cec-empty">暂无符合条件的部门</td></tr>';
 const sum=values=>{const known=values.filter(Number.isFinite);return known.length?known.reduce((total,value)=>total+value,0):null};
 const total={annual:sum(rows.map(row=>row.annual)),periods:periods.map((_,index)=>sum(rows.map(row=>row.periods[index])))};
 $('#cec-total').innerHTML=rows.length?'<tr><td>合计</td>'+amounts(total)+'<td></td><td></td></tr>':'';cecRenderPager(rows.length,size);
}
