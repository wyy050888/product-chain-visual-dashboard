// 固定业务字典：key用于关联，label用于展示；文件名、报告名不作为类型。
const diagnosisObjectTypes=Object.freeze({product:'产品',project:'项目',shop:'店铺',supplier:'供应商',report:'日志'});
const diagnosisSourceTypes=Object.freeze({
 'manual-task':'手工录入','task-import':'任务导入',
 'ding-daily':'钉钉日报','ding-weekly':'钉钉周报','ding-monthly':'钉钉月报','meeting-minutes':'会议纪要','business-analysis-task':'经营分析待办',
 'project-progress':'项目进度','stage-task-progress':'阶段&任务进度','project-daily':'项目日报','project-risk-execution':'项目风险台账&执行单','project-schedule':'项目排期',
 'supplier-management':'供应商管理','supplier-admission':'供应商引入流程','inventory-management':'库存管理',
 'refurb-requisition':'翻新请购单','refurb-purchase':'翻新采购单','refurb-progress':'翻新进度',
 'new-requisition':'新机请购单','new-purchase':'新机采购单','production-plan':'排产计划单','factory-schedule':'工厂排产单','product-inspection':'产品质检单',
 'risk-alert':'风险预警','key-products':'关键产品','inventory-control':'库存管控','ai-analysis':'AI分析','sales-attainment':'销售达成',
 'new-products':'新品专项','product-lifecycle':'产品全生命周期','supply-chain':'供应链采购','cost-efficiency':'降本增效'
});
const diagnosisSourceAliases=Object.freeze({
 '全局高危预警':'risk-alert','全局高危预警记录':'risk-alert',
 '项目进度台账':'project-progress','项目基础信息':'project-progress','立项检查记录':'project-progress',
 '阶段进展':'stage-task-progress','任务进展':'stage-task-progress','阶段任务进度':'stage-task-progress',
 '项目进度 · 当前日报':'project-daily','项目进度·当前日报':'project-daily','当前日报':'project-daily',
 '项目风险台账':'project-risk-execution','风险台账':'project-risk-execution','品质整改台账':'project-risk-execution','重点工作清单':'project-risk-execution','版本交接记录':'stage-task-progress',
 '任务排期':'project-schedule','节点排期':'project-schedule','研发排期表':'project-schedule','项目周计划':'project-schedule',
 '资源排期表':'project-schedule','检测排期表':'project-schedule','设备排期表':'project-schedule','产品评审计划':'project-schedule','项目资源记录':'project-schedule',
 '供应商资源池':'supplier-management','供应商风险台账':'supplier-management','供应商引入':'supplier-admission','供方准入':'supplier-admission',
 '产品经营月度评审':'meeting-minutes','一次挽救评审纪要':'meeting-minutes','库存处置会议':'meeting-minutes','品质周例会':'meeting-minutes','经营复盘记录':'meeting-minutes',
 '采购周报':'ding-weekly','项目周报':'ding-weekly','年度降本项目周报':'ding-weekly','年度降本验收记录':'cost-efficiency',
 '来源扫描清单':'ai-analysis','钉钉日志抓取清单':'ai-analysis','业务分析':'business-analysis-task','业务预警记录':'risk-alert'
});
function diagnosisSourceType(source){
 if(Object.hasOwn(diagnosisSourceTypes,source.sourceTypeKey))return {key:source.sourceTypeKey,label:diagnosisSourceTypes[source.sourceTypeKey]};
 const raw=String(source.sourceType||source.sourceTypeOriginal||String(source.source||'').split(/\r?\n/)[0]||'').trim();
 const text=raw.replaceAll('＆','&'),labelKey=Object.keys(diagnosisSourceTypes).find(key=>diagnosisSourceTypes[key]===text);
 if(labelKey)return {key:labelKey,label:diagnosisSourceTypes[labelKey]};
 const prefix=text.split(/\s*[·｜]\s*/)[0],alias=Object.hasOwn(diagnosisSourceAliases,text)?diagnosisSourceAliases[text]:Object.hasOwn(diagnosisSourceAliases,prefix)?diagnosisSourceAliases[prefix]:'';
 if(alias)return {key:alias,label:diagnosisSourceTypes[alias]};
 const report=/^(日报|周报|月报)$/.exec(source.reportType||'')?.[1];
 if(report&&/^(钉钉日志|钉钉日志抓取记录)$/.test(text)){const key={日报:'ding-daily',周报:'ding-weekly',月报:'ding-monthly'}[report];return {key,label:diagnosisSourceTypes[key]}}
 // Excel只是载体；只有具名会议或会议决议才能归为会议纪要。
 if(/^钉钉文档\s*Excel$/i.test(text)&&/会议|例会|纪要|会议决议/.test([source.sourceName,source.source,source.content].filter(Boolean).join('\n')))return {key:'meeting-minutes',label:diagnosisSourceTypes['meeting-minutes']};
 return {key:'',label:'未记录来源类型'};
}
function diagnosisNormalizeSource(source){
 const type=diagnosisSourceType(source),raw=String(source.sourceType||String(source.source||'').split(/\r?\n/)[0]||'').trim();
 return {...source,sourceTypeKey:type.key,sourceType:type.key?type.label:'',...(raw&&raw!==type.label&&!source.sourceTypeOriginal?{sourceTypeOriginal:raw}:{})};
}
function diagnosisObjectType(value){
 return Object.hasOwn(diagnosisObjectTypes,value)?value:Object.keys(diagnosisObjectTypes).find(key=>diagnosisObjectTypes[key]===value)||'';
}
function diagnosisObjectTag(value,task=false){
 const key=diagnosisObjectType(value),classes=task?'up-todo-object-type':'gd-business-type';
 return `<span class="tag ${classes}${key?'':' is-unlinked'}" ${key?(task?'data-todo-object-type':'data-business-object-type')+'="'+key+'"':'data-business-object-state="unlinked"'}>${esc(diagnosisObjectTypes[key]||'未关联')}</span>`;
}
function diagnosisNormalizeTaskObjects(task){
 if(!Array.isArray(task.businessObjects))return task;
 const businessObjects=task.businessObjects.map(object=>{
  const type=diagnosisObjectType(object.type);
  return type===object.type?object:{...object,type,...(object.type&&!object.typeOriginal?{typeOriginal:object.type}:{})};
 });
 return JSON.stringify(businessObjects)===JSON.stringify(task.businessObjects)?task:{...task,businessObjects};
}
