const pcWeeklyVersions=new Map();
let pcWeeklyDb,pcWeeklyInitialLoad;

function pcWeeklyOpenDb(){
 return pcWeeklyDb??=new Promise((resolve,reject)=>{
  const request=indexedDB.open('dashboard-product-weekly-reports',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('versions',{keyPath:'id',autoIncrement:true});
  request.onsuccess=()=>{
   const db=request.result;
   db.onversionchange=()=>{db.close();pcWeeklyDb=null};
   resolve(db);
  };
  request.onerror=()=>reject(request.error);
 }).catch(error=>{pcWeeklyDb=null;throw error});
}

async function pcWeeklyStoredVersions(entry){
 const db=await pcWeeklyOpenDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('versions',entry?'readwrite':'readonly'),store=tx.objectStore('versions');
  if(entry)store.add(entry);
  const request=store.getAll();
  tx.oncomplete=()=>resolve(request.result);
  tx.onabort=()=>reject(tx.error);
 });
}

function pcWeeklySetVersions(records){
 pcWeeklyVersions.clear();
 // IndexedDB 按自增主键读取，倒序得到每周最新版本。界面只保留元数据。
 for(const {id,week,name,actor,at} of records.reverse()){
  const versions=pcWeeklyVersions.get(week)||[];
  versions.push({id,name,actor,at});
  pcWeeklyVersions.set(week,versions);
 }
}

function pcWeeklyInitVersions(){
 return pcWeeklyInitialLoad??=pcWeeklyStoredVersions().then(records=>{
  pcWeeklySetVersions(records);
  if(records.length&&pcIsActive())gdRender({reuseData:true});
 }).catch(()=>{});
}

async function pcWeeklyAddVersion(week,file){
 await pcWeeklyInitVersions();
 const actor=document.querySelector('.admin-account')?.textContent.trim()||'管理员账户';
 const at=new Date().toISOString();
 pcWeeklySetVersions(await pcWeeklyStoredVersions({week,name:file.name,actor,at,file}));
}

async function pcWeeklyDownloadVersion(id){
 try{
  const db=await pcWeeklyOpenDb();
  const version=await new Promise((resolve,reject)=>{
   const request=db.transaction('versions').objectStore('versions').get(id);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  if(!version?.file)throw new Error('周报文件缺失');
  gdSaveWeeklyReportBlob(version.file,version.name);
 }catch{toast('周报下载失败，请重试')}
}
