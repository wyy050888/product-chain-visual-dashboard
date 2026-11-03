import fs from 'node:fs';
import path from 'node:path';

// 逐文件读写，避免当前Windows运行环境的原生目录复制中断进程。
export function copyFiles(source,destination,{filter=()=>true}={}){
 if(!filter(source))return;
 const entry=fs.lstatSync(source);
 if(entry.isSymbolicLink())throw new Error('发布资源不支持符号链接：'+source);
 if(entry.isDirectory()){
  fs.mkdirSync(destination,{recursive:true});
  for(const name of fs.readdirSync(source))copyFiles(path.join(source,name),path.join(destination,name),{filter});
 }else if(entry.isFile()){
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,fs.readFileSync(source));
 }else throw new Error('发布资源类型无效：'+source);
}
