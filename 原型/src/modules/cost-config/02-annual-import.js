// 年度模板贴近业务月报：每个指标两行，偏差和合计由页面计算，不接受手填汇总。
const cecHeaders=['责任部门','降本指标','年度','数据类型',...Array.from({length:12},(_,i)=>(i+1)+'月'),'备注'];
function cecTemplate(){
 const rows=cecFiltered().flatMap(p=>['目标值','实际达成'].map(type=>[cecDepartment(p.department).name,p.metric,cecState.year,type,...Array(12).fill(''),'']));
 downloadCsv(cecHeaders,rows.length?rows:[['','',cecState.year,'目标值',...Array(12).fill(''),''],['','',cecState.year,'实际达成',...Array(12).fill(''),'']],'降本增效年度导入模板');
}
function cecValidateImport(table){
 const headers=table[0]?.map(v=>String(v).trim())||[];
 if(!headers.includes('数据类型'))return {...cecValidateLegacyImport(table),headers:cecLegacyHeaders};
 const columns=[...headers.filter(h=>['项目编号','项目名称','责任人'].includes(h)),...cecHeaders];
 const errors=[],groups=new Map(),seen=new Set();
 const reject=(row,message,source)=>errors.push({row,message,source});
 if(headers.length!==columns.length||new Set(headers).size!==headers.length||columns.some(h=>!headers.includes(h)))return {errors:[{row:1,message:'表头不匹配，请下载最新年度模板'}],entries:[],headers:cecHeaders};
 if(table.length<2||table.length>3001)return {errors:[{row:1,message:table.length<2?'文件没有数据行':'单次最多导入3000行'}],entries:[],headers:cecHeaders};
 for(let i=1;i<table.length;i++){
  const source=Object.fromEntries(columns.map(h=>[h,String(table[i][headers.indexOf(h)]??'').trim()])),row=i+1,type=source['数据类型'],year=source['年度'];
  if(table[i].length>headers.length)reject(row,'数据列数多于表头',source);
  if(!Array.from({length:12},(_,m)=>source[(m+1)+'月']).some(Boolean))continue;
  if(!['目标值','实际达成'].includes(type)){reject(row,'数据类型须为目标值或实际达成',source);continue}
  if(!/^\d{4}$/.test(year)||!dashboardYears(4).includes(+year)){reject(row,'年度须为2025至'+dashboardYears(4).at(-1),source);continue}
  const department=cecDepartmentByName(source['责任部门']);if(department)source['责任部门']=department.name;
  const identity=[source['责任部门']+'|'+source['降本指标'],year].join('|'),unique=identity+'|'+type;
  if(seen.has(unique)){reject(row,'文件内同一部门、降本指标、年度及数据类型重复',source);continue}seen.add(unique);
  const group=groups.get(identity)||{rows:{},source,row};
  if(['责任部门','降本指标'].some(key=>group.source[key]!==source[key]))reject(row,'同一降本指标的基本信息不一致',source);
  group.rows[type]={source,row};groups.set(identity,group);
 }
 const normalized=[cecLegacyHeaders],origins=[];
 for(const group of groups.values())for(let m=1;m<=12;m++){
  const target=group.rows['目标值'],actual=group.rows['实际达成'],targetValue=target?.source[m+'月']||'',actualValue=actual?.source[m+'月']||'';
  if(!targetValue&&!actualValue)continue;
  const s=group.source,origin=targetValue?target:actual;
  normalized.push(['',s['降本指标'],s['责任部门'],s['降本指标'],'',s['年度']+'-'+String(m).padStart(2,'0'),targetValue,actualValue,actual?.source['备注']||target?.source['备注']||'']);
  origins.push({row:origin.row,source:origin.source,target,actual,month:m});
 }
 if(errors.length)return {errors,entries:[],headers:cecHeaders};
 const result=cecValidateLegacyImport(normalized);
 result.errors=result.errors.map(error=>{const origin=origins[error.row-2];const record=error.message.startsWith('实际金额')?origin?.actual:error.message.startsWith('目标金额')?origin?.target:origin;return {...error,row:record?.row||error.row,source:record?.source||error.source}});
 return {...result,headers:cecHeaders};
}
function cecErrorDownload(result){const headers=result.headers||cecHeaders;downloadCsv(['原始行号',...headers,'错误原因'],result.errors.map(e=>[e.row,...headers.map(h=>e.source?.[h]||''),e.message]),'降本增效导入错误明细')}
