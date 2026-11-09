import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';

// 仅维护用户填写所需的说明；保留模板字段、示例及导入周期约束。
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const outputDir=path.join(root,'outputs/template-instructions');
await fs.mkdir(outputDir,{recursive:true});
const common=[
 '填写说明',
 '1. 删除示例行，保留表头；红色*必填。',
 '2. 月份YYYY/MM；填写同一年完整季度或全年，导入后覆盖该周期目标。',
 '3. 人员填写钉钉名称；GSV单位万元；18.5%填18.5。'
];
const context={GoalPrototype:{}};
vm.runInNewContext(await fs.readFile(path.join(root,'数智罗盘/目标管理/scripts/mock-data.js'),'utf8'),context);
const fixtures=context.GoalPrototype.fixtures,example=fixtures.products.find(product=>product.id==='konka-2623'),shop=fixtures.shops[example.shopId],link=fixtures.links.find(row=>row.productId===example.id);
const guides={
 product:[...common,'4. 产品填SPU码，店铺填店铺ID；标识须已建档，名称选填。'],
 link:[...common,'4. 渠道填天猫、京东或拼多多，店铺须与渠道匹配；链接ID设为文本。','5. 产品填SPU码，店铺填店铺ID；标识须已建档，名称选填。']
};
for(const [kind,lines] of Object.entries(guides)){
 const target=path.join(root,'数智罗盘/目标管理/assets/templates',kind+'-target.xlsx');
 const outputPath=path.join(outputDir,kind+'-target.xlsx');
 const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(target));
 const sheet=workbook.worksheets.getItemAt(0);
 sheet.getRange('G2').values=[['店铺ID']];
 sheet.getRange('H2').values=[['产品名称（SPU）']];
 for(let row=3;row<=5;row++){
  sheet.getRange('A'+row+':I'+row).values=[['2026/'+String(row+7),shop.region,example.brand,shop.strategy,shop.promotion,shop.channel,example.shopId,example.product,example.productCode]];
  if(kind==='link'){sheet.getRange('J'+row).values=[[link.linkId]];sheet.getRange('K'+row+':P'+row).values=[[800,16.78,1,12,3,5]]}
  else sheet.getRange('J'+row+':K'+row).values=[[1600,16.78]];
 }
 sheet.getRange('G3:I20').setNumberFormat('@');
 if(kind==='link')sheet.getRange('J3:J20').setNumberFormat('@');
 sheet.getRange('A1').values=[[lines.join('\n')]];
 sheet.getRange('A1').format.wrapText=true;
 sheet.getRange('A1').format.rowHeight=lines.length*19;
 const output=await SpreadsheetFile.exportXlsx(workbook);
 await output.save(outputPath);
 // 显式保留红星与字段字色，兼容WPS富文本显示。
 execFileSync(process.env.DASHBOARD_PYTHON_PATH||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'),[path.join(root,'dev/templates/required_headers.py'),outputPath,kind]);
 await fs.copyFile(outputPath,target);
 const saved=await SpreadsheetFile.importXlsx(await FileBlob.load(target));
 const preview=await saved.render({sheetName:saved.worksheets.getItemAt(0).name,range:kind==='product'?'A1:K3':'A1:P3',scale:1,format:'png'});
 await fs.writeFile(path.join(outputDir,kind+'.png'),new Uint8Array(await preview.arrayBuffer()));
 console.log(kind+'目标模板说明已精简');
}
