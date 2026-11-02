
// 新旧销售明细复用六平台演示分摊；实际、目标、利润分别分配后再汇总。
function salesPlatformAllocation(cells,keys){
 const actual=[42,16,12,14,10,6],goals=[40,15,12,16,11,6];
 const grossMix=actual.map((w,i)=>w*[.94,.9,.98,1.1,1.04,1.13][i]);
 const targetMix=goals.map((w,i)=>w*[1.05,.95,1.1,.9,1.06,.98][i]);
 const rows=filterCatalog.platforms.map(name=>({name,...Object.fromEntries(keys.map(key=>[key,0]))}));
 for(const cell of cells)for(const key of keys){
  const weights=key==='gross'?grossMix:key==='targetGross'?targetMix:['target','annual'].includes(key)?goals:actual;
  const precise=['gross','targetGross'].includes(key),scale=['sku','netSales'].includes(key)?1:100;
  const parts=key==='salesUnits'?splitTarget(cell.netSales,weights).map((v,i)=>v+splitTarget(cell.salesUnits-cell.netSales,weights)[i]):precise?weights.map(w=>cell[key]*w/targetSum(weights)):splitTarget(Math.round(cell[key]*scale),weights).map(v=>v/scale);
  parts.forEach((value,index)=>rows[index][key]+=value);
 }
 return rows.map(row=>({...row,profit:row.sale?row.gross/row.sale*100:0}));
}
function salesChannelData(parent,selectedCells=null){
 const all=salesCrossData(),ci=chains.indexOf(parent.name),bi=brands.indexOf(parent.name),cells=selectedCells||all.flatMap((row,c)=>row.filter((_,b)=>ci>=0?c===ci:bi>=0?b===bi:true));
 return salesPlatformAllocation(cells,['sku','sale','target','annual','ytd','gross']);
}
const chainRenderNewBase=renderNew;
renderNew=function(){chainRenderNewBase();withPeriod('new',()=>{const list=newList(),grades=['A','B','C','D'],colors=['#5865f5','#9285fa','#6bc8f9','#fa803b'];let start=0;const gradient=grades.map((g,i)=>{const end=start+list.filter(r=>r.grade===g).length/Math.max(1,list.length)*100,part=colors[i]+' '+start+'% '+end+'%';start=end;return part});$('#newdonut').style.background=list.length?'conic-gradient('+gradient.join(',')+')':'#edf0f6';$('#newtop .donutleg').innerHTML=grades.map((g,i)=>`<div><i style="background:${colors[i]}"></i>${g+' 级'}　${list.filter(r=>r.grade===g).length}</div>`).join('');$('#newcount').textContent=`当前 ${list.length} 个新品样本 · 已展示 ${Math.min(5,list.length)} 条 · 与产品部采用同一评级规则`})};
