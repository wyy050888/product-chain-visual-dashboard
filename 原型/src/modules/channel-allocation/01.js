
// All channel drilldowns share the same differentiated actual/target allocation.
function salesChannelData(parent,selectedCells=null){
 const all=salesCrossData(),ci=chains.indexOf(parent.name),bi=brands.indexOf(parent.name),cells=selectedCells||all.flatMap((row,c)=>row.filter((_,b)=>ci>=0?c===ci:bi>=0?b===bi:true));
 const weights=channels.map((_,i)=>channels.length-i+3),keys=['sku','sale','target','annual','ytd','gross'];
 const records=channels.map(name=>({name,...Object.fromEntries(keys.map(key=>[key,0]))}));
 for(const cell of cells)for(const key of keys){
  const scale=key==='sku'?1:100,parts=key==='gross'?weights.map(weight=>cell.gross*weight/targetSum(weights)):splitTarget(Math.round(cell[key]*scale),weights).map(value=>value/scale);
  parts.forEach((value,index)=>records[index][key]+=value);
 }
 return records.map(row=>{for(const key of keys)if(key!=='gross')row[key]=+row[key].toFixed(key==='sku'?0:2);row.profit=row.sale?row.gross/row.sale*100:0;return row});
}
const chainRenderNewBase=renderNew;
renderNew=function(){chainRenderNewBase();withPeriod('new',()=>{const list=newList(),grades=['A','B','C','D'],colors=['#5865f5','#9285fa','#6bc8f9','#edb667'];let start=0;const gradient=grades.map((g,i)=>{const end=start+list.filter(r=>r.grade===g).length/Math.max(1,list.length)*100,part=colors[i]+' '+start+'% '+end+'%';start=end;return part});$('#newdonut').style.background=list.length?'conic-gradient('+gradient.join(',')+')':'#edf0f6';$('#newtop .donutleg').innerHTML=grades.map((g,i)=>`<div><i style="background:${colors[i]}"></i>${g+' 级'}　${list.filter(r=>r.grade===g).length}</div>`).join('');$('#newcount').textContent=`当前 ${list.length} 个新品样本 · 已展示 ${Math.min(5,list.length)} 条 · 与产品部采用同一评级规则`})};