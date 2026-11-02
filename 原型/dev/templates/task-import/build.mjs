import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {FileBlob, SpreadsheetFile, Workbook} from '@oai/artifact-tool';

// 仅生成应用下载模板；字段名与 global-task-entry/02-import-model.js 保持一致。
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const outputDir=path.join(root,'outputs/task-import-template');
const assetDir=path.join(root,'assets/templates');
await fs.mkdir(outputDir,{recursive:true});await fs.mkdir(assetDir,{recursive:true});
const previous=await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(assetDir,'任务导入模板.xlsx')));
const before=await previous.render({sheetName:'任务导入',range:'A1:H12',scale:1,format:'png'});
await fs.writeFile(path.join(outputDir,'before.png'),new Uint8Array(await before.arrayBuffer()));
const workbook=Workbook.create(),sheet=workbook.worksheets.add('任务导入');
sheet.showGridLines=false;
sheet.getRange('A1:I20').format={font:{name:'Arial',size:11,color:'#24364B'},verticalAlignment:'center',rowHeight:30};
const widths=[16,34,38,30,12,44,44,26,22];
widths.forEach((width,index)=>sheet.getRangeByIndexes(0,index,20,1).format.columnWidth=width);
const instructions=[
 '填写说明',
 '1. 表头下方每行一条任务，保留表头；红色*必填；【示例】行自动忽略。',
 '2. 负责人填写钉钉名称，多人用“、”分隔；优先级P0～P3，留空为P2。',
 '3. 完成日期：YYYY/MM/DD，不早于导入当天。',
 '4. 业务对象类型可填：产品、项目、店铺；不关联时，类型、业务对象、业务对象名称均留空。',
 '5. 产品：业务对象填SPU码；店铺：业务对象填店铺ID；业务对象名称选填对应产品或店铺全名，系统按编码匹配。',
 '6. 项目：业务对象留空，业务对象名称填完整项目名称。'
];
instructions.forEach((text,index)=>{sheet.mergeCells(`A${index+1}:I${index+1}`);sheet.getRange(`A${index+1}`).values=[[text]]});
sheet.getRange('A1:I1').format={font:{size:16,bold:true,color:'#1E3A5F'},rowHeight:38,borders:{bottom:{style:'thin',color:'#A9B9D0'}}};
sheet.getRange(`A2:I${instructions.length}`).format.fill='#F4F7FC';
const headerRow=instructions.length+1,sampleRow=headerRow+1;
sheet.getRange(`A${headerRow}:I${headerRow}`).values=[['业务对象类型','业务对象','业务对象名称','事项名称','优先级','问题描述','执行事项','负责人','计划完成日期']];
sheet.getRange(`A${headerRow}:I${headerRow}`).format={fill:'#294D79',font:{bold:true,color:'#FFFFFF'},horizontalAlignment:'center',rowHeight:34};
sheet.getRange(`A${sampleRow}:I20`).format={fill:'#FFFCF3',wrapText:true,verticalAlignment:'top',borders:{insideHorizontal:{style:'thin',color:'#E5EAF0'}},rowHeight:42};
sheet.getRange(`B${sampleRow}:B20`).setNumberFormat('@');
sheet.getRange(`I${sampleRow}:I20`).setNumberFormat('yyyy/mm/dd');
const exampleDue=new Date(Date.now()+7*86400000).toISOString().slice(0,10).replaceAll('-','/');
sheet.getRange(`A${sampleRow}:I${sampleRow}`).values=[['【示例】产品','CW-LJ-QNQ-A817','创维取暖器高塔机械款A817','跟进样品交付','P2','样品交付时间待确认','确认交付日期并同步进度','林悦',exampleDue]];
sheet.getRange(`A${sampleRow}:I${sampleRow}`).format.fill='#FFF5DD';
workbook.recalculate();
console.log((await workbook.inspect({kind:'table',range:'任务导入!A1:I10',include:'values,formulas',tableMaxRows:10,tableMaxCols:9,maxChars:1800})).ndjson);
console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:10},summary:'模板公式错误检查',maxChars:500})).ndjson);
const output=await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir,'任务导入模板.xlsx'));
// OOXML富文本补丁仅给星号着红色，避免整段表头变红；重建模板也保留标记。
execFileSync(process.env.DASHBOARD_PYTHON_PATH||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'),[path.join(root,'dev/templates/required_headers.py'),path.join(outputDir,'任务导入模板.xlsx'),'task']);
await fs.copyFile(path.join(outputDir,'任务导入模板.xlsx'),path.join(assetDir,'任务导入模板.xlsx'));
const saved=await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(assetDir,'任务导入模板.xlsx')));
const preview=await saved.render({sheetName:'任务导入',range:'A1:I12',scale:1,format:'png'});
await fs.writeFile(path.join(outputDir,'preview.png'),new Uint8Array(await preview.arrayBuffer()));
console.log('模板生成完成。');
