

// Completion rows use the same monthly/channel/chain allocation as dashboard totals.
function lifecycleCompletionProducts(stage,scope,p){
 const result=[],b=bounds(p),yearToDate=scope==='year';
 for(const month of months(p,yearToDate))for(let channel=0;channel<channels.length;channel++){
  const d=lifeChannelMonth(stage,channel,month,p),weights=lifeChainWeights[stage].map((v,i)=>v+((channel+i)%3===0?1:0)),counts=splitTarget(d.actual,weights);
  const lastDay=Math.min(new Date(Date.UTC(p.year,month,0)).getUTCDate(),`${p.year}-${String(month).padStart(2,'0')}`===b.cutoff.slice(0,7)?+b.cutoff.slice(8):31);
  counts.forEach((count,chain)=>{for(let i=0;i<count;i++){
   const product=(month+channel+i+stage)%names[chain].length,identity=sampleSpuByName(names[chain][product]),day=Math.max(1,Math.ceil((i+1)*lastDay/(count+1)));
   result.push({id:`LC-${p.year}-${stage+1}-${String(month).padStart(2,'0')}-${channel+1}-${chain+1}-${i+1}`,...sampleSpuFields(identity),chain,channel,date:`${p.year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,stage:lifeNames[stage]});
  }});
 }
 return result.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
// Outstanding demo plan items reconcile with the same category plan/actual totals.
function lifecyclePendingProducts(stage,p){
 const b=bounds(p),days=Math.round((Date.parse(b.end)-Date.parse(b.start))/86400000)+1,result=[],causes=['样品评审待完成','产品资料待补齐','排期确认中','跨部门验收待完成'];
 lifeChainRows(stage,p).forEach((g,chain)=>{const gap=Math.max(0,g.target-g.actual);for(let i=0;i<gap;i++){
  const product=(stage+chain+i)%names[chain].length,identity=sampleSpuByName(names[chain][product]),date=shiftDate(b.start,Math.min(days-1,Math.floor((g.actual+i+1)*days/(g.target+1)))),overdue=date<b.cutoff;
  result.push({id:`LP-${p.year}-${p.mode}-${p.value}-${stage+1}-${chain+1}-${i+1}`,...sampleSpuFields(identity),chain,channel:(stage+chain+i)%channels.length,date,stage:lifeNames[stage],owner:aiOwners[chain],state:overdue?'逾期未完成':'待完成',reason:overdue?causes[(i+stage)%causes.length]:'按计划推进中'});
 }});return result.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
const renderLifeBeforeProductDrilldown=renderLife;
renderLife=function(){renderLifeBeforeProductDrilldown();
 $$('#lifetable tbody tr, #lifetable tfoot tr').forEach((row,index)=>{
  const total=row.hasAttribute('data-life-summary')||row.parentElement.tagName==='TFOOT',dimension=total?'summary':lifeView,rowIndex=total?0:index-(row.parentElement.querySelector('[data-life-summary]')?1:0);
  for(const [column,scope] of [[2,'period'],[6,'year']]){const cell=row.cells[column];if(!cell)continue;const label=cell.textContent.trim(),header=$$('#lifetable th')[column]?.textContent||'完成产品';cell.innerHTML=`<button type="button" class="life-completed-number" data-life-completed="${scope}" data-life-dimension="${dimension}" data-life-row="${rowIndex}" aria-label="查看${esc(row.cells[0].textContent)}${esc(header)}的产品，${esc(label)}项">${esc(label)}<span aria-hidden="true"> ›</span></button>`;}
 });
};
function openLifecycleProducts(scope,dimension,rowIndex){withPeriod('lifecycle',()=>{
 const p={...periodFor()},stage=lifeIndex,b=bounds(p),pending=scope==='gap',rangeStart=scope==='year'?`${p.year}-01-01`:b.start,scopeName=pending?word()+'未完成项':scope==='year'?'年度累计完成':word()+'实际完成';
 const dimensionName=dimension==='chain'?chains[rowIndex]:dimension==='channel'?channels[rowIndex]:'公司整体';
 const records=(pending?lifecyclePendingProducts(stage,p):lifecycleCompletionProducts(stage,scope,p)).filter(r=>dimension==='chain'?r.chain===rowIndex:dimension==='channel'?r.channel===rowIndex:true);
 const products=new Set(records.map(r=>r.model+'|'+r.brand)).size,summary=dimension==='chain'?lifeChainRows(stage,p)[rowIndex]:lifeData(stage),netGap=Math.max(0,summary.target-summary.actual),offset=Math.max(0,records.length-netGap);
 const productFilters=pfDefaults();let page=1,query='',brand='全部',taskState='全部';const pageSize=DRAWER_PAGE_SIZE;
 openModal(lifeNames[stage]+' · '+scopeName,`<article class="life-products-detail"><div class="life-products-overview"><div><span class="tag">${esc(dimensionName)}</span><h3>${lifeNames[stage]} · ${pending?'未完成计划项':'已完成产品'}</h3><p>${rangeStart} — ${b.cutoff}</p></div><div class="life-products-count"><div><strong>${fmt(records.length)}</strong><small>${pending?'未完成项':'完成项'}</small></div><div><strong>${products}</strong><small>款产品</small></div></div></div><div class="life-products-filters"><label>产品搜索<input id="life-product-search" type="search" placeholder="产品名称 / SPU码 / 型号" aria-label="产品搜索"></label><label>品牌<select id="life-product-brand"><option>全部</option>${brands.map(name=>`<option>${name}</option>`).join('')}</select></label>${pending?'<label>状态<select id="life-product-state"><option>全部</option><option>逾期未完成</option><option>待完成</option></select></label>':''}<span id="life-products-match" aria-live="polite"></span></div><div id="life-products-results"></div><div class="life-products-pagination"></div><p class="life-products-foot">${pending?'未完成计划明细为演示数据，按当前规划、品类及周期统计。'+(offset?'存在其他品类超额完成 '+offset+' 项；未完成 '+records.length+' 项，抵扣后净缺口 '+netGap+' 项。':'未完成 '+records.length+' 项，与本期目标差额对应。'):'按完成项展示对应产品，同一产品可关联不同渠道或任务；以下为与看板数量对应的演示完成记录。'}</p></article>`);
 $('#dialogsub').textContent=dimensionName+' · '+scopeName+' · '+rangeStart+' — '+b.cutoff;
 const headers=pending?['产品图片','产品名称 / 计划项','型号','品类','品牌','渠道','计划完成日期','责任链主','当前状态 / 原因']:['产品图片','产品名称','型号','品类','品牌','渠道','完成日期','完成记录'];
 const filtered=()=>records.filter(r=>pfMatches(r,productFilters)&&(taskState==='全部'||r.state===taskState)&&pfIncludes(brand,r.brand)&&(!query||uiProductSearchMatch(r,query)));
 function render(){const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.min(page,pages);const start=(page-1)*pageSize;
  $('#life-products-match').textContent=`筛选结果 ${rows.length} / ${records.length} 项`;
  $('#life-products-results').innerHTML=`<div class="life-products-table"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.slice(start,start+pageSize).map(r=>`<tr>${[riskThumbnail(r.name),`<strong>${esc(r.name)}</strong>${pending?'<small>'+esc(r.id)+'</small>':''}`,esc(r.model),esc(chains[r.chain]),esc(r.brand),esc(channels[r.channel]),r.date,...(pending?[esc(r.owner),`<span class="tag ${r.state==='逾期未完成'?'red':'orange'}">${r.state}</span><small>${esc(r.reason)}</small>`]:[`<span class="tag green">已完成</span><small>${r.id}</small>`])].map((v,i)=>`<td data-label="${headers[i]}">${v}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">${pending?(records.length?'暂无匹配的未完成项，可调整筛选条件。':'当前目标已完成，无未完成项。'):'暂无匹配的完成产品，可调整搜索条件。'}</td></tr>`}</tbody></table></div>`;
  mountListPager($('.life-products-pagination'),rows.length,page,next=>{page=next;render()});
 }
 pfMount($('.life-products-filters'),productFilters,()=>{page=1;render()},['chain','attribute','productType']);render();if(pending)$('#life-product-state').onchange=e=>{taskState=e.target.value;page=1;render()};$('#life-product-search').oninput=e=>{query=e.target.value.trim();page=1;render()};$('#life-product-brand').onchange=e=>{brand=pfControlValue(e.target);page=1;render()};
 
 });}
document.addEventListener('click',e=>{const button=e.target.closest('[data-life-completed]');if(button)openLifecycleProducts(button.dataset.lifeCompleted,button.dataset.lifeDimension,+button.dataset.lifeRow)});

const newTrendPlatforms=[{name:'抖音',color:'#f0a346'},{name:'快手',color:'#4eb69c'},{name:'视频号',color:'#cf73ad'},{name:'天猫',color:'#7167ed'},{name:'京东',color:'#35a9d4'},{name:'拼多多',color:'#e77369'}];
const newTrendMetrics=[{key:'volume',name:'销量',unit:'件',digits:0},{key:'returnRate',name:'退货率',unit:'%',digits:2},{key:'revenue',name:'销售额',unit:'万元',digits:2},{key:'margin',name:'利润率',unit:'%',digits:2}];
function newProductTrendData(p,cutoff,days=30,platforms=newTrendPlatforms,launchDate=null){
 const trendSeed=p.trendSeed??p.id;
 const start=shiftDate(cutoff,1-days),launch=launchDate||shiftDate(cutoff,1-p.days);
 return platforms.map((platform,k)=>({...platform,points:Array.from({length:days},(_,i)=>{
  const k=['天猫','京东','抖音','快手','视频号','拼多多','跨境','线下'].indexOf(platform.name);
  const date=shiftDate(start,i),onSale=date>=launch,ordinal=Date.parse(date)/86400000;
  const wave=1+.22*Math.sin((ordinal+trendSeed*3+k*4)/2.8)+.13*Math.cos((ordinal+k*7)/5),weekday=new Date(date+'T00:00:00Z').getUTCDay(),promotion=(Math.floor(ordinal)+trendSeed+k*3)%17===0?1.45:1;
  const volume=onSale?Math.max(0,Math.round((22+trendSeed*2.6)*[1.12,1.02,1.48,.72][k%4]*wave*promotion*(weekday===0||weekday===6?1.12:1))):0;
  const price=(199+trendSeed*19+p.chain*40)*[1.03,1,.96,.94][k%4]*(promotion>1?.94:1),salesCents=Math.round(volume*price*100),returned=volume?Math.min(volume,Math.round(volume*(p.returnRate+[.1,-.35,.8,.55][k%4]+.85*Math.sin((ordinal+k)/4))/100)):0;
  const profitPercent=p.profit+[.8,.35,-1.8,-1.2][k%4]+1.6*Math.sin((ordinal+trendSeed)/4.5)-(promotion>1?2.5:0),profitCents=Math.round(salesCents*profitPercent/100);
  return{date,onSale,volume,returned,salesCents,profitCents,revenue:salesCents/1000000,returnRate:volume?returned/volume*100:null,margin:salesCents?profitCents/salesCents*100:null};
 })}));
}
function newTrendTotals(series){const points=series.flatMap(s=>s.points),sum=key=>points.reduce((n,p)=>n+p[key],0),volume=sum('volume'),returned=sum('returned'),salesCents=sum('salesCents'),profitCents=sum('profitCents');return{volume,returned,salesCents,profitCents,revenue:salesCents/1000000,returnRate:volume?returned/volume*100:null,margin:salesCents?profitCents/salesCents*100:null}}
function newTrendValue(value,metric){return value===null?'—':fmt(value,metric.digits)}
function newTrendChart(series,metric){
 const count=series[0].points.length,width=500,height=215,left=48,right=478,top=24,bottom=177,values=series.flatMap(s=>s.points.map(p=>p[metric.key])).filter(v=>v!==null),low=Math.min(0,...values),high=Math.max(1,...values),pad=(high-low)*.12,min=low<0?low-pad:0,max=high+pad,x=i=>left+i*(right-left)/Math.max(1,count-1),y=v=>bottom-(v-min)/(max-min)*(bottom-top);
 const ticks=Array.from({length:4},(_,i)=>min+(max-min)*i/3);
 const lines=series.map(s=>{let path='',previous=false;for(let i=0;i<s.points.length;i++){const value=s.points[i][metric.key];if(value===null){previous=false;continue}path+=(previous?' L ':' M ')+x(i).toFixed(2)+' '+y(value).toFixed(2);previous=true}
  return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>${s.points.map((p,i)=>p[metric.key]===null?'':`<circle cx="${x(i)}" cy="${y(p[metric.key])}" r="${count>60?1.6:2.6}" fill="${s.color}" class="nt-point"><title>${s.name} · ${p.date} · ${metric.name} ${newTrendValue(p[metric.key],metric)} ${metric.unit}</title></circle>`).join('')}`;
 }).join('');
 return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric.name}趋势，${series[0].points[0].date}至${series[0].points[count-1].date}，${series.map(s=>s.name).join('、')}，单位${metric.unit}"><text x="${left}" y="13">${metric.unit}</text>${ticks.map(v=>`<line x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}" stroke="#e9edf7" stroke-dasharray="3 3"/><text x="${left-9}" y="${y(v)+4}" text-anchor="end">${fmt(v,metric.key==='volume'?0:1)}</text>`).join('')}${min<0?`<line x1="${left}" x2="${right}" y1="${y(0)}" y2="${y(0)}" stroke="#c4cbe0"/>`:''}${lines}${[...new Set(Array.from({length:6},(_,i)=>Math.round((count-1)*i/5)))].map(i=>`<text x="${x(i)}" y="201" text-anchor="middle">${series[0].points[i].date.slice(5)}</text>`).join('')}</svg>`;
}
function addNewTrendButtons(root){$$(`${root} [data-product^="new,"]`).forEach(button=>{const cell=button.closest('td');if(!cell||cell.querySelector('[data-new-trend]'))return;cell.classList.add('new-product-actions');button.insertAdjacentHTML('afterend',`<button type="button" class="link new-trend-button" data-new-trend="${button.dataset.product.split(',')[1]}">趋势图</button>`)});}
const renderNewBeforeTrends=renderNew;
renderNew=function(){renderNewBeforeTrends();addNewTrendButtons('#newtable')};
$('#newchain').onchange=()=>renderNew();
const openNewListBeforeTrends=$('#newall').onclick;
$('#newall').onclick=()=>withPeriod('new',()=>{openNewListBeforeTrends();addNewTrendButtons('#dialogbody')});
