const cecDepartmentTargetHeaders=['责任部门','年度',...Array.from({length:12},(_,i)=>(i+1)+'月')];
function cecValidateDepartmentTargetImport(table){
 const headers=table[0]?.map(value=>String(value).trim())||[],errors=[],entries=[],next=cecCopy(cecStore),seen=new Set(),stamp=cecTime();
 const result=()=>({errors,entries,next,headers:cecDepartmentTargetHeaders});
 if(headers.length!==cecDepartmentTargetHeaders.length||new Set(headers).size!==headers.length||cecDepartmentTargetHeaders.some(h=>!headers.includes(h))){errors.push({row:1,message:'表头不匹配，请下载最新目标与实际模板'});return result()}
 if(table.length<2||table.length>3001){errors.push({row:1,message:table.length<2?'文件没有数据行':'单次最多导入3000行'});return result()}
 for(let i=1;i<table.length;i++){
  const source=Object.fromEntries(headers.map((h,index)=>[h,String(table[i][index]??'').trim()])),department=cecDepartmentByName(source['责任部门']),year=source['年度'],start=errors.length;
  const fail=message=>errors.push({row:table[i].sourceRow||i+1,message,source});
  if(!department)fail('责任部门不存在');
  if(!/^\d{4}$/.test(year)||!dashboardYears(4).includes(+year))fail('年度超出可配置范围');
  if(table[i].length>headers.length)fail('数据列数多于表头');
  const identity=department?.id+'|'+year;if(seen.has(identity))fail('文件内同一部门、年度重复');seen.add(identity);
  if(errors.length!==start)continue;
  for(let m=1;m<=12;m++){
   const raw=source[m+'月'];if(raw==='')continue;
   let targetCents;try{targetCents=cecAmount(raw,true)}catch(error){fail(m+'月：'+error.message);continue}
   const month=cecMonth(+year,m),before=cecDepartmentTargetCell(department.id,month);
   next.departmentTargets[cecRecordKey(department.id,month)]={targetCents,updatedAt:stamp};
   entries.push({department:department.name,month,targetCents,kind:before.targetCents===null?'新增':'更新',row:table[i].sourceRow||i+1});
  }
 }
 if(!errors.length&&!entries.length)errors.push({row:2,message:'请至少填写一个月的部门目标'});
 return result();
}
