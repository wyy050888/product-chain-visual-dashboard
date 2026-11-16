import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

const strategyRoot=new URL('../../01-文档/产品链总看板PRD-重构版/AI策略（补充部门诊断）/',import.meta.url);
const samples=new URL('部门诊断周报示例/',strategyRoot);

export function weeklyReportSampleFiles(){
 const files=new Map();
 for(const entry of fs.readdirSync(samples,{recursive:true,withFileTypes:true})){
  if(!entry.isFile()||!/第43周(?:总)?周报\.pdf$/.test(entry.name))continue;
  if(files.has(entry.name))throw new Error('周报示例文件重名：'+entry.name);
  files.set(entry.name,path.join(entry.parentPath,entry.name));
 }
 return files;
}

// 原型展示直接引用当前交付目录的完整提示词，不依赖旧版策略文档中的已移除小节。
export function readPrototypeAiPrompts(){
 const text=fs.readFileSync(new URL('02-提示词/02-诊断分析.md',strategyRoot),'utf8').replace(/\r\n/g,'\n'),sections=new Map();
 const productText=fs.readFileSync(new URL('02-提示词/04-产品详情诊断.md',strategyRoot),'utf8').replace(/\r\n/g,'\n');
 const product=/^## 老品无原建议\n+````text\n([\s\S]*?)\n````/m.exec(productText);
 if(!product)throw new Error('原型提示词缺少老品无原建议章节');
 for(const match of text.matchAll(/^## (\d{2})-([^\n]+)\n+````text\n([\s\S]*?)\n````/gm))sections.set(match[1],{title:match[2],body:match[3]});
 const result={hashes:{diagnosis:createHash('sha256').update(text).digest('hex'),product:createHash('sha256').update(productText).digest('hex')},product:product[1]};
 for(const [kind,ids]of Object.entries({total:['04','05','06','07','08','09'],shop:['12'],root:['13']})){
  result[kind]=ids.map(id=>{const section=sections.get(id);if(!section)throw Error('原型提示词缺少章节：'+id);return '【'+id+'-'+section.title+'】\n'+section.body}).join('\n\n');
 }
 return result;
}
