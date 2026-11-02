// 细项实际的年度校验；合并表入口见02-combined-import，保持实际台账独立。
const cecActualHeaders=['责任部门','降本分类','降本指标','年度',...Array.from({length:12},(_,i)=>(i+1)+'月'),'备注'];
function cecValidateActualImport(table){
 const headers=table[0]?.map(v=>String(v).trim())||[];
 if(headers.includes('年月'))return {...cecValidateLegacyImport(table),headers};
 const errors=[],normalized=[[...cecLegacyHeaders,'降本分类']],origins=[];
 if(headers.length!==cecActualHeaders.length||new Set(headers).size!==headers.length||cecActualHeaders.some(h=>!headers.includes(h)))return {errors:[{row:1,message:'表头不匹配，请下载最新目标与实际模板'}],entries:[],headers:cecActualHeaders};
 if(table.length<2||table.length>3001)return {errors:[{row:1,message:table.length<2?'文件没有数据行':'单次最多导入3000行'}],entries:[],headers:cecActualHeaders};
 for(let i=1;i<table.length;i++){
  const source=Object.fromEntries(cecActualHeaders.map(h=>[h,String(table[i][headers.indexOf(h)]??'').trim()])),year=source['年度'];
  if(!/^\d{4}$/.test(year)||!dashboardYears(4).includes(+year)){errors.push({row:table[i].sourceRow||i+1,message:'年度超出可配置范围',source});continue}
  if(table[i].length>headers.length)errors.push({row:table[i].sourceRow||i+1,message:'数据列数多于表头',source});
  for(let m=1;m<=12;m++)if(source[m+'月']!==''){
   normalized.push(['',source['降本指标'],source['责任部门'],source['降本指标'],'',year+'-'+String(m).padStart(2,'0'),'',source[m+'月'],source['备注'],source['降本分类']]);origins.push({row:table[i].sourceRow||i+1,source});
  }
 }
 if(errors.length)return {errors,entries:[],headers:cecActualHeaders};
 if(!origins.length)return {errors:[{row:2,message:'请至少填写一个月的实际降本金额'}],entries:[],headers:cecActualHeaders};
 const result=cecValidateLegacyImport(normalized);result.errors=result.errors.map(error=>({...error,...origins[error.row-2]}));result.entries=result.entries.map(entry=>({...entry,row:origins[entry.row-2]?.row||entry.row}));return {...result,headers:cecActualHeaders};
}
function cecErrorDownload(result){const headers=result.headers||cecHeaders;downloadCsv(['原始行号',...headers,'错误原因'],result.errors.map(e=>[e.row,...headers.map(h=>e.source?.[h]||''),e.message]),'降本增效导入错误明细')}
