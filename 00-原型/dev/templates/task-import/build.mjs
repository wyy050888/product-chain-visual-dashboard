import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {FileBlob, SpreadsheetFile} from '@oai/artifact-tool';

// 窄范围更新当前14列模板，不重建样例与版式；富文本由公共补丁保留完整字体。
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const asset=path.join(root,'assets/templates/任务导入模板.xlsx');
const outputDir=path.resolve(root,'../outputs/task-template-departments-20261106');
const target=path.join(outputDir,'任务导入模板.xlsx');
await fs.mkdir(outputDir,{recursive:true});
const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(asset));
const sheet=workbook.worksheets.getItemAt(0);
const original=sheet.getRange('A8:N10').values;
if(original[0].length!==14||!original[0][0].includes('登记日期'))throw Error('任务模板需为当前14列版本');
if(process.argv.includes('--preview')){const before=await workbook.render({sheetName:sheet.name,range:'J8:N10',scale:1,format:'png'});await fs.writeFile(path.join(outputDir,'before.png'),new Uint8Array(await before.arrayBuffer()));console.log(path.join(outputDir,'before.png'));process.exit(0)}
sheet.getRange('A4').values=[['3. 提需人、责任人、第二负责人填写钉钉人员姓名，多人用“、”分隔；责任人、所属部门必填。所属部门从下拉选择，链群、任务类型按实际填写。']];
sheet.getRange('K8').values=[['*所属部门']];
sheet.getRange('A8:N8').format.font={name:'Microsoft YaHei',size:11,bold:true,color:'#FFFFFF'};
sheet.getRange('K9:K1010').dataValidation={rule:{type:'list',values:['采购部','产品链','项目部','产品中心','订单履约部','发货部','风控中心','计划管理部','品质中心','研发中心','用户中心']}};
workbook.recalculate();
await (await SpreadsheetFile.exportXlsx(workbook)).save(target);
execFileSync(process.env.DASHBOARD_PYTHON_PATH||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'),[path.join(root,'dev/templates/required_headers.py'),target,'task-ledger'],{stdio:'inherit'});
await fs.copyFile(target,asset);
await fs.copyFile(target,path.resolve(root,'../01-文档/产品链总看板PRD-重构版/导入模板/任务导入模板.xlsx'));
const final=await SpreadsheetFile.importXlsx(await FileBlob.load(target));
const values=final.worksheets.getItemAt(0).getRange('A9:N10').values;
if(JSON.stringify(values)!==JSON.stringify(original.slice(1)))throw Error('样例内容变化');
const preview=await final.render({sheetName:sheet.name,range:'J8:N10',scale:1,format:'png'});
await fs.writeFile(path.join(outputDir,'format-check.png'),new Uint8Array(await preview.arrayBuffer()));
console.log('14列模板已更新：7项必填、部门11选项、人员多选填写说明；样例及换行保持。');
