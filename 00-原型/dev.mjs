import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const [command='help',...args]=process.argv.slice(2);
try {
 if(command==='locate')(await import('./dev/locate.mjs')).locate(root,args.join(' '));
 else if(command==='audit')(await import('./dev/locate.mjs')).audit(root);
 else if(command==='build'||command==='quick')(await import('./build.mjs')).buildPrototype();
 else if(command==='watch')await (await import('./dev/watch.mjs')).watchPrototype(root);
 else if(command==='check'){
  const {checkPlan}=await import('./dev/check-plan.mjs'),plan=checkPlan(root,args);
  if(plan.planOnly)console.log('将检查：'+plan.names.join('、'));
  else{(await import('./build.mjs')).buildPrototype();await (await import('./dev/browser-check.mjs')).checkBrowser(root,plan)}
 }
 else if(command==='help')console.log('node dev.mjs locate 关键词或函数名\nnode dev.mjs audit\nnode dev.mjs quick（构建与语法检查，不启动浏览器）\nnode dev.mjs check 范围或检查名 [更多范围] [--plan|--force]\nnode dev.mjs check --only 检查名（仅指定专项，不扩展登记范围）\nnode dev.mjs watch（同项目只启动一份监听）');
 else throw new Error('未知命令：'+command);
} catch(error){console.error(error.message);process.exitCode=1}
