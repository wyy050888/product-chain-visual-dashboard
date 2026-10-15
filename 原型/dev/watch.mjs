import fs from 'node:fs';
import path from 'node:path';
import { buildPrototype } from '../build.mjs';

// 仅观察已登记源文件所在目录，生成物不触发构建，避免循环。
export function watchPrototype(root){
 const watchers=new Map();let sources=new Set(),timer;
 function sync(){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  sources=new Set(['manifest.json',manifest.template,'src/runtime/open.js','src/runtime/close.js','build.mjs',...manifest.scripts.map(x=>x.file),...manifest.styles.map(x=>x.file)].map(p=>path.resolve(root,p)));
  const directories=new Set([...sources].map(p=>path.dirname(p)));
  for(const [directory,watcher] of watchers)if(!directories.has(directory)){watcher.close();watchers.delete(directory)}
  for(const directory of directories)if(!watchers.has(directory)){
   const watcher=fs.watch(directory,(_event,name)=>{
    if(!name||!sources.has(path.resolve(directory,name.toString())))return;
    clearTimeout(timer);
    timer=setTimeout(()=>{try{buildPrototype();sync()}catch(error){console.error('构建失败：'+error.message)}},150);
   });
   watcher.on('error',error=>console.error('监听错误：'+error.message));
   watchers.set(directory,watcher);
  }
 }
 buildPrototype();sync();
 console.log('已监听源文件；保存后自动构建。不会打开预览。Ctrl+C停止。');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{
  clearTimeout(timer);for(const watcher of watchers.values())watcher.close();process.exit(0);
 });
}
