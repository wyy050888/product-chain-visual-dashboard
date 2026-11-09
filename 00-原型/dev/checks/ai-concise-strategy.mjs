import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export async function aiConciseStrategy(){execFileSync(process.execPath,['--test',fileURLToPath(new URL('../test-ai-concise-contract.mjs',import.meta.url))],{encoding:'utf8',stdio:'pipe'})}
