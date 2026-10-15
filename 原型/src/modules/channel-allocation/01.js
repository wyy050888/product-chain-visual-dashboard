
// All channel drilldowns share the same differentiated actual/target allocation.
function salesChannelData(parent,selectedCells=null){
 const all=salesCrossData(),ci=chains.indexOf(parent.name),bi=brands.indexOf(parent.name),cells=selectedCells||all.flatMap((row,c)=>row.filter((_,b)=>ci>=0?c===ci:bi>=0?b===bi:true));
 const goals=channels.map((_,i)=>channels.length-i+3),actualMix=[23,12,6,18,9,20,7,5],grossMix=actualMix.map((v,i)=>v*[.92,.9,.94,1.06,.83,1.12,1.08,1.03][i]),keys=['sku','sale','target','annual','ytd','gross'];
 const records=channels.map(name=>({name,...Object.fromEntries(keys.map(k=>[k,0]))})),cross=[0,1].map(()=>Object.fromEntries(keys.map(k=>[k,0])));
 for(const cell of cells)for(const key of keys){
  const scale=key==='sku'?1:100,weights=key==='target'||key==='annual'?goals:key==='gross'?grossMix:actualMix;
  const parts=key==='gross'?weights.map(w=>cell.gross*w/targetSum(weights)):splitTarget(Math.round(cell[key]*scale),weights).map(v=>v/scale);
  parts.forEach((v,i)=>records[i][key]+=v);
  const sub=key==='gross'?[parts[6]*.4,parts[6]*.6]:splitTarget(Math.round(parts[6]*scale),[4,6]).map(v=>v/scale);sub.forEach((v,i)=>cross[i][key]+=v);
 }
 records.forEach(r=>{for(const key of keys)if(key!=='gross')r[key]=+r[key].toFixed(key==='sku'?0:2);r.profit=r.sale?r.gross/r.sale*100:0});
 records[6].crossSplit=cross;return records;
}
const chainRenderNewBase=renderNew;
renderNew=function(){chainRenderNewBase();withPeriod('new',()=>{const list=newList(),grades=['A','B','C','D'],colors=['#5865f5','#9285fa','#6bc8f9','#edb667'];let start=0;const gradient=grades.map((g,i)=>{const end=start+list.filter(r=>r.grade===g).length/Math.max(1,list.length)*100,part=colors[i]+' '+start+'% '+end+'%';start=end;return part});$('#newdonut').style.background=list.length?'conic-gradient('+gradient.join(',')+')':'#edf0f6';$('#newtop .donutleg').innerHTML=grades.map((g,i)=>`<div><i style="background:${colors[i]}"></i>${g+' 级'}　${list.filter(r=>r.grade===g).length}</div>`).join('');$('#newcount').textContent=`当前 ${list.length} 个新品样本 · 已展示 ${Math.min(5,list.length)} 条 · 与产品部采用同一评级规则`})};