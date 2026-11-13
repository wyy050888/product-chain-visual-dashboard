// 工单按互斥问题类型生成样例，数量可跨日期、平台累加；总数不变。
function qrbContactSplit(total,seed){
 const qualityContacts=Math.round(total*(.55+(Math.abs(seed)%5)*.05));
 return {qualityContacts,experienceContacts:total-qualityContacts};
}
function qrbContactDecision(current,previous,metrics={}){
 const growth=periodRateGrowth(current,previous);
 return {growth,hit:brcMatch('quality.contactDelta',growth,{...metrics,contactDelta:growth})};
}
