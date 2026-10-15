// 公共列宽模型：仅保存界面偏好，按表格位置和表头结构隔离。
const uiColumnStorageKey='dashboard-column-widths-v1',uiColumnMin=48,uiColumnMax=2400;
let uiColumnPreferences={};
try{const saved=JSON.parse(localStorage.getItem(uiColumnStorageKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))uiColumnPreferences=saved}catch(_){}
function uiColumnGrid(rows){
 const grid=[],cells=[];
 Array.from(rows||[]).forEach((row,y)=>{
  grid[y]||=[];let x=0;
  for(const cell of row.cells){
   while(grid[y][x])x++;
   const span=cell.colSpan||1,height=cell.rowSpan===0?rows.length-y:cell.rowSpan||1;
   cells.push({cell,start:x,span});
   for(let dy=0;dy<height;dy++){grid[y+dy]||=[];for(let dx=0;dx<span;dx++)grid[y+dy][x+dx]=true}
   x+=span;
  }
 });
 return {cells,count:Math.max(0,...grid.map(row=>row.length))};
}
function uiColumnLabel(cell){
 const copy=cell.cloneNode(true);copy.querySelectorAll('.metric-help,.metric-tooltip,[data-ui-column-handle]').forEach(n=>n.remove());
 return copy.textContent.trim().replace(/\s+/g,' ').replace(/(?:20\d{2}年|\d{2}年|Q[1-4]|\d{1,2}月)(?=[A-Za-z\u4e00-\u9fff])/g,'');
}
function uiColumnKey(table,grid){
 if(table.dataset.columnKey)return table.dataset.columnKey;
 const host=table.parentElement.closest('[id]'),scope=table.closest('.sd-detail')?'shop':table.closest('.up-detail')?'product':'';
 const index=host?[...host.querySelectorAll('table')].indexOf(table):0;
 return JSON.stringify([table.id||host?.id||'page',scope,index,grid.cells.map(({cell,start,span})=>[start,span,uiColumnLabel(cell)])]);
}
function uiColumnWidths(table,grid){
 const widths=Array(grid.count).fill(0);
 for(const entry of [...grid.cells].sort((a,b)=>a.span-b.span)){
  const width=entry.cell.getBoundingClientRect().width;if(!width)continue;
  const indexes=Array.from({length:entry.span},(_,i)=>entry.start+i),unknown=indexes.filter(i=>!widths[i]);
  if(unknown.length){const rest=width-indexes.reduce((sum,i)=>sum+widths[i],0);for(const i of unknown)widths[i]=Math.max(uiColumnMin,rest/unknown.length)}
 }
 const fallback=table.getBoundingClientRect().width/Math.max(1,grid.count);
 return widths.map(w=>Math.max(uiColumnMin,Math.round(w||fallback)));
}
function uiColumnSaved(key,count){
 const values=uiColumnPreferences[key];
 return Array.isArray(values)&&values.length===count&&values.every(n=>Number.isFinite(n)&&n>=uiColumnMin&&n<=uiColumnMax)?[...values]:null;
}
function uiColumnRemember(key,widths){
 uiColumnPreferences[key]=[...widths];
 // 有界存储，不影响业务任务及其他浏览器数据。
 const keys=Object.keys(uiColumnPreferences);for(const old of keys.slice(0,Math.max(0,keys.length-200)))delete uiColumnPreferences[old];
 try{localStorage.setItem(uiColumnStorageKey,JSON.stringify(uiColumnPreferences))}catch(_){/* 存储不可用时仍保留当前会话列宽。 */}
}
