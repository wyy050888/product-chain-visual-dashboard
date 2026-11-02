// 产品详情品质与库存视图由 unified-product 直接维护；此处仅适配店铺详情。
const rpDetailFixedFacts=rfFacts;
rfFacts=function(k,r){if(k!==1)return rpDetailFixedFacts(k,r);return rpFields(k,r,rpCardKeys[1]).map(f=>({name:f.name,value:f.value,hit:f.tone==='red',rule:f.hint}))};
// 表现分数不再统一套用旧的5分制；拼多多考核沿用现有专属模块。
const rpPreviousRiskDetail=riskDetail;
riskDetail=function(k,id){const result=rpPreviousRiskDetail(k,id);if(k===1){const r=withPeriod('risk',()=>brShopRows().find(s=>s.id===+id));if(r){const metrics=$('.risk-detail-metrics');if(metrics){metrics.innerHTML=withPeriod('risk',()=>rpFields(1,r,rpCardKeys[1]).map(f=>`<div><small>${netSalesLabel(f.name,f.key)}</small><strong class="${f.tone}">${esc(f.value)}</strong></div>`).join(''));metrics.classList.add('rp-compact-metrics')}}}return result};



