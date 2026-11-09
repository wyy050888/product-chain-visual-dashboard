import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const alive=pid=>{try{process.kill(pid,0);return true}catch(error){return error.code!=='ESRCH'}};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// 锁只覆盖本项目的重型验证/监听，不限制各会话读写独立业务源文件。
export function tryProcessLock(root,name){
 const directory=path.join(root,'.dev-cache',name+'.lock'),ownerFile=path.join(directory,'owner.json');
 fs.mkdirSync(path.dirname(directory),{recursive:true});
 for(let attempt=0;attempt<2;attempt++){
  try{fs.mkdirSync(directory)}catch(error){
   if(error.code!=='EEXIST')throw error;
   let owner=null;try{owner=JSON.parse(fs.readFileSync(ownerFile,'utf8'))}catch{}
   if(owner?.pid&&alive(owner.pid))return {owner};
   // 创建锁到写入owner之间留出宽限，避免两个进程同时回收新锁。
   try{if(!owner&&Date.now()-fs.statSync(directory).mtimeMs<30000)return {owner}}catch(error){if(error.code==='ENOENT')continue;throw error}
   const stale=directory+'.stale-'+randomUUID();
   try{fs.renameSync(directory,stale)}catch(error){if(['ENOENT','EEXIST','EPERM'].includes(error.code))continue;throw error}
   fs.rmSync(stale,{recursive:true,force:true});
   continue;
  }
  const owner={pid:process.pid,token:randomUUID(),startedAt:new Date().toISOString()};
  fs.writeFileSync(ownerFile,JSON.stringify(owner));
  const release=()=>{
   try{if(JSON.parse(fs.readFileSync(ownerFile,'utf8')).token!==owner.token)return;fs.unlinkSync(ownerFile);fs.rmdirSync(directory)}catch(error){if(error.code!=='ENOENT')throw error}
  };
  return {owner,release};
 }
 return {owner:null};
}
export async function acquireProcessLock(root,name,{onWait=()=>{},timeout=15*60*1000}={}){
 const start=Date.now();let announced=false;
 while(true){
  const lock=tryProcessLock(root,name);if(lock.release)return lock;
  if(!announced){onWait(lock.owner);announced=true}
  if(Date.now()-start>timeout)throw new Error('等待项目'+name+'锁超时；现有进程仍在运行，未强制结束。');
  await pause(300);
 }
}
