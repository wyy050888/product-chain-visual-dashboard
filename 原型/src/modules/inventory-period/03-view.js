function ipGroups(ledger,dimension){return(dimension==='chain'?chains:brands).map((name,index)=>({name,index,...inventoryProductSum(ledger.filter(r=>dimension==='chain'?r.chain===index:r.brand===index))}))}
function ipSummaryCards(total,klass='ipd-metrics'){
 const fields=[['num',fmt(total.num)+' 件'],['amount',fmt(total.amountCents/100,2)+' 万元'],['turn',ipIndicator('turn',total.turn)],['stale',fmt(total.staleCents/100,2)+' 万元'],['delivery',ipIndicator('delivery',total.delivery)],['refurb',ipIndicator('refurb',total.refurbDelay)]];
 return `<div class="${klass}">${fields.map(([key,value])=>`<div><small>${ipHeading(key)}</small><strong>${value}</strong></div>`).join('')}</div>`;
}
function ipGroupTable(ledger,dimension){
 const rows=ipGroups(ledger,dimension),label=dimension==='chain'?'类目':'品牌';
 const headers=[label,ipHeading('num','库存数（件）'),ipHeading('amount','库存金额（万元）'),ipHeading('turn'),ipHeading('stale','呆滞金额（万元）'),ipHeading('delivery'),ipHeading('refurb'),'操作'];
 return `<section class="ip-group-panel" data-ip-dimension="${dimension}"><h3>${label}库存</h3><div class="ip-group-scroll">${table(headers,rows.map(r=>[esc(r.name),fmt(r.num),fmt(r.amountCents/100,2),ipIndicator('turn',r.turn),fmt(r.staleCents/100,2),ipIndicator('delivery',r.delivery),ipIndicator('refurb',r.refurbDelay),`<button type="button" class="link" data-ip-stock="${r.index}" data-ip-dimension="${dimension}">查看明细</button>`]))}</div></section>`;
}
renderInventory=bindRender('inventory',function(){
 const ledger=inventoryProductLedger(),total=inventoryProductSum(ledger);
 $('#inventorymetrics').innerHTML=ipSummaryCards(total,'ip-overview');
 $('#inventorytable').innerHTML=ipGroupTable(ledger,'chain')+ipGroupTable(ledger,'brand');
});
document.addEventListener('click',event=>{
 const button=event.target.closest('#inventory [data-ip-stock]');if(!button)return;
 // 每个入口显式携带维度，不依赖上一次打开的表格。
 const prior=invView;invView=button.dataset.ipDimension;try{stockDetail(+button.dataset.ipStock)}finally{invView=prior}
});
window.inventoryControlAudit=()=>withPeriod('inventory',()=>{const records=inventoryProductLedger();return {period:periodFor(),snapshot:DATA_CUTOFF,total:inventoryProductSum(records),records,chain:ipGroups(records,'chain'),brand:ipGroups(records,'brand')}});
