// 有界 LRU；数值台账按逐日记录数计权，回看多个周期时不会无限增长。
function boundedCache(maxEntries, maxWeight=Infinity) {
  const entries=new Map();let totalWeight=0;
  return {
    get(key) {const item=entries.get(key);if(!item)return undefined;entries.delete(key);entries.set(key,item);return item.value;},
    set(key,value,weight=1) {
      const previous=entries.get(key);if(previous){totalWeight-=previous.weight;entries.delete(key);}
      if(weight>maxWeight)return value;
      entries.set(key,{value,weight});totalWeight+=weight;
      while(entries.size>maxEntries||totalWeight>maxWeight){const oldest=entries.keys().next().value;totalWeight-=entries.get(oldest).weight;entries.delete(oldest);}
      return value;
    },
    clear(){entries.clear();totalWeight=0;},
    get size(){return entries.size;},
    get weight(){return totalWeight;}
  };
}
