function cecImportPreview(entries,updates){
 const headers=['处理方式','责任部门','数据类型','降本分类','降本指标','年月','目标金额（元）','实际金额（元）'];
 const rows=entries.slice(0,100).map(entry=>{
  const target=entry.dataType==='部门目标',values=[entry.kind,entry.department,entry.dataType,target?'—':ccCategoryName(entry.category),target?'部门总目标':entry.name,entry.month,target?cecMoney(entry.targetCents):'—',target?'—':cecMoney(entry.actualCents)];
  return '<tr data-preserve-terms>'+values.map((value,index)=>'<td'+(index>=6?' class="cec-number"':'')+'>'+esc(value)+'</td>').join('')+'</tr>';
 }).join('');
 const targets=entries.filter(entry=>entry.dataType==='部门目标').length;
 return `<div class="cec-import-summary"><strong>校验通过</strong><span>目标 ${targets} 条 · 实际 ${entries.length-targets} 条 · 更新 ${updates} 条</span></div><div class="cec-preview-scroll"><table class="cec-table"><thead><tr>${headers.map(label=>'<th>'+label+'</th>').join('')}</tr></thead><tbody>${rows}</tbody></table></div>${updates?'<label class="cec-overwrite"><input type="checkbox" id="cec-overwrite">确认更新以上已有月度数据</label>':''}`;
}
