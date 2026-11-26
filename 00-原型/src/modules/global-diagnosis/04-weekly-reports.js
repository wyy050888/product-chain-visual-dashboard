const gdWeeklyReportScopes=[
 ['chain','产品链'],['product','产品中心'],['quality','品质中心'],['rnd','研发中心'],
 ['project','项目部'],['procurement','采购部'],['shipping','发货部'],['planning','计划部']
];

function gdWeeklyReportRows(){
 const [latest]=dateRangePreset('week',DATA_CUTOFF);
 const [first]=dateRangePreset('week',aiCoverageStart);
 const rows=[];
 for(let monday=latest;monday>=first;monday=shiftDate(monday,-7)){
  // ISO 周以周四所在年份为准，避免跨年时出现第 0 周。
  const thursday=shiftDate(monday,3),year=thursday.slice(0,4),week=Math.floor((Date.parse(thursday)-Date.parse(year+'-01-01'))/604800000)+1;
  const files=dashboardWeeklyReports[monday]||[];
  const reports=Object.fromEntries(gdWeeklyReportScopes.flatMap(([key,name])=>{
   const file=name+'第'+week+'周'+(key==='chain'?'总':'')+'周报.pdf';
   return files.includes(file)?[[key,file]]:[];
  }));
  const start=monday.slice(5).replace('-','/'),end=shiftDate(monday,6).slice(5).replace('-','/');
  const weekLabel=`第${String(week).padStart(2,'0')}周（${start}-${end}）`;
  const label=`${year.slice(-2)}年${weekLabel}`;
  rows.push({monday,label,weekLabel,reports});
 }
 return rows;
}

function gdWeeklyReportCell({monday,label,reports},key,name){
 const file=reports[key];
 return file
  ? `<button type="button" class="link" data-gd-weekly-download="${monday}" data-gd-weekly-file="${esc(file)}" aria-label="下载周报 · ${label} · ${name}">下载周报</button>`
  : '<span class="muted">未生成</span>';
}

function gdWeeklyReportTable(weeks,scopes=gdWeeklyReportScopes,summaryColumns=[],renderCell=gdWeeklyReportCell){
 const summaryHeaders=summaryColumns.map(([name])=>`<th scope="col" class="gd-weekly-summary-cell">${esc(name)}</th>`).join('');
 const headers=scopes.map(([,name])=>`<th scope="col">${name}</th>`).join('');
 const rows=weeks.map(week=>{
  const summaryCells=summaryColumns.map(([,render])=>`<td class="gd-weekly-summary-cell">${render(week)||'<span class="muted">—</span>'}</td>`).join('');
  const cells=scopes.map(([key,name])=>`<td>${renderCell(week,key,name)}</td>`).join('');
  return `<tr><th scope="row">${week.label}</th>${summaryCells}${cells}</tr>`;
 }).join('');
 const singleScope=scopes.length===1;
 const emptyMessage=singleScope?'暂无已生成的'+scopes[0][1]+'周报':'暂无统计周';
 const empty=`<tr><td colspan="${scopes.length+summaryColumns.length+1}" class="gd-empty">${emptyMessage}</td></tr>`;
 return `<div class="gd-table-scroll gd-weekly-reports${singleScope?' gd-weekly-single-scope':''}${summaryColumns.length?' gd-weekly-with-summary':''}" tabindex="0" role="region" aria-label="部门周报"><table aria-label="部门周报下载表"><thead><tr><th scope="col">统计周</th>${summaryHeaders}${headers}</tr></thead><tbody>${rows||empty}</tbody></table></div>`;
}

let gdWeeklyReportLoad;
function gdLoadWeeklyReportFiles(){
 // 点击时才加载 PDF，兼容直接打开本地原型。
 return gdWeeklyReportLoad??=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=dashboardWeeklyReportBundle;
  script.onload=()=>{script.remove();resolve(window.dashboardWeeklyReportFiles)};
  script.onerror=()=>{script.remove();reject(new Error('周报文件加载失败'))};
  document.head.append(script);
 });
}

function gdSaveWeeklyReportBlob(blob,file){
 const url=URL.createObjectURL(blob),download=document.createElement('a');
 download.href=url;
 download.download=file;
 document.body.append(download);
 download.click();
 download.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function gdDownloadWeeklyReportFile(week,file){
 try{
  const reports=await gdLoadWeeklyReportFiles(),encoded=reports?.[week]?.[file];
  if(!encoded)throw new Error('周报文件缺失');
  const bytes=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
  gdSaveWeeklyReportBlob(new Blob([bytes],{type:'application/pdf'}),file);
 }catch{
  gdWeeklyReportLoad=null;
  toast('周报下载失败，请重试');
 }
}

function gdDownloadWeeklyReport(button){
 const {gdWeeklyFile:file,gdWeeklyDownload:week}=button.dataset;
 return gdDownloadWeeklyReportFile(week,file);
}
