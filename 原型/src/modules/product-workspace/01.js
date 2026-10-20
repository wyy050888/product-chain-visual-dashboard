

// One local demo workspace: department and director read the same domain functions.
let dpDepartment='产品部';
function dpDepartmentName(){return dpDepartment}
const DP_KEY='product-department-dbs-reference-20261010';
let dpStore={version:1,tasks:[],audit:[],weights:[20,15,15,10,12,10,8,10],overrides:{},newTargets:[60,55,45,35],marginTarget:12,workItems:[],priorities:{},productStates:{}};
try{const saved=JSON.parse(localStorage.getItem(DP_KEY)||'null');if(saved?.version===1&&Array.isArray(saved.tasks)&&Array.isArray(saved.audit))dpStore={...dpStore,...saved}}catch(_){}
const dpModules=[['risk','产品部高危预警','风险预警'],['ai','产品部 AI 全局智能诊断','AI 总诊断'],['management','部门全局管理','部门管理'],['sales','销售达成管控','销售达成'],['projects','产品红绿灯管控','项目进度'],['lifecycle','产品全生命周期管控','产品生命周期'],['new','新品专项管控','新品专项'],['matrix','关键产品管控','关键产品'],['inventory','全品类库存管控','库存管控']];
const dpState={chain:'all',role:'manager',view:'director',global:{...globalPeriod},periods:{},tab:{management:'score',ai:'blocks',sales:'chain',projects:'红灯',projectPhase:'all',life:0,lifeView:'summary',channelView:'channel',matrix:'B',inventory:'chain',tasks:'all',doc:0},filters:{},pages:{}};
const dpColors=['#8981f8','#f1b663','#65b7d9','#ee8996','#a8b0c5'];
const dpChannelNames=filterCatalog.platforms;
const dpDocNames=['日报','周报','项目台账','会议记录','市场分析','竞品分析','产品企划','产品培训'];
function dpP(id){return dpState.periods[id]||dpState.global}
function dpWith(id,fn){const key='dp-'+id,old=localPeriods[key];localPeriods[key]=dpP(id);try{return withPeriod(key,fn)}finally{if(old)localPeriods[key]=old;else delete localPeriods[key]}}
function dpLegacy(module,id,fn){const old=localPeriods[module];localPeriods[module]={...dpP(id)};try{return withPeriod(module,fn)}finally{if(old)localPeriods[module]=old;else delete localPeriods[module]}}
const dpInScope=r=>dpState.chain==='all'||r.chain===+dpState.chain;
const dpSum=(rows,key)=>rows.reduce((n,r)=>n+(Number(r[key])||0),0);
const dpRate=(a,b)=>b?a/b*100:null;
const dpPct=(a,b)=>b?fmt(a/b*100,1)+'%':'—';
const dpLabel=g=>g;
function dpSave(next){try{localStorage.setItem(DP_KEY,JSON.stringify(next));dpStore=next;return true}catch(_){toast('保存失败：浏览器存储不可用，请保留当前填写内容后重试。');return false}}
function dpAudit(action,object,detail){return{at:new Date().toISOString(),actor:dpState.role==='manager'?dpDepartmentName()+'负责人':aiOwners[+dpState.chain||0],action,object,detail}}
function dpClosed(key,p=periodFor()){return dpStore.tasks.find(t=>t.source.key===key&&t.state==='已验收'&&t.closedDate<=bounds(p).cutoff)}
const dpOriginalProjects=projects;
projects=function(){return dpOriginalProjects().map(p=>{const done=dpClosed('project:'+periodFor().year+':'+(p.sourceKey||p.model));return done?{...p,status:'绿灯',delay:0,originalPlan:p.plan,plan:done.recoveryPlan||shiftDate(done.closedDate,7),historicalDelay:p.delay,dbsVerified:done.id,dbsClosedDate:done.closedDate}:p})};
const dpOriginalRiskRows=riskRows;
riskRows=function(k){return dpOriginalRiskRows(k).filter(r=>k===5?r.status==='红灯':!dpClosed('quality:'+periodFor().year+':'+(r.spuId||r.model))||k!==0)};
// Director AI blockers keep their record IDs while reading the canonical project status.
const dpOriginalInlineAIRows=inlineAIRows;
inlineAIRows=function(){const end=inlineAIRange().end,records=dpOriginalInlineAIRows(),ps=withPeriod('projects',()=>dpOriginalProjects());return records.filter(r=>{if(r.kind!=='block')return true;const model=r.subject.match(/(?:CL|KT|EN|HC)-\d+/)?.[0];return !dpStore.tasks.some(t=>t.source.key==='project:'+end.slice(0,4)+':'+model&&t.state==='已验收'&&t.closedDate<=end)}).map(r=>{if(r.kind!=='block')return r;const model=r.subject.match(/(?:CL|KT|EN|HC)-\d+/)?.[0],p=ps.find(p=>p.model===model);return p?{...r,department:p.dept,stage:p.stage,problem:p.cause+'；影响后续节点及计划上线 '+p.plan+'。',level:p.status==='红灯'?'高危':'中风险',source:'项目统一台账 · '+p.model}:r})};
const dpOriginalProducts=productRows;
function dpNewGrade(p,period=periodFor()){
 const days=Math.max(1,Math.min(p.days,Math.floor((Date.parse(bounds(period).cutoff)-Date.parse(bounds(period).start))/86400000)+1));
 const monthly=p.sales/days*30,goal=dpStore.newTargets[p.chain],salesMet=monthly>=goal,profitMet=p.profit>=dpStore.marginTarget;
 return salesMet?(profitMet?'A':'B'):(profitMet?'C':'D');
}
productRows=function(isNew){return dpOriginalProducts(isNew).map(r=>({...r,grade:isNew?dpNewGrade(r):r.grade,state:dpStore.productStates[periodFor().year+':'+(isNew?'new':'matrix')+':'+(r.spuId||r.model)]?.state||r.state}))};
function dpProjects(){return projects().filter(dpInScope)}
function dpSalesCells(){return salesCrossData().flatMap((row,c)=>row.map((r,b)=>({...r,chain:c,brandIndex:b}))).filter(dpInScope)}
function dpSalesRows(dim='chain',brand='all'){
 const cells=dpSalesCells().filter(r=>pfIncludes(brand,r.brandIndex));
 if(dim==='channel'){
  return salesChannelData(sumSalesCells(cells,'当前范围'),cells).map((row,index)=>({...row,index}));
 }
 const labels=dim==='brand'?brands:chains;
 return labels.map((name,index)=>{const records=cells.filter(r=>dim==='brand'?r.brandIndex===index:r.chain===index);return{...sumSalesCells(records,name),index}}).filter(r=>dim==='brand'?(pfIncludes(brand,r.index)):(dpState.chain==='all'||r.index===+dpState.chain));
}
function dpLifeRows(stage,p=periodFor()){
 return lifeChainRows(stage,p).map((r,i)=>({...r,chain:i})).filter(dpInScope);
}
function dpLifeChannels(stage,p=periodFor()){
 const rows=dpChannelNames.map((name,index)=>({name,index,target:0,actual:0,yearTarget:0,yearActual:0})),b=bounds(p),ms=new Set(months(p)),ys=new Set(months(p,true));
 for(let month=1;month<=12;month++)for(let platform=0;platform<channels.length;platform++){
  const facts=lifePlatformChainMonth(stage,platform,month,p).filter((_,chain)=>dpState.chain==='all'||chain===+dpState.chain),row=rows[platform];
  const target=targetSum(facts.map(fact=>fact.target)),actual=targetSum(facts.map(fact=>fact.actual));
  row.yearTarget+=target;if(month>=b.first&&month<=b.last)row.target+=target;if(ms.has(month))row.actual+=actual;if(ys.has(month))row.yearActual+=actual;
 }
 return rows;
}
function dpLifeRecords(stage,scope,p,channel='all',chain='all'){
 return lifecycleCompletionProducts(stage,scope,p).filter(row=>dpInScope(row)&&(chain==='all'||row.chain===+chain)&&(channel==='all'||row.channel===+channel));
}
function dpDocuments(p=periodFor()){
 const rows=[];for(const month of months(p))for(let person=0;person<people.length;person++)for(let type=0;type<8;type++){
  const end=Math.min(new Date(Date.UTC(p.year,month,0)).getUTCDate(),month===+bounds(p).cutoff.slice(5,7)?+bounds(p).cutoff.slice(8):31),slots=type===0?Array.from({length:end},(_,i)=>i+1).filter(d=>![0,6].includes(new Date(Date.UTC(p.year,month-1,d)).getUTCDay())):type===1?[5,12,19,26].filter(d=>d<=end):[Math.min(end,10+type)];
  for(const day of slots){const date=`${p.year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,seed=person*7+month*3+day+type*2,state=seed%17===0?'缺交':seed%11===0?'迟交':'按期提交',complete=state!=='缺交'&&seed%13!==0,approved=complete&&seed%9!==0;rows.push({id:`DOC-${p.year}-${month}-${type}-${person}-${day}`,type,chain:person%4,person,owner:people[person],date,state,complete,approved,title:dpDocNames[type]+' · '+names[person%4][type%6],issue:state==='缺交'?'应交文档缺失':!complete?'关键结论与附件不完整':!approved?'验收记录待补齐':state==='迟交'?'提交晚于约定时间':'无偏差'})}
 }return rows.filter(dpInScope).map(r=>{const closed=dpClosed('process:'+r.id,p);return closed?{...r,originalIssue:r.issue,originalComplete:r.complete,complete:true,approved:true,issue:'无偏差',verifiedTask:closed.id}:r}).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
function dpDeviations(){return dpDocuments().filter(r=>r.issue!=='无偏差'||r.originalIssue).map(r=>({key:'process:'+r.id,name:r.title,model:r.id,chain:r.chain,owner:r.owner,type:r.state==='缺交'?'文档缺失':!(r.originalComplete??r.complete)?'资料不完整':!(r.verifiedTask?false:r.approved)?'闭环待验证':'交付延误',cause:r.originalIssue||r.issue,level:!r.approved&&r.complete?'高危':'中风险',metric:r.verifiedTask?'已验收':r.state==='缺交'?'缺交':!r.complete?'缺资料':!r.approved?'待核验':'迟交',dept:dpDepartmentName(),date:r.date,doc:r,kind:'process'}))}
function dpProjectSource(p){return{key:'project:'+periodFor().year+':'+(p.sourceKey||p.model),kind:'project',id:p.id,name:p.name,model:p.model,chain:p.chain,owner:p.owner,dept:p.dept,cause:p.cause,stage:p.stage,level:p.status==='红灯'?'高危':'中风险',metric:p.delay?p.delay+' 天':p.status,date:p.plan,project:p}}
function dpRiskLists(includeClosed=false){
 const ps=dpProjects().filter(p=>p.status!=='绿灯'),project=ps.filter(p=>p.status==='红灯').sort((a,b)=>b.delay-a.delay).map(dpProjectSource),quality=riskRows(0).filter(dpInScope).map(r=>({...r,key:'quality:'+periodFor().year+':'+(r.spuId||r.model),kind:'quality',level:'高危',cause:r.desc,metric:r.value,dept:'品质部',date:bounds().cutoff}));
 const channel=dpSalesRows('channel').filter(r=>r.target&&r.sale/r.target<.9).map(r=>({key:'channel:'+periodKey()+':'+dpState.chain+':'+r.index,kind:'channel',name:r.name+'销售偏差',model:'CH-'+r.index,chain:dpState.chain==='all'?0:+dpState.chain,owner:dpState.chain==='all'?'林悦':aiOwners[+dpState.chain],dept:dpDepartmentName(),level:r.sale/r.target<.8?'高危':'中风险',cause:'销售达成 '+dpPct(r.sale,r.target)+'，请核对产品供给、渠道转化与投放效率。',metric:fmt((r.sale/r.target-1)*100,1)+'%',sale:r,date:bounds().cutoff}));
 const list=[ps.filter(p=>p.type.includes('上品')).sort((a,b)=>b.delay-a.delay).map(dpProjectSource),ps.filter(p=>p.type.includes('立项')).sort((a,b)=>b.delay-a.delay).map(dpProjectSource),project,quality,channel,dpDeviations().sort((a,b)=>(b.level==='高危')-(a.level==='高危'))];
 return list.map(rows=>includeClosed?rows:rows.filter(r=>!dpClosed(r.key)));
}
function dpUniqueRisks(){return [...new Map(dpRiskLists().flat().map(r=>[r.key,r])).values()]}
function dpScoreRows(){
 const docs=dpDocuments(),salesRows=dpSalesRows(),rows=people.map((name,i)=>{const chain=i%4;if(dpState.chain!=='all'&&chain!==+dpState.chain)return null;const personal=docs.filter(r=>r.person===i),salesRow=salesRows.find(r=>r.index===chain),life=lifeSumRows([0,1,2,3].flatMap(s=>dpLifeRows(s).filter(r=>r.chain===chain))),rate=salesRate(salesRow),newRows=productRows(true).filter(r=>r.chain===chain),own=dpProjects().filter(r=>r.owner===name),falseClose=personal.some(r=>r.type===2&&r.complete&&!r.approved),factors=[rate<80?0:Math.min(rate/100,1),(()=>{const n=dpNewMetrics(String(chain));return n.planned?n.sold/n.planned:0})(),life.target?Math.min(1,life.actual/life.target):0,Math.min(1,salesRow.profit/dpStore.marginTarget),personal.length?personal.reduce((n,r)=>n+(r.state==='按期提交'?1:r.state==='迟交'?.5:0),0)/personal.length:0,falseClose?0:own.length?own.filter(r=>r.status==='绿灯').length/own.length:1,Math.max(0,1-personal.filter(r=>!r.complete).length*.02),personal.length?personal.filter(r=>r.complete).length/personal.length:0];const scores=factors.map((f,j)=>Math.max(0,f*dpStore.weights[j])),override=dpStore.overrides[periodKey()+':'+name],result=dpSum(scores.slice(0,4).map(v=>({v})),'v'),process=dpSum(scores.slice(4).map(v=>({v})),'v');return{name,chain,role:i<4?'品类链主':'产品专员',factors,scores,result,process,total:override?.score??result+process,override,docs:personal,issues:personal.filter(r=>r.issue!=='无偏差').length}}).filter(Boolean).sort((a,b)=>b.total-a.total);
 return rows.map((r,i)=>({...r,improve:i>=Math.floor(rows.length*.8)}));
}
function dpPlan(source){
 const kind=source.kind;
 return kind==='project'?`1. ${source.dept}复核「${source.stage}」卡点：${source.cause}，形成问题清单及影响范围。\n2. ${source.owner}牵头确认修复方案、所需资源、交付物和节点日期；跨部门资源由对应部门负责人确认。\n3. 同步更新项目台账及后续依赖排期，按日跟进风险变化。\n4. 提交测试报告、评审结论和节点放行记录，由${dpDepartmentName()}负责人验证后解除卡点。`:kind==='quality'?`1. 核对退货与差评订单，按型号、批次、渠道分析原因，必要时暂停异常批次。\n2. 品质部与链主复现问题，输出纠正措施、测试计划和受影响库存清单。\n3. 小批量验证后再扩大修复，跟踪退货率及问题复发情况。\n4. 提交复测报告、整改前后对比、验收结论，验证通过后解除风险。`:kind==='channel'?`1. 分解渠道销售目标差额，核对价格、流量、转化、供货四类原因。\n2. 对照立项及上品计划确定供给缺口，负责人确认资源与上线排期。\n3. 小范围试行内容、组合销售或定价优化，控制预算并每日跟踪。\n4. 提交前后对比与复盘；任务验收后继续跟踪实际销售达成，不直接改写经营数据。`:kind==='process'?`1. 补齐「${source.name}」的缺失内容：${source.cause}。\n2. 责任人提交原始交付物、文档版本和对应项目关联。\n3. 复核完成条件及审阅记录，未验证的问题保持待办。\n4. 由${dpDepartmentName()}负责人验收并留存依据，纳入人员过程评分复盘。`:`1. 确认${source.name}的${source.cause||'经营改善'}问题与现状。\n2. 与品类链主确认可执行方案、责任人、交付时间及资源边界。\n3. 跟进策略试点效果并提交交付物和量化对比。\n4. 由独立验收人复核效果，未达标退回整改；经营指标仍以业务台账为准。`;
}
function dpTaskFor(source){return dpStore.tasks.find(t=>t.source.key===source.key&&t.state!=='已验收')}