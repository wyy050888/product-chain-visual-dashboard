// 所有SPU入口统一打开同一详情；店铺和项目继续使用独立业务抽屉。
function upEntry(record,module,tab='operating',platform='all',extra={}) {
  const p=upIdentity(record); if(!p){toast('该记录缺少有效SPU关联');return}
  const ranking=module==='risk'&&!$('#overlay').hidden&&$('#dialogbody').hasAttribute('data-risk-ranking-kind')?$('#dialogbody').dataset.rankingPeriod:null;
  const period=ranking?JSON.parse(ranking):periodFor(activeModule||module);
  const range=upWindow(period);
  return upOpenDetail({spuId:p.spuId,...range,period:{...period},tab,platform,module,...extra});
}
function upProductRun(module,run){return dxContinue(module,()=>ppContinue(module,()=>withPeriod(module,run)))}
productDetail=function(isNew,id){return upProductRun(isNew?'new':'matrix',()=>upEntry(productRows(isNew).find(p=>p.id===+id),isNew?'new':'matrix'))};
openNewAssessment=function(id){return productDetail(true,id)};
nsOpenDetail=function(id){return upProductRun('new',()=>upEntry(productRows(true).find(p=>p.id===+id),'new','operating',nsPlatform))};
openMatrixDiagnosis=function(id){return productDetail(false,id)};
dpProductDetail=function(key){const [module]=key.split(':');const p=dpProductCache.get(key);if(p)return dpWith(module,()=>upEntry(p,module))};
openNewProductTrends=function(id,fromAll=false,module='new'){return upProductRun(module,()=>upEntry(productRows(module==='new').find(p=>p.id===+id),module))};
qrOpenDetail=function(key){return rpWithBoardPeriod(0,()=>{
  const [id,ci]=key.split(':').map(Number),product=qrCatalog().find(p=>p.id===id);
  return upEntry(product,'risk','quality',qrPlatforms[ci]||'all');
},rpDetailPeriod(0))};
const upPreviousRiskDetail=riskDetail;
riskDetail=function(k,id) {
  if(k===1)return sdOpenDetail(id);
  if(![0,2,3,4,6].includes(k))return upPreviousRiskDetail(k,id);
  const period=rpDetailPeriod(k);
  return drawerWithPeriod(period,()=>{
    const row=(k===0?qrCatalog():k===6?rrAll():riskRows(k)).find(r=>r.id===+id);if(!row)return;
    return upEntry(row,'risk',k===0||k===6?'quality':k===3||k===4?'stock':'operating',k===6?row.channel:k===0?qrState.platform:'all');
  });
};
pnrDetail=function(r,context=r?.context){if(r)return upEntry(r,'new','quality',r.channel,{start:context.start,end:context.end})};
const upOriginalProcurementDetail=pbDetails;
pbDetails=function(record){
  if(!upIdentity(record)||!['quality','new-return','product'].includes(record.kind))return upOriginalProcurementDetail(record);
  const context=record.context||upWindow(pbPeriod('risk'));
  return upEntry(record,'risk','quality',qrPlatforms.includes(record.channel)?record.channel:'all',{start:context.start,end:context.end});
};
const upPreviousDpRisk=dpOpenRisk;
dpOpenRisk=function(source) {
  if(source.kind==='project'||!upIdentity(source))return upPreviousDpRisk(source);
  return upEntry(source,'risk',source.kind==='quality'?'quality':'operating',qrPlatforms.includes(source.channel)?source.channel:'all',source.period?upWindow(source.period):{});
};
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-up-product]');if(!button)return;
  const p=upSpus.get(button.dataset.upProduct);if(!p)return;
  const parent=button.closest('[data-up-range-start]');
  upEntry(p,'inventory','stock','all',parent?{start:parent.dataset.upRangeStart,end:parent.dataset.upRangeEnd}:{});
});
// 旧趋势调用者的比率同样按统一GSV基数，不取日百分比的平均。
const upPreviousTrendTotals=newTrendTotals;
newTrendTotals=function(series){
  const result=upPreviousTrendTotals(series),points=series.flatMap(s=>s.points);
  if(points.every(p=>Number.isInteger(p.gsvCents))){const net=points.reduce((n,p)=>n+p.gsvCents,0);result.margin=net?result.profitCents/net*100:null}
  return result;
};

// 配置改变后返回榜单，复用原填表函数并保留原分页、筛选和滚动。
const upOriginalQualityList=qrOpenList;
qrOpenList=function(...args){const result=upOriginalQualityList(...args);const host=$('#qr-list-table');if(host)host.dataset.upRevision=upRuleRevision;return result};
const upOriginalReturn=drawerReturn;
drawerReturn=function(...args){
  const returned=upOriginalReturn(...args),host=$('#qr-list-table');
  if(returned&&host?.upRefresh&&Number(host.dataset.upRevision)!==upRuleRevision){host.upRefresh();host.dataset.upRevision=upRuleRevision}
  return returned;
};

// 初始渲染由 startup/02-render.js 在全部展示适配器登记后统一执行。
