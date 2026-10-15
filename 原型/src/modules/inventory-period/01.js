

// Inventory balances retain the original ledger; service metrics share dated facts.
const ipThresholds={monthlyTurn:2,monthlyDelivery:90,refurbDelay:0};
function ipPeriod(){const p=periodFor(),b=bounds(p),monthStart=b.cutoff.slice(0,7)+'-01';const factor=months(p).reduce((n,m)=>{const last=new Date(Date.UTC(p.year,m,0)).getUTCDate(),elapsed=`${p.year}-${String(m).padStart(2,'0')}`===b.cutoff.slice(0,7)?+b.cutoff.slice(8):last;return n+elapsed/last},0);return{...b,monthStart,monthLabel:b.cutoff.slice(0,7),factor,unit:{month:'月',quarter:'季',year:'年'}[p.mode]}}
const ipBaseLedger=inventoryProductLedger;
inventoryProductLedger=function(){
 const scope=ipPeriod(),rows=ipBaseLedger(),key='inventory-month-service',previous=localPeriods[key];let monthly=[];
 if(scope.start<=scope.cutoff){localPeriods[key]={year:+scope.cutoff.slice(0,4),mode:'month',value:+scope.cutoff.slice(5,7)};try{monthly=withPeriod(key,()=>ipBaseLedger())}finally{if(previous)localPeriods[key]=previous;else delete localPeriods[key]}}
 const monthlyMap=new Map(monthly.map(r=>[r.id,r]));
 return rows.map((r,i)=>{const month=monthlyMap.get(r.id),active=scope.start<=scope.cutoff&&r.refDue>0,delay=active?(r.brand===1?0:(i+r.chain)%4===0?0:1+(i*3+r.brand)%12):null,refurbDue=active?shiftDate(scope.cutoff,delay?-delay:2):null;
  return{...r,monthOn:month?.on||0,monthDue:month?.due||0,monthlyDelivery:month?.due?month.on/month.due*100:null,refurbDue,refurbCompleted:null,refurbDelay:active?Math.max(0,aiFlowDayDiff(refurbDue,scope.cutoff)):null,refurbTaskId:active?'REF-'+r.id:null};
 });
};
const ipBaseSum=inventoryProductSum;
inventoryProductSum=function(rows){const base=ipBaseSum(rows),monthOn=targetSum(rows.map(r=>r.monthOn||0)),monthDue=targetSum(rows.map(r=>r.monthDue||0)),delays=rows.map(r=>r.refurbDelay).filter(Number.isFinite);return{...base,monthOn,monthDue,monthlyDelivery:monthDue?monthOn/monthDue*100:null,refurbDelay:delays.length?Math.max(...delays):null}};
function ipSignal(kind,value){if(value===null||!Number.isFinite(value))return'none';const threshold=ipThresholds[kind==='turn'?'monthlyTurn':kind==='delivery'?'monthlyDelivery':'refurbDelay'];if(threshold===null)return'pending';if(kind==='turn'){const factor=ipPeriod().factor;return factor>0?(value/factor>=ipThresholds.monthlyTurn?'green':'red'):'none'}return kind==='delivery'?(value>=ipThresholds.monthlyDelivery?'green':'red'):(value<=ipThresholds.refurbDelay?'green':'red')}
function ipIndicator(kind,value){const tone=ipSignal(kind,value),unit=kind==='turn'?' 次/'+ipPeriod().unit:kind==='delivery'?'%':' 天',digits=kind==='turn'?2:kind==='delivery'?1:0,rule=kind==='turn'?'按已统计月数折算月均，≥'+ipThresholds.monthlyTurn+' 次为绿灯':kind==='delivery'?'所选周期按期交付 / 所选周期到期交付；≥'+ipThresholds.monthlyDelivery+'% 为绿灯':'未完成翻新任务的最大延期；0 天为绿灯';return tone==='none'?'<span class="muted" title="当前无可计算数据">—</span>':`<span class="ip-signal ${tone}" title="${tone==='pending'?'红绿灯阈值待提供':rule}" data-ip-signal="${kind}" data-value="${value}"><b>${fmt(value,digits)}${unit}</b><small>● ${tone==='pending'?'待配置':tone==='green'?'绿灯':'红灯'}</small></span>`}
function ipRulesNote(){const b=ipPeriod();return `<details class="ip-rules"><summary>指标口径与红绿灯</summary><p>库存周转率＝周期出库成本 ÷ 周期平均库存成本，折算月均≥${ipThresholds.monthlyTurn}次为绿灯。${ipDeliveryLabel()}＝所选周期按期交付任务数 ÷ 所选周期到期任务数，≥${ipThresholds.monthlyDelivery}%为绿灯，其余红灯。</p><p>交付统计 ${b.start} — ${b.cutoff}；库存截至 ${b.cutoff}。按任务数加权，无到期任务显示“—”。阈值为演示配置。</p></details>`}

function ipGroups(ledger,dimension){return(dimension==='chain'?chains:brands).map((name,index)=>({name,index,...inventoryProductSum(ledger.filter(r=>dimension==='chain'?r.chain===index:r.brand===index))}))}
function ipDeliveryLabel(){return {day:'期间交付及时率',month:'月交付及时率',quarter:'季交付及时率',year:'年度交付及时率'}[periodFor().mode]}
function ipSummaryCards(total,klass='ipd-metrics'){return`<div class="${klass}">${[['库存数',fmt(total.num)+' 件'],['库存总金额',fmt(total.amountCents/100,2)+' 万元'],['库存周转率',ipIndicator('turn',total.turn)],['呆滞库存金额',fmt(total.staleCents/100,2)+' 万元'],[ipDeliveryLabel(),ipIndicator('delivery',total.delivery)]].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('')}</div>`}
renderInventory=bindRender('inventory',function(){const ledger=inventoryProductLedger(),total=inventoryProductSum(ledger),rows=ipGroups(ledger,invView);$('#inventorymetrics').innerHTML=ipSummaryCards(total,'ip-overview');$('#inventorytable').innerHTML=table([invView==='chain'?'品类':'品牌','库存数（件）','库存总金额','库存周转率','呆滞库存金额',ipDeliveryLabel(),'操作'],rows.map(r=>[r.name,fmt(r.num),pfMoneyYuan(r.amountCents*100),ipIndicator('turn',r.turn),pfMoneyYuan(r.staleCents*100),ipIndicator('delivery',r.delivery),`<button class="link" data-stock="${r.index}">查看明细</button>`]))+ipRulesNote();$$('#inventorytabs [data-inv]').forEach(b=>{if(b.dataset.inv==='chain')b.textContent='品类库存视图'})});


function ipSignalLabel(kind,value){return{green:'绿灯',red:'红灯',none:'无数据',pending:'待配置'}[ipSignal(kind,value)]}