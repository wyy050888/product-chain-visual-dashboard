// 汇报演示资料：数量、金额沿用页面台账，单据和工作记录为只读模拟，不作为真实凭证。
function upAiDemoContext(m,state){
 const endDate=new Date(state.end+'T00:00:00Z'),month=state.end.slice(0,7);
 const last=new Date(Date.UTC(endDate.getUTCFullYear(),endDate.getUTCMonth()+1,0)).toISOString().slice(0,10);
 const ratingMonth=state.end===last?month:shiftDate(month+'-01',-1).slice(0,7);
 const ratingEnd=new Date(Date.UTC(+ratingMonth.slice(0,4),+ratingMonth.slice(5,7),0)).toISOString().slice(0,10);
 const monthly=upSummary(m.product,ratingMonth+'-01',ratingEnd,'all');
 const stock=upStockModel(m,state),sku=stock?.rows[0]?.code||m.product.spuCode+'-SKU01';
 const seed=upIdentity(m.product).sourceRow,key=String(seed).padStart(3,'0')+'-'+state.end.replaceAll('-','').slice(2);
 const netUnits=Math.max(0,monthly.sales-monthly.returned),unitCost=netUnits>0?Math.round(monthly.costCents/netUnits):0;
 const mold=Math.round(unitCost*.015),factory=Math.round(unitCost*.78),brand=Math.round(unitCost*.07),refurb=Math.round(unitCost*.03),management=unitCost-factory-brand-refurb;
 const discount=Math.round(factory*.03),warehouse=m.stock?.warehouse||0,pipeline=m.stock?.undelivered||0;
 const recent=upSummary(m.product,shiftDate(state.end,-14),state.end,'all'),demand=Math.max(0,Math.ceil((recent.sales-recent.returned)/15*30));
 const gap=Math.max(0,demand-warehouse-pipeline),extra=seed%2===0;
 const offerQty=extra?Math.max(300,Math.ceil(demand*1.5/100)*100):Math.max(100,Math.ceil(gap/100)*100);
 const projectedMargin=monthly.gsvCents>0?monthly.profitRate+discount*netUnits/monthly.gsvCents*100:null;
 const cycle=14+seed%3*7,scope='成本与单据为方案演示，管理费及翻新分摊仅为本演示SKU的确认值，不扩展为全局规则';
 return {isDemo:true,sku,supplier:'演示供方'+String(m.product.chain+1)+'-'+String(seed%7+1),rating:{month:ratingMonth,start:ratingMonth+'-01',end:ratingEnd,facts:monthly},
  cost:{unitCost,factory,brandSupply:factory+brand,companySupply:factory+brand+refurb,channel:unitCost,mold,base:factory-mold,brand,refurb,management,discount,projectedMargin},
  supply:{warehouse,pipeline,demand,gap,offerQty,extra,cycle},
  ids:{request:'PR-'+key,purchase:'PO-'+key,schedule:'PP-'+key,inspection:'QC-'+key,cost:'CF-'+key,report:'RB-'+key,meeting:'MT-'+key,task:'T-'+key,risk:'R-'+key},
  records:{cost:'模拟财务确认：单台四级供价已核对，降价全额传导、其他成本及销量不变时试算利润；尚未批准报价。',
   report:'模拟采购日报：供应商提出工厂供价下调3%，'+(extra?'需新增采购'+offerQty+'台。':'可适用于现有订单，无追加采购条件。')+'尚待书面报价及审批。',
   meeting:'模拟经营会议：未来30天需求计划'+demand+'台，需按到货日期复核缺口；质量事项与复购审批分别跟踪。',
   inspection:'模拟品质周报：抽检未发现一致性技术异常；用户反馈涉及使用指引，原因验证任务进行中，不能认定设计缺陷。',
   task:'模拟研发周报：建议先改善说明指引，费用与验证结果待评审，暂未批准整机改版。'},scope};
}
