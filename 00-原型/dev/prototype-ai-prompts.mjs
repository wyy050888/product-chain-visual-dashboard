import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {readAiPrompts} from './ai-strategy-prompts.mjs';

// 原型展示直接引用当前交付目录的完整提示词，不依赖旧版策略文档中的已移除小节。
export function readPrototypeAiPrompts(){
 const file=new URL('../../01-文档/产品链总看板PRD-重构版/AI策略/02-提示词/02-诊断分析.md',import.meta.url);
 if(!fs.existsSync(file))return readAiPrompts();
 const text=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),sections=new Map();
 for(const match of text.matchAll(/^## (\d{2})-([^\n]+)\n+````text\n([\s\S]*?)\n````/gm))sections.set(match[1],{title:match[2],body:match[3]});
 const result={hashes:{diagnosis:createHash('sha256').update(text).digest('hex')}};
 for(const [kind,ids]of Object.entries({total:['04','05','06','07','08','09','10'],product:['11'],shop:['12'],root:['13']})){
  result[kind]=ids.map(id=>{const section=sections.get(id);if(!section)throw Error('原型提示词缺少章节：'+id);return '【'+id+'-'+section.title+'】\n'+section.body}).join('\n\n');
 }
 return result;
}
