const ltImportDialog=document.createElement('dialog');
ltImportDialog.id='lt-import-dialog';ltImportDialog.className='lt-data-dialog';ltImportDialog.setAttribute('aria-labelledby','lt-import-title');document.body.append(ltImportDialog);
let ltImportBatch=null,ltImportToken=0,ltImportFile='';
function ltDataTable(headers,rows){return `<div class="lt-data-scroll"><table><thead><tr>${headers.map(label=>`<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(cells=>`<tr>${cells.map(value=>`<td>${value}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="lt-data-empty">暂无记录</td></tr>`}</tbody></table></div>`}
const ltChangeHeaders=['链群','计划','季度','变更前','变更后'];
const ltChangeCells=change=>[esc(ltCategories[change.category]),esc(ltPlans[change.plan]?.name),'Q'+(change.quarter+1),change.before===null?'—':fmt(change.before),`<strong class="lt-data-new">${change.after===null?'—':fmt(change.after)}</strong>`];
const ltErrorTable=errors=>ltDataTable(['原始行号','字段','错误原因'],errors.map(error=>[error.row,esc(error.field),esc(error.message)]));
const ltDataTime=value=>new Date(value).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'});
function ltOpenTargetImport(){
 ltImportBatch=null;ltImportToken++;ltImportFile='';
 ltImportDialog.dataset.year=String(ltEditor.year);
 ltImportDialog.innerHTML=`<header><div><h2 id="lt-import-title">导入生命周期目标</h2><p>${ltEditor.year}年 · 四个链群</p></div><button type="button" class="lt-data-close" data-lt-import-close aria-label="关闭导入">×</button></header>
 <div class="lt-data-body"><div class="lt-import-intro"><p>同链群、同计划按季度更新；空白保留原值，0保存为零目标。年度目标自动汇总。</p><button type="button" class="link" data-lt-template>下载模板</button></div>
 <label class="lt-data-upload"><strong>选择目标文件</strong><span>支持 .xlsx、.csv，最大5MB；Excel读取第一个工作表</span><input type="file" id="lt-import-file" accept=".xlsx,.csv" aria-label="选择目标文件"></label>
 <div id="lt-import-result" aria-live="polite"></div><p id="lt-import-error" role="alert"></p></div>
 <footer><span>整批校验通过后生效</span><div><button type="button" class="btn" data-lt-import-close>取消</button><button type="button" class="btn lt-data-primary" id="lt-import-confirm" disabled>确认导入</button></div></footer>`;
 ltImportDialog.showModal();
 const year=Number(ltImportDialog.dataset.year);
 uiBindImportFlow({dialog:ltImportDialog,input:$('#lt-import-file'),button:$('#lt-import-confirm'),parse:table=>ltParseTargetImport(table,year),commit:(batch,file)=>ltCommitTargetImport(batch,file.name),done:()=>{ltCloseTargetImport();ltEditor.error='';ltRenderPage();renderLife()}});
}
function ltCloseTargetImport(){ltImportToken++;ltImportBatch=null;ltImportDialog.close()}
