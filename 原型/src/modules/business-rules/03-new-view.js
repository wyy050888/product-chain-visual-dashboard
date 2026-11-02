// 新品配置复用看板实际规则；同一条件的多个编辑入口共享一个参数键。
const brcNewSections=[
 {id:'identify',title:'新品判定',keys:['new.exitDays']},
 {id:'success',title:'新品销售成功率',keys:['new.quarterGsv','new.yearGsv','new.seasonGsv','new.profit','new.return','new.successRate']},
 {id:'delivery',title:'新品上市及时率',keys:['new.deliveryDays']}
];
let brcActiveNewSection='identify';
function brcNewHelp(label,text){return `<span class="metric-help" role="button" tabindex="0" aria-label="${esc(label)}" data-metric-rule="${esc(text)}"></span>`}
function brcNewField(key,instance='table'){return brcTableField(key,instance)}
function brcNewParameter(key,before,after='',help=''){
 const item=brcEditorByKey.get(key);
 return `<div class="brc-new-parameter"><label for="brc-${key}">${esc(before)}${help?brcNewHelp(before+'说明',help):''}</label><div class="brc-number-field">${brcNumericInput(item,brcDraft[key])}<span class="brc-unit">${esc(brcEditorUnit(item.unit).label)}</span></div>${after?`<span>${esc(after)}</span>`:''}</div>`;
}
function brcNewGroup(title,content){return `<section class="brc-clause-group">${title?`<h4>${title}</h4>`:''}<div class="brc-clause-group-body">${content}</div></section>`}
function brcNewSectionDirty(section){return section.keys.some(key=>brcConfigurableItems.some(item=>item.key===key)&&(brcEditorByKey.get(key).kind==='parameter'?brcDraft[key]!==brcSaved.values[key]:!brcSameCondition(brcDraftConditions[key],brcSaved.conditions[key])))}
function brcUpdateNewPreview(){brcUpdateSectionTabs()}
function brcNewSuccessTable(annual){
 const period=annual?'year':'quarter',title=annual?'年度考核':'季度考核';
 const help=brcNewHelp(title+'说明',annual?'按本年度截至统计截止日的业绩独立复核，不覆盖季度成功状态。':'按当季截至统计截止日的业绩判定；未成功跨季度、跨年滚入，首次成功后不重复纳入。');
 const groups=[['all','四季品',annual?'new.yearGsv':'new.quarterGsv'],['season','夏季品 / 冬季品','new.seasonGsv']].map(([type,name,gsv])=>({
  label:name,rows:[{key:gsv,resultGroup:'success-'+(type==='season'?'season':period),instance:period+'-'+type}]
 }));
 return brcMetricTable(title+help,['产品类型','指标'],groups,'brc-success-table');
}
function brcNewSectionContent(id){
 if(id==='identify')return brcNewGroup('出池',brcNewParameter('new.exitDays','销售首次成功季度结束后','出池'));
 if(id==='success')return brcSuccessWorkspace();
 return brcNewParameter('new.deliveryDays','大货交付允许延后','','保存后，同时用于总看板新品上市及时率及运营罗盘“产品研发 → 项目管理 → 项目总览 → 统计看板”的上市及时率；按大货交付任务的计划日期与实际完成日期比较，项目内当期全部应交付任务均在允许延后天数内完成才算及时。');
}
function brcRenderNewSections(){
 return brcRenderSections('new');
}
