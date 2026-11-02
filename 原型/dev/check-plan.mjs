import fs from 'node:fs';
import path from 'node:path';

// 先解析全部范围，拼写错误在构建和浏览器启动前报出。
export function checkPlan(root,args=['smoke'],env=process.env){
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'dev/check-catalog.json'),'utf8'));
 const areas=JSON.parse(fs.readFileSync(path.join(root,'dev/areas.json'),'utf8'));
 const scopes=args.filter(arg=>!arg.startsWith('--'));
 const unknown=args.filter(arg=>arg.startsWith('--')&&!['--plan','--force','--only'].includes(arg));
 if(unknown.length)throw new Error('未知检查选项：'+unknown.join('、'));
 const selected=scopes.length?scopes:['smoke'],names=[],only=args.includes('--only');
 const explicit=env.DASHBOARD_CHECK_NAMES?.split(',').map(name=>name.trim()).filter(Boolean);
 for(const scope of explicit||selected){
  const checks=scope==='all'?Object.keys(catalog):explicit||only?(catalog[scope]?[scope]:null):areas[scope]?.checks||(catalog[scope]?[scope]:null);
  if(!checks?.length)throw new Error('未知检查范围：'+scope+'；用 node dev.mjs locate 关键词 查找入口。');
  for(const name of checks){if(!catalog[name])throw new Error('检查未登记：'+name);names.push(name)}
 }
 return {names:[...new Set(names)],catalog,scopes:selected,notes:[...new Set(selected.flatMap(scope=>areas[scope]?.manual||[]))],
  force:args.includes('--force'),planOnly:args.includes('--plan')};
}
