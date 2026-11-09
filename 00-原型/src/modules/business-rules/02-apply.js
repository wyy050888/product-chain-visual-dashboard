// 只同步已有规则对象和派生缓存；保存不改经营、库存、任务或导入目标数据。
const brcOriginalRuleText={pool:nspPoolRule,success:metricDefinitions['新品销售成功率'],delivery:metricDefinitions['新品上线及时率']};
function brcApply(render=true){
 Object.assign(config,{green:brcNumber('lights.green'),yellow:brcNumber('lights.yellow'),delay:brcNumber('lights.projectDelay')});
 Object.assign(kpmGradeRules,brcGradeRules('recent30'));
 for(const [limits,prefix] of [[rpShortageLimits,'stock.shortage'],[rpStagnantLimits,'stock.warning']])for(const key of Object.keys(limits))limits[key]=brcNumber(prefix+'.'+key);

 Object.assign(rpReturnDeviationLimits,{return:brcNumber('lights.return'),received:brcNumber('lights.received')});
 for(const mode of ['month','quarter','year'])ipThresholds.turn[mode]=[brcNumber('lights.turn.'+mode+'.green'),brcNumber('lights.turn.'+mode+'.yellow')];
 ipThresholds.delivery=[brcNumber('lights.delivery.green'),brcNumber('lights.delivery.yellow')];
 ipMetricRules.turn.groups=['month','quarter','year'].map((mode,i)=>[['月度','季度','年度'][i],...ipThresholds.turn[mode]]);
 ipMetricRules.delivery.groups=[['月度',...ipThresholds.delivery]];
 irReasonLabels.splice(0,5,'当月下架＋冻结'+brcDescribe('stock.violations'),'利润率'+brcDescribe('stock.profit'),'总退'+brcDescribe('stock.return'),'已收退'+brcDescribe('stock.received'),'滞销品');
 upAiSummaryPrompt=upAiRulePrompt();
 const exit=shiftDate('2026-09-30',brcNumber('new.exitDays')),dateText=date=>Number(date.slice(0,4))+'年'+Number(date.slice(5,7))+'月'+Number(date.slice(8))+'日';
 nspPoolRule=brcOriginalRuleText.pool.replace('＋30个自然日','＋'+brcNumber('new.exitDays')+'个自然日').replace('2026年10月30日',dateText(exit));
 const descriptions={
  '新品销售成功率':()=>brcOriginalRuleText.success.replace('≥66%','≥'+brcNumber('new.successRate')+'%'),
  '新品上线及时率':()=>brcOriginalRuleText.delivery.replaceAll('＋15天','＋'+brcNumber('new.deliveryDays')+'天').replace('例如计划10月1日完成，10月16日完成计入，10月17日完成不计入','例如计划2026年10月1日完成，'+dateText(shiftDate('2026-10-01',brcNumber('new.deliveryDays')))+'完成计入，'+dateText(shiftDate('2026-10-01',brcNumber('new.deliveryDays')+1))+'完成不计入')
 };
 for(const [key,get] of Object.entries(descriptions))Object.defineProperty(metricDefinitions,key,{configurable:true,enumerable:true,get});
 rpLossMarginHint='净利润率＝所选期间利润率－'+brcNumber('finance.deduction')+'%。';
 rpGradeCache.clear();upRuleRevision++;
 // 规则更新只清理派生缓存；原始逐日经营记录和成本缓存不受阈值影响。
 if(render){rpLossStocks.clear();qrbCache.clear();rrCached=null;rpStockEventCache.clear();document.querySelector('#new .nsp-pool-help')?.remove();renderAll();window.dispatchEvent(new Event('business-rules-updated'));}
}
brcApply(false);
