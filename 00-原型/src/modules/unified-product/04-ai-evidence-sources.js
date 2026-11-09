// 来源别名仅用于兼容已有保存内容；新接入记录优先使用采集端的系统及模块。
const upAiEvidenceSourceNames=Object.freeze({
 '产品业绩':'数智罗盘-产品结构',
 '近期业绩对比':'数智罗盘-产品结构',
 '考核月业绩与评级规则':'数智罗盘-产品结构',
 '分平台退货':'数智罗盘-产品结构',
 '分平台利润率':'数智罗盘-产品结构',
 '公司库存快照':'运营罗盘-库存管理',
 '产品违规事件台账':'数智罗盘-店铺',
 '本店业绩':'数智罗盘-店铺',
 '本店近期对比':'数智罗盘-店铺',
 '本店评分／核心链接考核':'数智罗盘-店铺',
 '本店违规事件':'数智罗盘-店铺',
 '本店岗位':'数智罗盘-店铺配置',
 '成本试算':'采购日报'
});
function upAiEvidenceSourcePresentation(source,subject){
 const original=String(source.name||'').replace(/（(?:原型数据|原型档案|模拟资料)）$/,'');
 const name=source.systemName&&source.moduleName?source.systemName+'-'+source.moduleName:
  upAiEvidenceSourceNames[original]||original;
 const provided=value=>value&&!['未提供','未记录'].includes(value);
 const lines=[(subject.type==='店铺'?'店铺':'产品')+'：'+subject.name];
 if(source.period)lines.push('期间／日期：'+source.period);
 if(provided(source.author))lines.push('作者：'+source.author);
 if(provided(source.recordDate))lines.push('报告日期：'+source.recordDate);
 lines.push(source.content);
 return {name,content:lines.join('\n')};
}
function upAiEvidenceNote(note){
 const notes={
  '成本及报价条件属于模拟资料，不能当作真实已生效报价。':'试算使用所列假设条件；报价生效情况以确认记录为准。',
  '本次按职责提出的协作建议，不代表已派任务或原记录明确任命；模拟记录未提供作者及责任人。':'按职责提出协作建议，具体分工以确认安排为准。'
 };
 return notes[note]||note;
}
