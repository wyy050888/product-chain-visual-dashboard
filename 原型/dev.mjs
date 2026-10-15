import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildPrototype } from './build.mjs';
import { locate, audit } from './dev/locate.mjs';
import { checkBrowser } from './dev/browser-check.mjs';
import { watchPrototype } from './dev/watch.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const [command='help',...args]=process.argv.slice(2);
try {
 if(command==='locate')locate(root,args.join(' '));
 else if(command==='audit')audit(root);
 else if(command==='build')buildPrototype();
 else if(command==='watch')watchPrototype(root);
 else if(command==='check'){buildPrototype();await checkBrowser(root,args[0]||'smoke')}
 else if(command==='help')console.log('node dev.mjs locate 关键词或函数名\nnode dev.mjs audit\nnode dev.mjs build\nnode dev.mjs check smoke|filters|risk|all\nnode dev.mjs watch');
 else throw new Error('未知命令：'+command);
} catch(error){console.error(error.message);process.exitCode=1}
