// Compare only edited stores so unrelated edits in another tab remain intact.
function mergeShopChanges(previous,next,stored) {
  if (!Array.isArray(stored?.shops)) return next;
  const changed = next.filter(shop => JSON.stringify(shop) !== JSON.stringify(previous.find(old => old.id === shop.id)));
  for (const shop of changed) {
    const expected = previous.find(old => old.id === shop.id);
    const latest = stored.shops.find(current => current.id === shop.id);
    if (JSON.stringify(expected) !== JSON.stringify(latest)) throw new Error('SHOP_CONFLICT');
  }
  return next.map(shop => changed.includes(shop) ? shop : stored.shops.find(current => current.id === shop.id) || shop);
}
if (typeof module !== 'undefined') module.exports = mergeShopChanges;
