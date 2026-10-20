// 11项库存指标只维护一份列定义；首页表与抽屉明细保持同序、同口径。
const ipStockColumns=[
 ['warehouse','我司可售库存','warehouse'],['warehouseValueCents','货值（我司可售）','warehouseValue'],
 ['factory','工厂总库存','factory'],['factoryValueCents','货值（工厂总库存）','factoryValue'],
 ['staleUnits','呆滞库存','staleUnits'],['staleRatio','呆滞库存占比','staleRatio'],
 ['staleValueCents','呆滞库存金额','stale'],['staleValueRatio','呆滞金额占比','staleValueRatio'],
 ['turn','库存周转率','turn'],['delivery','交付及时率','delivery'],['refurbDelay','翻新延期天数','refurb']
];
function ipStockCell(row,key){
 const value=row[key];if(!Number.isFinite(value))return '<span class="muted">—</span>';
 if(key==='turn'||key==='delivery'||key==='refurbDelay')return ipIndicator(key==='refurbDelay'?'refurb':key,value);
 if(key.endsWith('Cents'))return fmt(value/1000000,2);
 if(key.endsWith('Ratio'))return fmt(value,1)+'%';
 return fmt(value);
}
function ipStockTable(rows,{dimension='spu',sort=null,summary=null}={}){
 const identity=dimension==='spu'?'SPU信息':dimension==='category'?'类目':'品牌';
 const headers=[identity,...ipStockColumns.map(([key,label,rule])=>{
  const help=['warehouse','factory','staleUnits'].includes(rule)?ipHelp(rule):'';
  return sort?`<span class="ip-stock-column-heading" data-up-basic>${rpSortHeader(key,label,sort).replaceAll('榜单排序','默认顺序')}${help}</span>`:`<span class="ip-field-heading" data-up-basic>${esc(label)}${help}</span>`;
 }),'操作'];
 const name=row=>dimension==='spu'?`<div class="ip-stock-product">${riskThumbnail(row.name)}<div><strong>${esc(row.name)}</strong><small>SPU码：${esc(row.spuCode||'—')}</small></div></div>`:esc(row.name);
 const action=row=>dimension==='spu'?`<button type="button" class="link" data-ip-spu="${esc(row.spuId)}">查看</button>`:`<button type="button" class="link" data-ip-stock="${row.index}" data-ip-dimension="${dimension}">查看</button>`;
 const body=rows.length?rows.map(row=>`<tr data-ip-row="${esc(dimension==='spu'?row.spuId:row.index)}"><td>${name(row)}</td>${ipStockColumns.map(([key])=>`<td data-ip-metric="${key}" data-value="${row[key]??''}">${ipStockCell(row,key)}</td>`).join('')}<td>${action(row)}</td></tr>`).join(''):`<tr><td colspan="13" class="empty">没有符合筛选条件的数据</td></tr>`;
 return `<table class="ip-stock-table ${dimension==='spu'?'ip-stock-spus':''}"><thead><tr>${headers.map(header=>`<th scope="col" data-up-basic>${header}</th>`).join('')}</tr></thead><tbody>${body}</tbody>${summary?`<tfoot><tr><td>当前筛选合计</td>${ipStockColumns.map(([key])=>`<td data-ip-metric="${key}">${ipStockCell(summary,key)}</td>`).join('')}<td>—</td></tr></tfoot>`:''}</table>`;
}
