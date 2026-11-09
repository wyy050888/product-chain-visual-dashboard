// 覆盖本项目使用的JSON Schema关键字；不支持的结构拒绝通过。
export function checkAiSchema(value,schema,definitions,path='$'){
 if(!schema)return [{path,problem:'输出结构引用不存在'}];
 const supported=new Set(['type','properties','items','required','additionalProperties','minItems','minLength','enum','$ref','$defs']);
 const unsupported=Object.keys(schema).filter(k=>!supported.has(k));
 if(unsupported.length)return [{path,problem:'校验器不支持结构关键字：'+unsupported.join('、')}];
 if(schema.$ref)return checkAiSchema(value,definitions[schema.$ref.split('/').at(-1)],definitions,path);
 const errors=[],fail=problem=>errors.push({path,problem});
 const validType={object:v=>v!==null&&typeof v==='object'&&!Array.isArray(v),array:Array.isArray,string:v=>typeof v==='string',boolean:v=>typeof v==='boolean'};
 if(schema.type&&!validType[schema.type]?.(value)){fail('JSON类型不符合输出结构');return errors}
 if(schema.enum&&!schema.enum.includes(value))fail('取值不在约定范围');
 if(typeof value==='string'&&value.length<(schema.minLength||0))fail('必填内容为空');
 if(Array.isArray(value)){
  if(value.length<(schema.minItems||0))fail('数组条数少于约定');
  value.forEach((v,i)=>errors.push(...checkAiSchema(v,schema.items,definitions,`${path}[${i}]`)));
 }else if(value!==null&&typeof value==='object'){
  for(const key of schema.required||[])if(!(key in value))errors.push({path:path+'.'+key,problem:'必填字段缺失'});
  for(const [key,v] of Object.entries(value)){
   if(schema.properties?.[key])errors.push(...checkAiSchema(v,schema.properties[key],definitions,path+'.'+key));
   else if(schema.additionalProperties===false)errors.push({path:path+'.'+key,problem:'出现未约定字段'});
  }
 }
 return errors;
}
