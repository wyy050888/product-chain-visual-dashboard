// 页面、主体、依据、日更的必要字段。完整schema只供程序校验。
const str={type:'string'},text={...str,minLength:1};
const list=items=>({type:'array',items});
const object=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const choice=values=>({...str,enum:values});
const ids=list(text),ref=name=>({$ref:'#/$defs/'+name});
export const aiDefinitions={
 claim:object({text,basis:choice(['事实','推断','建议']),evidence_ids:ids}),
 subject:object({type:choice(['店铺','SPU','SKU','供应商','人员','项目','待核']),name:text,archive_id:str}),
 action:object({summary:text,task:text,person_id:str,person_name:str,department:str,owner_basis:text,evidence_ids:ids},['summary','task','person_id','department','owner_basis','evidence_ids']),
 update:object({finding_id:text,changes:ref('changes'),reason:text,exit_reason:str,evidence_ids:ids})
};
const finding=object({key:text,category:choice(['工作遗漏','协同卡点','缺少方案','资源错配','报告问题']),subject:ref('subject'),priority:choice(['一般','重要','紧急']),status:choice(['未开始','跟进中','已暂停','已完成','']),problem:ref('claim'),actions:list(ref('action')),person_ids:ids,report_ids:ids});
aiDefinitions.changes=object(Object.fromEntries(Object.entries(finding.properties).filter(([key])=>key!=='key')),[]);
const diagnosis=object({subject:text,conclusion:ref('claim'),analysis:list(ref('claim')),actions:list(ref('action')),updates:list(ref('update'))});
const schemas={
 total:object({findings:list(finding),updates:list(ref('update')),key_work_analysis:list(object({rule_item_id:text,problem:ref('claim'),actions:list(ref('action'))}))},['findings','updates']),
 product:diagnosis,shop:diagnosis,
 root:object({groups:list(object({title:text,cause:ref('claim'),risk_ids:ids})),unassigned:list(object({risk_id:text,reason:ref('claim')}))})
};
export function aiOutputSchema(kind){return structuredClone({...schemas[kind],$defs:aiDefinitions})}
const common='claim={text,basis(事实/推断/建议),evidence_ids}；action={summary,task,person_id,person_name(姓名或建议岗位),department,owner_basis,evidence_ids}；update={finding_id,changes(实际变更字段),reason,exit_reason(非退出留空),evidence_ids}。无变化changes={}；退出不当完成。状态只用未开始/跟进中/已暂停/已完成；首次进度不明status=""，续更无新证据省略status。';
const shapes={
 total:'返回{findings:[{key,category(工作遗漏/协同卡点/缺少方案/资源错配/报告问题),subject,priority(一般/重要/紧急),status,problem:claim,actions:[action],person_ids,report_ids}],updates:[update],key_work_analysis:[{rule_item_id,problem:claim,actions:[action]}]}。key_work_items逐项对应key_work_analysis，不含优先级/灯色/榜名；findings仅新增，updates仅续更原AI问题，报告按report_ids引用。',
 product:'返回{subject(原样返回meta.subject),conclusion:claim,analysis:[claim],actions:[action],updates:[update]}。',
 shop:'返回{subject(原样返回meta.subject),conclusion:claim,analysis:[claim],actions:[action],updates:[update]}。',
 root:'返回{groups:[{title,cause:claim,risk_ids}],unassigned:[{risk_id,reason:claim}]}。'
};
export function aiOutputNotes(kind){return shapes[kind]+'\n'+(kind==='root'?'claim={text,basis(事实/推断/建议),evidence_ids}。':common+(kind==='total'?'subject={type(店铺/SPU/SKU/供应商/人员/项目/待核),name,archive_id}；type指语义类型，缺ID不等于类型待核；不新建主体。':'')+'summary为30字内标题，不带括号或“总结”字样，页面显示【标题】；task写具体分述。')+'返回JSON对象，不附Markdown；无内容用空数组，未知ID留空。'}
