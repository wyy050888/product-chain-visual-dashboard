// 来源类型、名称和抓取日期共用展示；date仍是业务日期，不能替代抓取日期。
const gdSourceDateFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'});
function gdSourceDate(value){
 if(!value)return '';
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 return gdSourceDateFormatter.format(date).slice(2).replaceAll('-','/');
}
function gdSourceLocation(source){
 const lines=String(source.source||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 const sourceType=diagnosisSourceType(source),type=sourceType.label;
 const isDate=line=>/^(?:截止\s*)?\d{4}[-/]\d{2}[-/]\d{2}$/.test(line);
 const isLocator=line=>/(?:^|[·\s])第\s*\d+(?:\s*[-—至]\s*\d+)?\s*行(?:\s|$)/.test(line);
 // 页签/行号保留在原始来源中，展示只保留来源名称。
 const names=lines.slice(1).filter(line=>!isDate(line)&&!isLocator(line));
 const sourceName=String(source.sourceName||'').split(/\r?\n/).filter(line=>!isLocator(line)).join('\n').trim();
 const report=/^钉钉(日报|周报|月报)$/.exec(type)?.[1]||/^(日报|周报|月报)$/.exec(source.reportType||'')?.[1];
 let name=sourceName||names.join('\n')||'未记录来源名称';
 if(report){
  const [originalPerson,originalDepartment]=String(names[0]||'').split(/\s*·\s*/);
  const person=source.logOwner||source.owner||originalPerson||'未记录提交人';
  const department=source.department||(!/^(日报|周报|月报)$/.test(originalDepartment||'')?originalDepartment:'');
  const date=gdSourceDate(source.date||lines.find(isDate)).replaceAll('/','');
  const reportName=sourceName||person+'的'+report+date;
  name=[department,reportName].filter(Boolean).join(' · ');
 }
 return {type,sourceTypeKey:sourceType.key,name,capturedDate:gdSourceDate(source.capturedAt||source.capturedDate)};
}
function gdSourceLocationMarkup(source){
 const location=gdSourceLocation(source);
 return '<div class="gd-source-location"><span class="tag gd-source-type'+(location.sourceTypeKey?'':' is-unlinked')+'" data-source-type data-source-type-key="'+esc(location.sourceTypeKey)+'">'+esc(location.type)+'</span><div class="gd-source-name" data-source-name>'+esc(location.name)+'</div><div class="gd-source-captured" data-source-captured>'+(['manual-task','task-import'].includes(location.sourceTypeKey)?'录入日期':'抓取日期')+'：'+esc(location.capturedDate||'未记录')+'</div></div>';
}
