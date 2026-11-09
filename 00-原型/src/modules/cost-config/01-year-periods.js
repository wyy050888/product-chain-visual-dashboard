// 两个Tab共用全年周期边界，展示切换不改变月度原始记录。
function cecYearPeriods(){
 const mode=cecState.mode,count=mode==='month'?12:mode==='quarter'?4:1,width=12/count;
 return Array.from({length:count},(_,index)=>({key:mode+'-'+(index+1),label:mode==='month'?(index+1)+'月（元）':mode==='quarter'?'Q'+(index+1)+'（元）':'年度（元）',months:Array.from({length:width},(_,offset)=>cecMonth(cecState.year,index*width+offset+1))}));
}
function cecActualPeriodCell(id,months){
 const cells=months.map(month=>cecCell(id,month)),known=cells.map(cell=>cell.actualCents).filter(Number.isFinite);
 return {actualCents:known.length?known.reduce((sum,value)=>sum+value,0):null,...cecLatestUpdate(cells)};
}
const cecDisplayMoney=cents=>Number.isFinite(cents)?cecMoney(cents):'';
