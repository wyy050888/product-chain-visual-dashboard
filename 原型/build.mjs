import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const root=path.dirname(fileURLToPath(import.meta.url));
function read(relative){
 const absolute=path.resolve(root,relative);
 if(!absolute.startsWith(root+path.sep))throw new Error('路径超出原型目录：'+relative);
 return fs.readFileSync(absolute,'utf8');
}
function writeIfChanged(relative,content){
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep))throw new Error('路径超出原型目录：'+relative);
 if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===content)return 0;
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);return 1;
}
const version=content=>createHash('sha256').update(content).digest('hex').slice(0,12);

// 仍按原manifest次序拼接共享闭包；开发工具复用同一个构建器。
export function buildPrototype({quiet=false}={}){
 const started=performance.now(),manifest=JSON.parse(read('manifest.json'));
 const previewStyles=manifest.styles.map(item=>read(item.file)).join('\n');
 const app=read('src/runtime/open.js')+'const drawerPreviewCss = '+JSON.stringify(previewStyles)+';\n'
  +manifest.scripts.map(item=>read(item.file)).join('')+read('src/runtime/close.js');
 new vm.Script(app,{filename:'assets/app.js'});
 for(const file of manifest.images)if(!fs.existsSync(path.join(root,file)))throw new Error('图片缺失：'+file);
 const styles=manifest.styles.map(item=>'<link rel="stylesheet" href="'+item.file+'?v='+version(read(item.file))+'">').join('\n');
 let page=read(manifest.template);
 for(const marker of ['<!-- DASHBOARD_STYLES -->','<!-- DASHBOARD_SCRIPT -->'])if(page.split(marker).length!==2)throw new Error('页面模板标记异常：'+marker);
 page=page.replace('<!-- DASHBOARD_STYLES -->',styles)
  .replace('<!-- DASHBOARD_SCRIPT -->','<script src="assets/app.js?v='+version(app)+'"></script>');
 const written=writeIfChanged('assets/app.js',app)+writeIfChanged(manifest.entry,page);
 const result={scripts:manifest.scripts.length,styles:manifest.styles.length,images:manifest.images.length,written,ms:Number((performance.now()-started).toFixed(1))};
 if(!quiet)console.log('构建完成：'+result.scripts+' 个脚本模块，'+result.styles+' 个样式文件，'+result.images+' 张图片；更新 '+written+' 个生成文件；'+result.ms+'ms。');
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildPrototype();
