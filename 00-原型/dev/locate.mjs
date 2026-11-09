import fs from 'node:fs';
import path from 'node:path';

function inventory(root){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 return [...manifest.scripts,...manifest.styles].map((item,index)=>({...item,index,text:fs.readFileSync(path.join(root,item.file),'utf8')}));
}
function areas(root){return JSON.parse(fs.readFileSync(path.join(root,'dev/areas.json'),'utf8'))}
function escapePattern(text){return text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
export function locate(root,query){
 if(!query.trim())throw new Error('请提供业务关键词或函数名。');
 const entries=inventory(root),registry=areas(root),symbol=/^[A-Za-z_$][\w$]*$/.test(query);
 const direct=Object.entries(registry).filter(([name,area])=>name===query||(area.keywords||[]).some(k=>query.includes(k)));
 const owners=direct.length?direct:symbol?Object.entries(registry).filter(([,area])=>area.sources.some(p=>entries.find(e=>e.file===p)?.text.includes(query))).slice(0,2):[];
 const preferred=new Set(owners.flatMap(([,area])=>[...area.sources,...(area.styles||[])]));
 for(const [name,area] of owners){
  {
   console.log('\n修改入口 '+name+'：'+area.label);
   for(const file of [...area.sources,...(area.styles||[])])console.log('  '+file);
   console.log('  检查：node dev.mjs check '+name);
   for(const note of area.manual||[])console.log('  补充验证：'+note);
  }
 }
 const matcher=symbol?new RegExp('\\b'+escapePattern(query)+'\\b'):null;
 const writes=symbol?new RegExp('(?:function\\s+'+escapePattern(query)+'\\b|(?:^|[;}])\\s*'+escapePattern(query)+'\\s*=)'):null;
 const matches=[],overrides=[];
 for(const item of entries)for(const [i,line] of item.text.split('\n').entries()){
  if(!(matcher?matcher.test(line):line.includes(query)))continue;
  const match={file:item.file,line:i+1,text:line.trim().slice(0,180)};
  matches.push(match);if(writes?.test(line))overrides.push(match);
 }
 if(overrides.length){console.log('\n定义/覆盖候选（按manifest顺序；包装和条件分支仍需核对）');for(const m of overrides)console.log('  '+m.file+':'+m.line+' '+m.text)}
 console.log('\n源码引用 '+matches.length+' 处（前16处，不搜索生成文件及历史输出）');
 for(const m of matches.sort((a,b)=>Number(preferred.has(b.file))-Number(preferred.has(a.file))).slice(0,16))console.log('  '+m.file+':'+m.line+' '+m.text);
}
export function audit(root){
 const entries=inventory(root),scripts=entries.filter(e=>e.file.endsWith('.js')),styles=entries.filter(e=>e.file.endsWith('.css'));
 console.log('源码：'+scripts.length+' 个脚本，'+styles.length+' 个样式；均按manifest顺序运行。');
 console.log('业务代码体积最大的6个文件（不含样例数据）');
 for(const item of scripts.filter(e=>e.file.startsWith('src/modules/')).sort((a,b)=>Buffer.byteLength(b.text)-Buffer.byteLength(a.text)).slice(0,6)){
  console.log('  '+item.file+' '+(Buffer.byteLength(item.text)/1024).toFixed(1)+'KB / '+item.text.split('\n').length+'行');
 }
 console.log('可用修改范围：'+Object.keys(areas(root)).join('、'));
}
