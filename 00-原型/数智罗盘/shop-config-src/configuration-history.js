/* Immutable operation snapshots, independent from daily performance-attribution snapshots. */
const ConfigurationHistory = (() => {
  const copy = value => value ? structuredClone(value) : null;
  function migrate(record) {
    const {before,after} = record;
    // Earlier versions compared two different configs and mislabeled them as an edit.
    if (before && after && before.id && after.id) {
      record.action = before.id === after.id ? 'update' : 'create';
    } else if (!before && after) record.action = 'create';
    else if (before && !after) record.action = 'cancel';
    if (record.action === 'create' && before) {
      record.legacyPreviousConfig ||= before; // Preserve the old context without presenting it as an edit.
      record.before = null;
    }
  }
  function append(shop, {action, before, after, changedBy, changedAt}) {
    shop.changes ||= [];
    shop.changes.push({id:crypto.randomUUID(),action,configId:(after || before).id,
      effectiveDate:(after || before).start,before:action === 'create' ? null : copy(before),after:copy(after),
      beforeKnown:true,changedBy,changedAt});
  }
  function initialize(shop, original) {
    if (Array.isArray(shop.changes)) {
      shop.changes.forEach(migrate);
      return;
    }
    const fixtures = [...original.configs].sort((a,b) => a.start.localeCompare(b.start));
    shop.changes = shop.configs.map(c => {
      const index = fixtures.findIndex(f => JSON.stringify(f) === JSON.stringify(c));
      // Initial config snapshots represent creation; lost legacy edits cannot be reconstructed.
      const known = index >= 0;
      return {id:`initial-${c.id}`,action:'create',configId:c.id,
        effectiveDate:c.start,before:null,after:copy(c),
        beforeKnown:known,changedBy:c.changedBy || null,changedAt:c.changedAt || null};
    });
  }
  return {append,initialize};
})();
if (typeof module !== 'undefined') module.exports = ConfigurationHistory;
