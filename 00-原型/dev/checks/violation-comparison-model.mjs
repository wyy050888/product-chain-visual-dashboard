import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

// 同一组次数事实验证榜单、产品详情、店铺详情；保留本期次数与金额下的次数，环比展示次数差。
export function violationComparisonModel(){
 const range={start:'2026-10-01',end:'2026-10-10',previousStart:'2026-09-21',previousEnd:'2026-09-30'};
 const ctx=businessRuleContext({fmt:String,pfMoneyYuan:n=>n+'元',upPercent:n=>Number.isFinite(n)?n.toFixed(1)+'%':'—',
  riskRange:()=>range,upIdentity:r=>r,upProduct:r=>r,
  rpField:(key,name,value,tone='',hint='',target='')=>({key,name,value,tone,hint,target}),
  sdEventNames:{fine:'平台罚款',frozen:'资金冻结',offShelf:'链接下架',drop:'链接掉权',limited:'店铺限单'}});
 for(const file of ['risk-presentation/01-quality.js','risk-presentation/01-shop.js','unified-product/05-quality-view.js','shop-detail/02-violations.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 Object.assign(ctx,{rpShopCoreFacts:()=>({products:[],available:true}),rpShopProblemField:()=>({key:'problemSpus',targetTone:'rp-quality-gray'}),rpShopScoreTone:()=>'',rpShopScoreHint:()=>'',rpPddLinkGroups:()=>({all:[],red:[],yellow:[],unknown:[]})});
 const types=['罚款','资金冻结','下架','掉权'];
 const events=count=>types.flatMap(type=>Array.from({length:count},()=>({type,date:range.start,reasonType:'quality',amount:0})));
 for(const [now,before,tone] of [[111,100,'red'],[110,100,'red'],[105,100,'red'],[100,100,'gray'],[95,100,'green'],[90,100,'green'],[89,100,'green'],[0,0,'gray'],[1,0,'red']]){
  const facts=count=>({gsv:111,netSales:111,violations:count*4,offShelf:count,drop:count,limited:count,fine:0,frozen:0,fineCount:count,frozenCount:count});
  const priorFacts={...facts(before),gsv:100,netSales:100};
  ctx.rpShopPeriodFacts=(_shop,start)=>start===range.start?facts(now):priorFacts;
  ctx.qrObservation=()=>({monthly:{events:events(before)}});
  const product={product:{},quality:[{platform:'拼多多',monthly:{events:events(now)}}],previousStart:range.previousStart,previousEnd:range.previousEnd};
  const productFields=ctx.upViolationMetrics(product,false,'all');
  for(const key of ['violations','offShelf','drop'])assert.equal(productFields.find(f=>f.key===key).targetTone,'rp-quality-'+tone,'产品详情 '+key+' '+now+'/'+before);
  for(const field of productFields.filter(f=>['fine','frozen'].includes(f.key))){assert.equal(field.targetTone,'rp-quality-gray');assert.equal(field.target,now+'次','金额下仍只显示次数')}
  for(const channel of ['抖音','拼多多']){
   const shop={channel,id:1},state={...range};
   for(const fields of [ctx.rpShopFields(shop),ctx.sdViolationMetrics({shop},state)]){
    for(const field of fields.filter(f=>['violations','offShelf','drop','limited'].includes(f.key))){
     assert.equal(field.targetTone,'rp-quality-'+tone,channel+' '+field.key+' '+now+'/'+before);
     const delta=(now-before)*(field.key==='violations'?4:1);
     assert.equal(field.target,delta===0?'环比 持平':'环比 '+(delta>0?'+':'')+delta+'次','次数差及单位');
     assert.doesNotMatch(field.target,/%|↑|↓/);
    }
   }
   const riskFields=ctx.rpShopFields(shop);
   for(const key of ['gsv','netSales'])assert.equal(riskFields.find(f=>f.key===key).targetTone,'rp-quality-green','经营指标仍涨绿降红');
  }
 }
 assert.match(ctx.rpCountComparisonRuleText(),/涨红降绿/);
}
