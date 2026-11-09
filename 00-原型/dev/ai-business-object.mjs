// 业务主体已经识别，不等于已经关联正式档案；不从长诊断句生成主体名。
export function checkBusinessObject(subject,input){
 const issues=[],fail=(path,problem)=>issues.push({path,problem});
 if(!subject||typeof subject!=='object')return [{path:'',problem:'缺少独立业务主体'}];
 const sources=(subject.evidence_ids||[]).map(id=>input.evidence.find(e=>e.id===id)).filter(Boolean);
 if(!subject.name?.trim()||subject.name.length>60||/[\n。；]/.test(subject.name))fail('.name','主体只写简短名称，不能用整段诊断代替');
 if(!subject.exact_quote||!sources.some(e=>e.text.includes(subject.exact_quote)))fail('.exact_quote','主体识别须有直接原文支持');
 if(subject.match_status==='已关联'){
  const object=input.objects?.find(o=>String(o.id)===subject.archive_id);
  if(!subject.archive_id||!object)fail('.archive_id','正式档案ID必须来自本次对应档案，不能编造');
  else{
   const types={product:'产品',spu:'产品',project:'项目',supplier:'供应商',factory:'工厂',shop:'店铺',department:'部门'};
   const type=types[object.type]||(['产品','项目','供应商','工厂','店铺','部门'].includes(object.type)?object.type:null);
   if(!type||type!==subject.type)fail('.type','主体类型须与正式档案一致，材料锚点不是正式实体档案');
  }
 }else{
  if(subject.archive_id)fail('.archive_id','档案待关联或主体待核时不能伪填正式档案ID');
  if(subject.type!=='未明确'&&subject.name&&!subject.exact_quote?.includes(subject.name))fail('.name','未关联档案时保留直接原文中的主体名称');
 }
 if(subject.match_status==='主体待核'&&subject.type!=='未明确')fail('.match_status','已明确主体类型及原称，不能因缺档案ID就写主体待核');
 if(subject.type==='未明确'&&subject.match_status!=='主体待核')fail('.match_status','主语本身未明确时才使用主体待核');
 return issues;
}
