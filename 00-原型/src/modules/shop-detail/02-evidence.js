// 使用本次已保存的同店事实，不在点击依据时重新读取。
function sdEvidenceSnapshot(m,a){
 const range=a.range.start+' — '+a.range.end,c=m.current,r=m.recent||c,p=m.previous;
 const source=(name,period,content,extra={})=>({name,period,content,...extra});
 const business=source('本店业绩（原型数据）',range,'平台：'+m.shop.channel+'；店铺ID：'+m.shop.shopId+'；GSV '+pfMoneyYuan(c.gsv)+'；去退后销量 '+formatSalesQuantity(c.netSales)+'。');
 const comparison=source('本店近期对比（原型数据）',(r.start||'未提供')+' — '+(r.end||a.range.end),'近期GSV '+pfMoneyYuan(r.gsv)+'，去退后销量 '+formatSalesQuantity(r.netSales)+'；前期 '+(p.start||'未提供')+' — '+(p.end||'未提供')+'，GSV '+(Number.isFinite(p.gsv)?pfMoneyYuan(p.gsv):'未提供')+'。');
 const scores=source('本店评分／核心链接考核（原型数据）','本次最新可用记录',m.shop.channel==='拼多多'?sdPddAssessment(m.shop,a.range.end).text:sdScoreFacts(m.shop).text);
 const events=source('本店违规事件（原型数据）',range,'本次范围 '+m.events.length+'条记录；历史事件不直接等同当前未处理限制。',{records:m.events.map(e=>({date:e.date,platform:m.shop.channel,type:e.type,amount:e.amount}))});
 const roles=source('本店岗位（原型档案）','本次岗位资料',sdRoles(m.shop).map(p=>p.role+'：'+p.department+' · '+p.name).join('\n')||'未提供具名岗位安排');
 const items=[{section:'经营结论',statement:a.summary+a.context,nature:'分析判断',sources:[business,comparison,scores,events]}];
 for(const [label,text] of a.dimensions)items.push({section:'问题分析',statement:label+'：'+text,nature:'数据与分析判断',sources:label==='业绩'?[business,comparison]:label==='违规'?[events]:[scores]});
 for(const line of a.actions.split('\n').filter(Boolean))items.push({section:'部门行动',statement:line,nature:'分析建议',sources:[roles,events,comparison],note:'按本店资料及岗位提出的建议，不代表已经派发任务。'});
 return {subject:{id:m.shop.channel+'|'+m.shop.shopId,name:m.shop.name,code:String(m.shop.shopId),type:'店铺'},period:range,cutoff:a.range.end,generatedAt:new Date().toISOString(),items};
}
