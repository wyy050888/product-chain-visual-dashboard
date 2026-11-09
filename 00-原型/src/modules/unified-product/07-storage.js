const upTaskStorageKey='unified-spu-tasks-v1';
let upTasks={};
try { const saved=JSON.parse(localStorage.getItem(upTaskStorageKey)||'{}'); if(saved&&typeof saved==='object'&&!Array.isArray(saved)) upTasks=saved; } catch(_) {}
// 旧任务仅凭可验证的SPU或对象ID关联，绝不以型号猜测关联。
function upLegacyTasks(spuId) {
  const ledger=inventoryProductLedger(),catalog=qrCatalog(),result=[];
  for(const task of Object.values(riskTasks)) {
    let p=upIdentity(task),platform=task.platform||'unknown';
    if(!p) {
      let record=null;
      if(task.kind===0) record=catalog.find(r=>r.id===task.objectId);
      if(task.kind===2) record=[...upLossSeeds.values()].find(r=>r.id===task.objectId);
      if(task.kind===3) record=ledger[task.objectId-1000];
      if(task.kind===4) record=ledger[task.objectId-2000];
      if(task.kind===6) {
        record=catalog.find(r=>r.id===Math.floor((task.objectId-3000)/6));
        platform=qrPlatforms[(task.objectId-3000)%6]||platform;
      }
      // 旧样例曾更换过主数据；名字不符时不迁移到另一个产品。
      if(record&&record.name===task.objectName) p=upIdentity(record);
    }
    if(p?.spuId!==spuId)continue;
    if([2,3,4].includes(task.kind)&&!task.platform)platform='all';
    result.push({...task,spuId,start:task.start||'',end:task.end||task.cutoff||'',platform,legacy:true});
  }
  return result;
}
function upHistory(spuId) {
  const current=Object.values(upTasks).filter(t=>t.spuId===spuId);
  const inherited=upLegacyTasks(spuId).filter(t=>!current.some(n=>n.id&&n.id===t.id));
  return [...current,...inherited].sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));
}
