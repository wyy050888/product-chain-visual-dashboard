// 风险整改与验证分开建模；旧台账的“已闭环”映射为已整改、已验证。
function ppRiskFields(risk,cutoff){
 const actual=ppDate(risk.actualRectifiedAt),verified=ppDate(risk.verifiedAt||risk.closedAt);
 let rectify=risk.rectificationStatus||({'待整改':'待整改','整改中':'整改中','已整改':'已整改','已闭环':'已整改'})[risk.status];
 let verification=risk.verificationStatus||(risk.status==='已闭环'?'已验证':'待验证');
 if(actual&&actual>cutoff)rectify='整改中';
 if(verified&&verified>cutoff)verification='待验证';
 return {...risk,rectificationStatus:rectify||null,verificationStatus:verification,
  actualRectifiedAt:actual&&actual<=cutoff?actual:null,verifiedAt:verified&&verified<=cutoff?verified:null};
}
function ppSampleRiskFields(source,risk,index){
 const prevention={产品部:'固化需求冻结与变更评审清单，变更前完成影响评估。',研发部:'建立设计评审和试产问题复核清单，验证通过后转入下阶段。',采购部:'建立关键物料交付计划，提前确认报价、备料和供应商产能。',品质部:'完善检验标准和验证资料清单，明确整改复测及验收要求。'};
 const state=risk.status==='已闭环'?'已整改':['待整改','整改中','已整改'][(Math.abs(Number(source.id)||0)+index)%3];
 const occurredAt=risk.recordedAt,closed=risk.closedAt;
 return {...risk,stage:String(source.stage||'').split(/[,，、]/).filter(Boolean),occurredAt,
  prevention:prevention[risk.department],rectificationStatus:state,verificationStatus:closed?'已验证':'待验证',
  actualRectifiedAt:closed?(closed>occurredAt?ppEventDateOffset(closed,-1):closed):state==='已整改'?ppEventDateOffset(occurredAt,1):null,verifiedAt:closed||null};
}
const ppRiskColumns=[
 ['name','产品名称',320],['projectLight','项目红绿灯',120],['projectState','项目状态',105],['plan','计划上线日期',145],['delay','延期天数',100],
 ['taskNames','项目任务',200],['light','风险单红绿灯',120],['category','问题类别',180],['description','问题描述',230],
 ['rootCause','根因分析',220],['action','纠正措施',230],['prevention','预防措施',230],['owner','责任链主',140],['occurredAt','发生日期',125],
 ['deadline','整改期限',125],['rectificationStatus','当前状态',105],['verificationStatus','闭环验证',105],['actualRectifiedAt','实际整改日期',135],['verifiedAt','闭环验证日期',135],['operation','操作',80]
];
const ppRiskDateKeys=['plan','occurredAt','deadline','actualRectifiedAt','verifiedAt'];
function ppRiskSortValue(entry,key){
 if(key==='plan')return ppLatestPlan(entry.project);
 if(key==='delay')return entry.project.delay;
 return ppDate(entry.risk[key]);
}
function ppRiskSorted(records,sort){
 return records.map((entry,index)=>({entry,index})).sort((a,b)=>{
  const av=ppRiskSortValue(a.entry,sort.key),bv=ppRiskSortValue(b.entry,sort.key);
  if(av==null||bv==null)return av==null&&bv==null?a.index-b.index:av==null?1:-1;
  return (typeof av==='number'?av-bv:av.localeCompare(bv))*(sort.direction==='asc'?1:-1)||a.index-b.index;
 }).map(item=>item.entry);
}

// 筛选只作用于当前入口；同字段多选取并集，不同字段取交集。
const ppRiskEmptyFilters=()=>({query:'',light:[],rectificationStatus:[],verificationStatus:[]});
function ppRiskFiltered(records,filters=ppRiskEmptyFilters(),allowedLights=ppRiskLights){
 const query=filters.query.trim().toLowerCase();
 return records.filter(({project,risk})=>allowedLights.includes(risk.light)
  &&(!query||[project.name,...(risk.taskNames||[]),risk.rootCause,risk.owner].some(value=>String(value||'').toLowerCase().includes(query)))
  &&['light','rectificationStatus','verificationStatus'].every(key=>!filters[key]?.length||filters[key].includes(risk[key])));
}
