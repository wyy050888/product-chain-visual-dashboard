// 来源列：固定标签、实际对象/材料名称、实际抓取日期。保留原始字段供回查。
const gdSourceDisplayLabels=Object.freeze({
 'project-progress':'运营罗盘-项目管理','stage-task-progress':'运营罗盘-项目管理','project-daily':'运营罗盘-项目管理','project-risk-execution':'运营罗盘-项目管理','project-schedule':'运营罗盘-项目管理',
 'supplier-management':'运营罗盘-供应商管理','supplier-admission':'运营罗盘-供应商管理',
 'refurb-requisition':'运营罗盘-采购管理','refurb-purchase':'运营罗盘-采购管理','refurb-progress':'运营罗盘-采购管理',
 'new-requisition':'运营罗盘-采购管理','new-purchase':'运营罗盘-采购管理','production-plan':'运营罗盘-采购管理','factory-schedule':'运营罗盘-采购管理','product-inspection':'运营罗盘-采购管理',
 'risk-alert':'运营罗盘-风险预警','key-products':'数智罗盘-产品结构','sales-attainment':'数智罗盘-产品结构',
 'inventory-control':'数智罗盘-库存','new-products':'数智罗盘-产品结构','product-lifecycle':'数智罗盘-产品结构','supply-chain':'运营罗盘-采购管理','cost-efficiency':'运营罗盘-降本增效'
});
const gdSourceDateFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'});
function gdSourceDate(value){
 if(!value)return '';
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 return gdSourceDateFormatter.format(date).slice(2).replaceAll('-','/');
}
function gdSourceLocation(source){
 const lines=String(source.source||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 const sourceType=diagnosisSourceType(source);
 const isDate=line=>/^(?:截止\s*)?\d{4}[-/]\d{2}[-/]\d{2}$/.test(line);
 const isLocator=line=>/(?:^|[·\s])第\s*\d+(?:\s*[-—至]\s*\d+)?\s*行(?:\s|$)/.test(line);
 // 页签/行号保留在原始来源中，展示只保留来源名称。
 const names=lines.slice(1).filter(line=>!isDate(line)&&!isLocator(line));
 const sourceName=String(source.sourceName||'').split(/\r?\n/).filter(line=>!isLocator(line)).join('\n').trim();
 const report=({'ding-daily':'日报','ding-weekly':'周报','ding-monthly':'月报'})[sourceType.key]||/^(日报|周报|月报)$/.exec(source.reportType||'')?.[1];
 const system=String(source.systemName||source.sourceSystem||'').trim(),module=String(source.moduleName||source.sourceModule||'').trim();
 const registered=String(source.sourceLabel||source.sourceType||lines[0]||'').trim();
 const explicitLabel=/^(运营罗盘|数智罗盘)-[^\r\n]+$/.test(registered)||registered==='钉钉-组织人员'?registered:'';
 const supplemental=source.reportType==='经营汇报'||source.materialType==='经营汇报';
 const type=report|| (supplemental?'经营汇报（补充材料）':system&&module?system+'-'+module:explicitLabel||gdSourceDisplayLabels[sourceType.key]||(sourceType.key?sourceType.label:''));
 let name=String(source.objectName||sourceName||names.join('\n')||'').trim();
 if(report==='日报'){
  const [originalPerson,originalDepartment]=String(names[0]||'').split(/\s*·\s*/);
  const person=source.logOwner||source.owner||originalPerson||'';
  const department=source.department||(!/^(日报|周报|月报)$/.test(originalDepartment||'')?originalDepartment:'');
  name=[person,department].filter(Boolean).join(' · ')||sourceName;
 }else if(report||supplemental){
  const documentName=source.fileName||source.documentName||sourceName||names.join('\n');
  name=[source.department,documentName].filter(Boolean).filter((value,index,all)=>all.indexOf(value)===index).join(' · ');
 }
 return {type,sourceTypeKey:sourceType.key,name,capturedDate:gdSourceDate(source.capturedAt||source.capturedDate)};
}
function gdSourceLocationMarkup(source){
 const location=gdSourceLocation(source);
 return '<div class="gd-source-location">'+(location.type?'<span class="tag gd-source-type" data-source-type data-source-type-key="'+esc(location.sourceTypeKey)+'">'+esc(location.type)+'</span>':'')+(location.name?'<div class="gd-source-name" data-source-name>'+esc(location.name)+'</div>':'')+(location.capturedDate?'<div class="gd-source-captured" data-source-captured>'+(['manual-task','task-import'].includes(location.sourceTypeKey)?'录入日期':'抓取日期')+'：'+esc(location.capturedDate)+'</div>':'')+'</div>';
}
function gdSourceContentMarkup(source){
 const content=String(source.content||''),report=({'ding-daily':'日报','ding-weekly':'周报','ding-monthly':'月报'})[diagnosisSourceType(source).key]||source.reportType;
 const metadata=[];
 const add=(label,value)=>{if(value&&!content.includes(value))metadata.push(label+'：'+value)};
 const period=source.businessPeriod||source.period;
 if(period?.start&&period?.end)add('报告期间',gdSourceDate(period.start)+'—'+gdSourceDate(period.end));
 else add(report==='日报'?'工作日期':report?'报告日期':'业务日期',gdSourceDate(source.date));
 add('提交日期',gdSourceDate(source.submittedAt||source.submittedDate));
 return gdReadableMarkup([...metadata,content].filter(Boolean).join('\n'));
}
function gdSourceRows(sources){
 return sources.flatMap(source=>Array.isArray(source.references)&&source.references.length?source.references.map((reference,index)=>({...reference,id:reference.id||source.id+'|'+index,content:reference.content??'联合引用内容（共'+source.references.length+'份材料）：\n'+String(source.content||'')})):[source]);
}
