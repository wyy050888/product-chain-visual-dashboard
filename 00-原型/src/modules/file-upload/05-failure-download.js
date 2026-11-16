const uiFailedWorkbooks=new Map();
let uiFailureDb;
function uiOpenFailureDb(){
 return uiFailureDb||=new Promise((resolve,reject)=>{
  const request=indexedDB.open('dashboard-import-files-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('workbooks');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
async function uiKeepFailedWorkbook(id,file){
 uiFailedWorkbooks.set(id,file);
 try{
  const db=await uiOpenFailureDb(),tx=db.transaction('workbooks','readwrite');
  tx.objectStore('workbooks').put(file,id);
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
  uiFailedWorkbooks.delete(id);
 }catch(_){/* 浏览器存储不可用时，本次会话仍可下载。 */}
}
async function uiGetFailedWorkbook(id){
 if(uiFailedWorkbooks.has(id))return uiFailedWorkbooks.get(id);
 const db=await uiOpenFailureDb();
 return new Promise((resolve,reject)=>{
  const request=db.transaction('workbooks').objectStore('workbooks').get(id);
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
async function uiDropFailedWorkbooks(ids){
 if(!ids.length)return;
 for(const id of ids)uiFailedWorkbooks.delete(id);
 try{
  const db=await uiOpenFailureDb(),store=db.transaction('workbooks','readwrite').objectStore('workbooks');
  for(const id of ids)store.delete(id);
 }catch(_){/* 清理失败不影响导入结果。 */}
}
function uiFailureSheets(entry){
 return entry.failureSheets||[{name:entry.sheetName,headers:entry.headers||[],headerRow:entry.headerRow||1,rows:entry.failedRows||[]}];
}
function uiHasFailureData(entry){return uiFailureSheets(entry).some(sheet=>sheet.rows.some(row=>Array.isArray(row.values)&&row.values.length>0))}
function uiFailureValues(row){
 return [row.row,row.result||'校验失败',(row.issues||[]).map(error=>error.field).join('\n'),row.reason||''];
}
function uiMarkFailureSheet(sheet,styles,source){
 const ns=sheet.documentElement.namespaceURI,create=(name,attrs={})=>{
  const node=sheet.createElementNS(ns,name);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);return node;
 };
 const data=sheet.getElementsByTagNameNS('*','sheetData')[0],rows=new Map([...data.children].map(row=>[Number(row.getAttribute('r')),row]));
 const header=rows.get(source.headerRow||1);if(!header)throw Error('未定位到原工作表表头');
 const columnNumber=address=>[...(address?.match(/^[A-Z]+/)?.[0]||'')].reduce((n,value)=>n*26+value.charCodeAt(0)-64,0);
 const start=Math.max(source.headers.length,...source.rows.map(row=>row.values.length));
 const headerStyle=header.firstElementChild?.getAttribute('s')||'0';
 const cellAt=(row,column)=>{
  const address=uiTemplateColumn(column)+row.getAttribute('r');
  return [...row.children].find(cell=>cell.getAttribute('r')===address);
 };
 const setAuxiliary=(row,values,style)=>{
  values.forEach((value,index)=>{
   const column=start+index,old=cellAt(row,column),cell=create('c',{r:uiTemplateColumn(column)+row.getAttribute('r'),t:'inlineStr',s:style});
   const inline=create('is'),text=create('t');text.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');text.textContent=String(value??'');
   inline.append(text);cell.append(inline);if(old)old.replaceWith(cell);else row.append(cell);
  });
 };
 setAuxiliary(header,uiFailureColumns,headerStyle);
 for(const result of source.rows){
  const row=rows.get(Number(result.row));if(!row)continue;
  setAuxiliary(row,uiFailureValues(result),'0');
  for(const issue of result.issues||[]){
   const column=source.headers.findIndex(name=>name===issue.field||uiImportHeaderName(name)===issue.field||(typeof ssiHeader==='function'&&ssiHeader(name)===issue.field));
   if(column<0)continue;
   let cell=cellAt(row,column);
   if(!cell){
    cell=create('c',{r:uiTemplateColumn(column)+row.getAttribute('r')});
    const next=[...row.children].find(node=>columnNumber(node.getAttribute('r'))>column+1);
    row.insertBefore(cell,next||null);
   }
   cell.setAttribute('s',styles.red(cell.getAttribute('s')||'0'));
  }
 }
 const widest=start+uiFailureColumns.length;
 const dimension=sheet.getElementsByTagNameNS('*','dimension')[0];
 if(dimension){
  const [first,last=first]=dimension.getAttribute('ref').split(':');
  const lastColumn=columnNumber(last);
  let lastRow=Number(last.match(/\d+$/)?.[0])||0;
  for(const row of rows.keys())lastRow=Math.max(lastRow,row);
  dimension.setAttribute('ref',first+':'+uiTemplateColumn(Math.max(widest,lastColumn)-1)+lastRow);
 }
}
function uiFailureStyles(styles){
 const fills=styles.getElementsByTagNameNS('*','fills')[0],formats=styles.getElementsByTagNameNS('*','cellXfs')[0],ns=styles.documentElement.namespaceURI;
 const fill=styles.createElementNS(ns,'fill'),pattern=styles.createElementNS(ns,'patternFill'),color=styles.createElementNS(ns,'fgColor'),fillId=fills.children.length;
 pattern.setAttribute('patternType','solid');color.setAttribute('rgb','FFFFE5E8');pattern.append(color);fill.append(pattern);fills.append(fill);fills.setAttribute('count',fills.children.length);
 const marked=new Map();
 return {red(index){
  if(!marked.has(index)){
   const style=(formats.children[index]||formats.firstElementChild).cloneNode(true);
   style.setAttribute('fillId',fillId);style.setAttribute('applyFill','1');
   marked.set(index,formats.children.length);formats.append(style);formats.setAttribute('count',formats.children.length);
  }
  return marked.get(index);
 }};
}
async function uiFailureWorkbook(file,sheets){
 const archive=cwWorkbookArchive(await file.arrayBuffer()),serialize=new XMLSerializer();
 const workbook=await archive.xml('xl/workbook.xml'),relations=await archive.xml('xl/_rels/workbook.xml.rels');
 const parts=Object.fromEntries(archive.names.map(name=>[name,archive.packed(name)]));
 const styleRelation=[...relations.documentElement.children].find(rel=>rel.getAttribute('Type').endsWith('/styles'));
 const styleTarget=styleRelation?.getAttribute('Target')||'styles.xml';
 const stylePath=styleTarget.startsWith('/')?styleTarget.slice(1):'xl/'+styleTarget.replace(/^\.\//,'');
 let styles=await archive.xml(stylePath);
 if(!styles){
  const ns=workbook.documentElement.namespaceURI;
  styles=new DOMParser().parseFromString(`<styleSheet xmlns="${ns}"><fonts count="1"><font/></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,'application/xml');
  if(!styleRelation){
   const root=relations.documentElement,node=relations.createElementNS(root.namespaceURI,'Relationship');
   const ids=new Set([...root.children].map(rel=>rel.getAttribute('Id')));
   let index=1;while(ids.has('rId'+index))index++;
   node.setAttribute('Id','rId'+index);node.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles');
   node.setAttribute('Target',styleTarget);root.append(node);
   parts['xl/_rels/workbook.xml.rels']=serialize.serializeToString(relations);
  }
  const types=await archive.xml('[Content_Types].xml'),root=types.documentElement;
  if(![...root.children].some(node=>node.getAttribute('PartName')==='/'+stylePath)){
   const type=types.createElementNS(root.namespaceURI,'Override');type.setAttribute('PartName','/'+stylePath);
   type.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml');root.append(type);
   parts['[Content_Types].xml']=serialize.serializeToString(types);
  }
 }
 const redStyles=uiFailureStyles(styles);
 const pack=async xml=>{
  const bytes=new TextEncoder().encode(serialize.serializeToString(xml));
  try{
   const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
   const data=new Uint8Array(await new Response(stream).arrayBuffer());
   return {data,method:8,size:bytes.length,checksum:uiTemplateCrc32(bytes)};
  }catch(_){return bytes}
 };
 const original=[...workbook.getElementsByTagNameNS('*','sheet')];
 for(const source of sheets){
  const match=source.name?original.find(sheet=>sheet.getAttribute('name')===source.name):original[0];
  if(!match)throw Error('未找到原工作表');
  const id=match.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const target=[...relations.getElementsByTagNameNS('*','Relationship')].find(rel=>rel.getAttribute('Id')===id)?.getAttribute('Target');
  const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
  const sheet=await archive.xml(path);uiMarkFailureSheet(sheet,redStyles,source);parts[path]=await pack(sheet);
 }
 parts[stylePath]=await pack(styles);
 return uiTemplateZip(parts);
}
async function uiHistoryDownload(entry){
 try{
  const sheets=uiFailureSheets(entry),stamp=new Date(entry.at).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}).replace(/[: ]/g,'-'),base=entry.file.replace(/\.[^.]+$/,'')+'-导入失败报告-'+stamp;
  const csv=rows=>{
   const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
   return new Blob(['\ufeff',rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});
  };
  let blob,extension;
  if(!uiHasFailureData(entry)){
   const issues=entry.fileIssues||entry.errors||[];
   blob=csv([['文件名','导入时间','错误位置','错误字段','失败原因'],...issues.map(issue=>[entry.file,stamp,issue.row==='—'?'':issue.row,issue.field,issue.message])]);
   extension='csv';
  }else if(/\.xlsx$/i.test(entry.file)){
   const original=await uiGetFailedWorkbook(entry.id).catch(()=>null);
   if(original)blob=await uiFailureWorkbook(original,sheets);
   else{
    const output=sheets.filter(sheet=>sheet.headers.length).map((sheet,index)=>({name:sheet.name||'失败数据'+(index||''),headers:[...sheet.headers,...uiFailureColumns],rows:sheet.rows.map(row=>[...sheet.headers.map((_,i)=>row.values[i]??''),...uiFailureValues(row)])}));
    blob=uiImportWorkbook(output[0].headers,output[0].rows,{sheets:output});
   }
   extension='xlsx';
  }else{
   const {headers,rows}=sheets[0];
   const width=Math.max(headers.length,...rows.map(row=>row.values.length));
   const fields=Array.from({length:width},(_,i)=>headers[i]??'');
   const values=[[...fields,...uiFailureColumns],...rows.map(row=>[...fields.map((_,i)=>row.values[i]??''),...uiFailureValues(row)])];
   blob=csv(values);extension='csv';
  }
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=base+'.'+extension;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(_){toast('失败文件下载失败，请重试')}
}
