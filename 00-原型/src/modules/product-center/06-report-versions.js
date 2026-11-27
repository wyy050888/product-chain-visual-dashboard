const pcWeeklyStores=new Map();

function pcWeeklyStore(scope){
 if(!pcWeeklyStores.has(scope))pcWeeklyStores.set(scope,{versions:new Map()});
 return pcWeeklyStores.get(scope);
}

function pcWeeklyOpenDb(scope){
 const state=pcWeeklyStore(scope);
 return state.db??=new Promise((resolve,reject)=>{
  const request=indexedDB.open(`dashboard-${scope}-weekly-reports`,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('versions',{keyPath:'id',autoIncrement:true});
  request.onsuccess=()=>{
   const db=request.result;
   db.onversionchange=()=>{db.close();state.db=null};
   resolve(db);
  };
  request.onerror=()=>reject(request.error);
 }).catch(error=>{state.db=null;throw error});
}

async function pcWeeklyStoredVersions(scope,entry){
 const db=await pcWeeklyOpenDb(scope);
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('versions',entry?'readwrite':'readonly'),store=tx.objectStore('versions');
  if(entry)store.add(entry);
  const request=store.getAll();
  tx.oncomplete=()=>resolve(request.result);
  tx.onabort=()=>reject(tx.error);
 });
}

function pcWeeklySetVersions(scope,records){
 const {versions}=pcWeeklyStore(scope);
 versions.clear();
 // IndexedDB 按自增主键读取，倒序得到每周最新版本。界面只保留元数据。
 for(const {id,week,name,actor,at} of records.reverse()){
  const history=versions.get(week)||[];
  history.push({id,name,actor,at});
  versions.set(week,history);
 }
}

function pcWeeklyInitVersions(scope){
 const state=pcWeeklyStore(scope);
 return state.initialLoad??=pcWeeklyStoredVersions(scope).then(records=>{
  pcWeeklySetVersions(scope,records);
  if(records.length&&pcCanAccessWeeklyScope(scope))gdRender({reuseData:true});
 }).catch(()=>{});
}

async function pcWeeklyAddVersion(scope,week,file){
 await pcWeeklyInitVersions(scope);
 const actor=(qcIsActive()?qcAccess.accountName:null)||document.querySelector('.admin-account')?.textContent.trim()||'管理员账户';
 const at=new Date().toISOString();
 pcWeeklySetVersions(scope,await pcWeeklyStoredVersions(scope,{week,name:file.name,actor,at,file}));
}

async function pcWeeklyDownloadVersion(scope,id){
 try{
  const db=await pcWeeklyOpenDb(scope);
  const version=await new Promise((resolve,reject)=>{
   const request=db.transaction('versions').objectStore('versions').get(id);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  if(!version?.file)throw new Error('周报文件缺失');
  gdSaveWeeklyReportBlob(version.file,version.name);
 }catch{toast('周报下载失败，请重试')}
}
