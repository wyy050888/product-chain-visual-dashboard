// 档案来源与模板校验分离；财务结算编码尚未维护时明确报错，不以供应商内部ID代替。
function cecDetailRegistry(){return {products:sampleSpus,categories:new Set(scpCategories.map(row=>cecText(row.name))),suppliers:scpCompanies}}
function cecValidDate(value,allowMonth=false){
 const raw=cecText(value);if(allowMonth&&/^\d{4}\/(0[1-9]|1[0-2])$/.test(raw))return true;
 if(!/^\d{4}\/\d{2}\/\d{2}$/.test(raw))return false;
 const iso=raw.replaceAll('/','-'),date=new Date(iso+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso;
}
function cecValidateDetail(schema,values,registry=cecDetailRegistry()){
 const errors=[],fail=(field,message)=>errors.push({field,message}),get=field=>cecText(values[schema.headers.indexOf(field)]);
 for(const field of schema.required)if(!get(field))fail(field,'必填项为空');
 const month=get('月份');if(month&&!/^\d{4}\/(0[1-9]|1[0-2])$/.test(month))fail('月份','须按YYYY/MM填写有效月份');
 const standard=ccStandardMetrics.find(row=>cecText(row.name)===get('降本类型'));
 if(get('降本类型')&&!standard)fail('降本类型','须填写已有二级类目，一格只填一个');
 for(const field of schema.headers){
  const raw=values[schema.headers.indexOf(field)],value=cecText(raw);if(!value)continue;
  if(raw&&typeof raw==='object'&&Object.hasOwn(raw,'formula')){if(!cecDerivedFields.has(field))fail(field,'请粘贴为值后导入');continue}
  if(/^#(?:REF!|VALUE!|DIV\/0!|N\/A|NAME\?|NUM!|SPILL!|CALC!)/.test(value))fail(field,'存在公式错误，请修正后导入');
  if(field.endsWith('日期')&&!cecValidDate(value,field==='执行日期'))fail(field,field==='执行日期'?'须为有效YYYY/MM或YYYY/MM/DD':'须为有效YYYY/MM/DD日期');
  if(field.endsWith('（元）')&&!cecDerivedFields.has(field)){try{cecAmount(value)}catch(error){fail(field,error.message)}}
  if(['提货量','发货量/充单量'].includes(field)&&!/^\d{1,12}$/.test(value))fail(field,'请填写非负整数数量');
 }
 let product;
 if(schema.headers.includes('SPU码')){
  const matches=registry.products.filter(row=>cecText(row.spuCode)===get('SPU码'));
  if(get('SPU码')&&matches.length!==1)fail('SPU码','须在产品档案中唯一存在，不能填写SKU码');
  product=matches.length===1?matches[0]:null;
  if(product&&cecText(product.name)!==get('产品名称（SPU）'))fail('产品名称（SPU）','须与SPU码对应的产品档案名称一致');
 }
 if(schema.headers.includes('产品类目（三级）')&&get('产品类目（三级）')&&!registry.categories.has(get('产品类目（三级）')))fail('产品类目（三级）','只填写已有三级类目名称，不填完整路径或一、二级类目');
 if(schema.headers.includes('T+供应商名称')&&get('T+供应商名称')){
  const value=get('T+供应商名称'),suppliers=registry.suppliers,code=row=>cecText(row.financialSettlementCode||row['财务结算编码']);
  const matches=suppliers.filter(row=>code(row)&&value===code(row)+'-'+cecText(row.name));
  if(!value.includes('-')||value.startsWith('-')||value.endsWith('-'))fail('T+供应商名称','须按“财务结算编码-供应商名称”填写');
  else if(matches.length!==1||suppliers.filter(row=>code(row)&&code(row)===code(matches[0]||{})).length!==1){
   const missingCode=suppliers.some(row=>!code(row)&&value.endsWith('-'+cecText(row.name)));
   fail('T+供应商名称',missingCode?'现有供应商档案尚未维护财务结算编码，请先补齐':'财务结算编码或供应商名称与现有供应商档案不唯一对应');
  }
 }
 return {errors,standard,product};
}
function cecComputeDetail(schema,values){
 const result=values.map(value=>value&&typeof value==='object'?'':String(value??'').trim()),get=field=>result[schema.headers.indexOf(field)],set=(field,value)=>{const index=schema.headers.indexOf(field);if(index>=0)result[index]=value};
 const difference=(from,to,field)=>{if(get(from)!==''&&get(to)!==''){const cents=cecAmount(get(from))-cecAmount(get(to));set(field,(cents/100).toFixed(2));return cents}set(field,'');return null};
 if(schema.name==='采购部'){
  const factory=difference('首次出厂报价（元）','最新出厂报价（元）','出厂价降本额（元）'),brand=difference('首次品牌费（元）','最新品牌费（元）','品牌费降本额（元）');
  const per=factory===null?null:factory+(brand??0),base=cecAmount(get('首次出厂报价（元）'));
  set('单台降本额（元）',per===null?'':(per/100).toFixed(2));set('单台累计降本率',per!==null&&base?((per/base)*100).toFixed(2)+'%':'');
 }else if(['发货部','仓储部'].includes(schema.name))difference('原运费/件（元）','现运费/件（元）','降本单价（元）');
 return result;
}
