// 模板用原生OOXML导出，避免为表头样式加载整套Excel运行库。
function uiImportHeaderName(value){
 return String(value??'').replace(/^\uFEFF/,'').trim().replace(/^[*＊]\s*|\s*[*＊]$/g,'').replace(/（(?:实际降本必填|钉钉名称|填写产品时必填|YYYY\/MM\/DD|YYYY\/MM)）$/,'').trim();
}
function uiNormalizeImportHeaders(table){
 const guided=String(table[0]?.[0]||'').trim()==='填写说明';
 const index=guided?table.findIndex(row=>{const labels=row.map(uiImportHeaderName);return labels.includes('事项名称')&&labels.includes('负责人')||labels.includes('供应商名称')&&labels.includes('合作产品SPU码')||labels.includes('责任部门')&&labels.includes('数据类型')&&labels.includes('年度')}):0;
 table.forEach((row,index)=>{if(!row.sourceRow)Object.defineProperty(row,'sourceRow',{value:index+1})});
 if(index>=0&&table[index])table[index].forEach((value,column)=>{table[index][column]=uiImportHeaderName(value)});
 return table.slice(Math.max(0,index)).filter((row,index)=>index===0||!String(row[0]||'').startsWith('【示例】'));
}
function uiTemplateXml(value){return String(value??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]))}
function uiTemplateColumn(index){let name='';for(index++;index;index=Math.floor((index-1)/26))name=String.fromCharCode(65+(index-1)%26)+name;return name}
function uiTemplateHeaderXml(label,required,hint='',color='FF304C70',bold=false){
 const personnel=['负责人','责任人','采购人员','店长策略','店长推广'].includes(label);
 const description=hint||(personnel?'钉钉名称':label.endsWith('日期')?'YYYY/MM/DD':label==='月份'?'YYYY/MM':''),text=uiTemplateXml(label+(description?'（'+description+'）':''));
 if(bold){
  const run=(value,ink)=>`<r><rPr><rFont val="Microsoft YaHei"/><sz val="11"/><color rgb="${ink}"/><b/></rPr><t>${value}</t></r>`;
  return (required?run('*','FFD92848'):'')+run(text,color);
 }
 return required?`<r><rPr><rFont val="Microsoft YaHei"/><sz val="11"/><color rgb="FFD92848"/></rPr><t>*</t></r><r><rPr><rFont val="Microsoft YaHei"/><sz val="11"/><color rgb="${color}"/></rPr><t>${text}</t></r>`:`<t>${text}</t>`;
}
function uiTemplateZip(parts){
 const encoder=new TextEncoder(),chunks=[],directory=[];let offset=0;
 const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0)}return (value^0xffffffff)>>>0};
 for(const [path,xml]of Object.entries(parts)){
  const name=encoder.encode(path),data=encoder.encode(xml),checksum=crc(data),local=new Uint8Array(30+name.length),view=new DataView(local.buffer);
  view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(12,0x5821,true);view.setUint32(14,checksum,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);local.set(name,30);
  const entry=new Uint8Array(46+name.length),central=new DataView(entry.buffer);
  central.setUint32(0,0x02014b50,true);central.setUint16(4,20,true);central.setUint16(6,20,true);central.setUint16(14,0x5821,true);central.setUint32(16,checksum,true);central.setUint32(20,data.length,true);central.setUint32(24,data.length,true);central.setUint16(28,name.length,true);central.setUint32(42,offset,true);entry.set(name,46);
  chunks.push(local,data);directory.push(entry);offset+=local.length+data.length;
 }
 const size=directory.reduce((sum,entry)=>sum+entry.length,0),end=new Uint8Array(22),view=new DataView(end.buffer);
 view.setUint32(0,0x06054b50,true);view.setUint16(8,directory.length,true);view.setUint16(10,directory.length,true);view.setUint32(12,size,true);view.setUint32(16,offset,true);
 return new Blob([...chunks,...directory,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function uiImportWorkbookParts(headers,rows,{required=[],conditional={},layout={},guide=[],example=[]}={}){
 const requiredNames=new Set(required),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const headerRow=guide.length?guide.length+2:1,lastColumn=uiTemplateColumn(headers.length-1);
 const cell=(value,column,row,style,header=false)=>{
  // 仅显式指定的金额列写为数值；标识、年度和日期继续保留为文本。
  if(!header&&layout.numericColumns?.includes(column)&&/^-?\d+(?:\.\d+)?$/.test(String(value)))return `<c r="${uiTemplateColumn(column)}${row}" t="n" s="${style===2?9:style===5?10:8}"><v>${uiTemplateXml(value)}</v></c>`;
  return `<c r="${uiTemplateColumn(column)}${row}" t="inlineStr" s="${style}"><is>${header?uiTemplateHeaderXml(value,requiredNames.has(value)||!!conditional[value],conditional[value],'FFFFFFFF',true):'<t xml:space="preserve">'+uiTemplateXml(value)+'</t>'}</is></c>`;
 };
 const line=(values,row,style,height,header=false)=>`<row r="${row}" ht="${height}" customHeight="1">${values.map((value,column)=>cell(value,column,row,style,header)).join('')}</row>`;
 const instructions=guide.length?['填写说明',...guide]:[];
 const guideRows=instructions.map((text,index)=>line([text],index+1,index?7:6,index?30:38)).join('');
 const sample=example.length?[...example]:null;if(sample)sample[0]='【示例】'+String(sample[0]??'');
 const start=headerRow+(sample?2:1);
 const data=guideRows+line(headers,headerRow,4,guide.length?(layout.headerHeight||42):34,true)+(sample?line(sample,headerRow+1,5,layout.rowHeight||42):'')+(rows.length?rows:[headers.map(()=>'')]).map((values,index)=>line(values,start+index,layout.rowStyles?.[index]||0,layout.rowHeight||26)).join('');
 const merges=instructions.length?`<mergeCells count="${instructions.length}">${instructions.map((_,index)=>`<mergeCell ref="A${index+1}:${lastColumn}${index+1}"/>`).join('')}</mergeCells>`:'';
 const cols=headers.map((label,index)=>`<col min="${index+1}" max="${index+1}" width="${layout.widths?.[index]||Math.min(34,Math.max(14,label.length*2+4+(conditional[label]?12:0)))}" customWidth="1"/>`).join('');
 return {
  '[Content_Types].xml':`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
  '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="导入模板" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  'xl/styles.xml':`<styleSheet xmlns="${ns}"><fonts count="3"><font><sz val="11"/><color rgb="FF304C70"/><name val="Microsoft YaHei"/></font><font><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/><b/></font><font><sz val="16"/><color rgb="FF1E3A5F"/><name val="Microsoft YaHei"/><b/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${['FFF4F7FC','FF294D79','FFFFFCF3','FFDFEAF7'].map(color=>`<fill><patternFill patternType="solid"><fgColor rgb="${color}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="11">${[[0,0],[0,2],[0,5],[0,0],[1,3],[0,4],[2,0],[0,2],[0,0],[0,5],[0,4]].map(([font,fill],index)=>`<xf numFmtId="${index>=8?4:49}" fontId="${font}" fillId="${fill}" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyFont="1"><alignment vertical="center" ${index>=8?'horizontal="right"':''} wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  'xl/worksheets/sheet1.xml':`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" ${layout.frozenColumns?`xSplit="${layout.frozenColumns}"`:""} topLeftCell="${uiTemplateColumn(layout.frozenColumns||0)}${headerRow+1}" activePane="${layout.frozenColumns?"bottomRight":"bottomLeft"}" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${data}</sheetData>${merges}</worksheet>`
 };
}
// 单表入口保持兼容，多表复用同一套单元格样式与填写说明布局。
function uiImportWorkbook(headers,rows,options={}){
 const sheets=options.sheets;if(!sheets)return uiTemplateZip(uiImportWorkbookParts(headers,rows,options));
 if(!sheets.length)throw Error('工作簿至少需要一个Sheet');
 const parts=uiImportWorkbookParts(headers,rows,options),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',names=new Set();
 delete parts['xl/worksheets/sheet1.xml'];
 for(const [index,sheet] of sheets.entries()){
  if(!sheet.name||sheet.name.length>31||/[\\/?*\[\]:]/.test(sheet.name)||names.has(sheet.name))throw Error('Sheet名称无效或重复');names.add(sheet.name);
  parts['xl/worksheets/sheet'+(index+1)+'.xml']=uiImportWorkbookParts(sheet.headers||headers,sheet.rows,{...options,...sheet,sheets:undefined})['xl/worksheets/sheet1.xml'];
 }
 parts['[Content_Types].xml']=parts['[Content_Types].xml'].replace(/<Override PartName="\/xl\/worksheets\/sheet1.xml"[^>]+\/>/,sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join(''));
 parts['xl/workbook.xml']=`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet,i)=>`<sheet name="${uiTemplateXml(sheet.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
 return uiTemplateZip(parts);
}
function downloadImportTemplate(headers,rows,name,options){
 const blob=uiImportWorkbook(headers,rows,options),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=name+'.xlsx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// 导入边界统一日期和产品标识，内部日期键仍保持ISO。
function uiImportDate(value,label='日期'){
 const raw=String(value??'').trim();if(!/^\d{4}\/\d{2}\/\d{2}$/.test(raw))throw Error(label+'格式为YYYY/MM/DD');
 const iso=raw.replaceAll('/','-'),date=new Date(iso+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==iso)throw Error(label+'不是有效日期');return iso;
}
function uiImportSpu(value){
 const code=String(value??'').trim();if(!code)throw Error('产品SPU码必填');
 const matches=sampleSpus.filter(product=>String(product.spuCode)===code);
 if(matches.length!==1)throw Error(matches.length?'SPU码对应多条档案，请核对产品档案':'SPU码不存在，请核对产品档案');return matches[0];
}
