// 类目和品牌库存共用13项指标定义，不提供下钻操作。
const ipStockColumns=[
 ['totalUnits','总库存',112],['goodsValueCents','货值（总库存）',140],
 ['warehouse','我司可售库存',132],['warehouseValueCents','货值（我司可售）',152],
 ['factory','工厂总库存',116],['factoryValueCents','货值（工厂总库存）',172],
 ['staleUnits','呆滞库存',136],['staleRatio','呆滞库存占比',160],
 ['staleValueCents','呆滞金额',136],['staleValueRatio','呆滞金额占比',160],
 ['turn','库存周转率',120],['delivery','交付及时率',120],['refurbRate','翻新闭环率',120]
];
function ipStockCell(row,key){
 if(key==='refurbRate')return ipRefurbRateCell(row);
 const value=row[key];if(!Number.isFinite(value))return '<span class="muted">—</span>';
 if(key==='turn'||key==='delivery')return ipIndicator(key,value);
 if(key.endsWith('Cents'))return fmt(value/1000000,2);
 if(key.endsWith('Ratio'))return fmt(value,1)+'%';
 return stockQuantity(value);
}
// 货值为本表同列合计占比；呆滞占比直接使用行内真实比例，不按排序位置缩放。
function ipStockShareCell(row,key,totals){
 const value=ipStockCell(row,key),blue=key==='goodsValueCents'||key==='warehouseValueCents',red=key==='staleRatio'||key==='staleValueRatio';
 if(!blue&&!red||!Number.isFinite(row[key]))return value;
 const ratio=blue?totals[key]>0?row[key]/totals[key]*100:null:row[key];
 if(!Number.isFinite(ratio))return value;
 const width=Math.min(100,Math.max(0,ratio)),label=blue?'占本表'+(key==='goodsValueCents'?'总库存货值':'我司可售货值')+'合计':'实际占比';
 return '<div class="ip-stock-share ip-stock-share--'+(blue?'blue':'red')+'" data-ip-share="'+ratio+'" style="--ip-share:'+width.toFixed(4)+'%" aria-label="'+label+' '+fmt(ratio,1)+'%"><span>'+value+'</span></div>';
}
function ipStockTable(rows,{dimension='category',sort=null}={}){
 // 两表共用列宽；最小宽度同时约束旧偏好及拖拽，完整表头和排序箭头留在各自列内。
 const widths=[96,...ipStockColumns.map(([, ,width])=>width)],minimums=esc(JSON.stringify(widths));
 const columns='<colgroup>'+widths.map(width=>'<col style="width:'+width+'px">').join('')+'</colgroup>';
 const tableWidth=widths.reduce((sum,width)=>sum+width,0);
 const headers=[dimension==='category'?'类目':'品牌',...ipStockColumns.map(([key,label])=>{
  return sort?`<span class="ip-stock-column-heading" data-up-basic>${rpSortHeader(key,label,sort).replaceAll('榜单排序','默认顺序')}</span>`:`<span class="ip-field-heading" data-up-basic>${esc(label)}</span>`;
 })];
 const totals=Object.fromEntries(['goodsValueCents','warehouseValueCents'].map(key=>[key,targetSum(rows.map(row=>Number.isFinite(row[key])?row[key]:0))]));
 const body=rows.length?rows.map(row=>`<tr data-ip-row="${esc(row.index)}"><td>${esc(row.name)}</td>${ipStockColumns.map(([key])=>`<td data-ip-metric="${key}" data-value="${row[key]??''}">${ipStockShareCell(row,key,totals)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">没有符合筛选条件的数据</td></tr>`;
 return `<table class="ip-stock-table" style="min-width:${tableWidth}px" data-column-minimums="${minimums}">${columns}<thead><tr>${headers.map(header=>`<th scope="col" data-up-basic>${header}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}
