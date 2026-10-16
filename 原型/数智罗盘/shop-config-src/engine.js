/* Configurations are immutable after their start date. Snapshots capture effective ownership. */
const Assignment = (() => {
  const iso = d => d.toISOString().slice(0, 10);
  const date = s => new Date(`${s}T00:00:00Z`);
  const shift = (s, days) => { const d = date(s); d.setUTCDate(d.getUTCDate() + days); return iso(d); };
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && Number.isFinite(+date(s)) && iso(date(s)) === s;
  const formatDate = value => validDate(value) ? value.replaceAll('-','/') : '--';
  const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
  const stamp = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day || lastDay(year, month)).padStart(2, '0')}`;
  const crossYear = s => s.em * 100 + s.ed < s.sm * 100 + s.sd;
  // In common years a Feb 29 start advances to Mar 1; an inclusive end clamps to Feb 28.
  const annualStart = (year, s) => iso(new Date(Date.UTC(year, s.sm - 1, s.sd)));
  const annualEnd = (year, s) => stamp(year, s.em, Math.min(s.ed,lastDay(year,s.em)));
  function hits(s, day) {
    const year = +day.slice(0, 4);
    return [year - 1, year].some(y => day >= annualStart(y,s) && day <= annualEnd(y + Number(crossYear(s)),s));
  }
  const ordered = shop => [...shop.configs].sort((a, b) => a.start.localeCompare(b.start));
  const earliestStart = (shop,today) => shop.configs.length ? shift(today,1) : today;
  const configAt = (shop, day) => ordered(shop).filter(c => c.start <= day).at(-1) || null;
  function resolve(shop, day) {
    const config = configAt(shop, day);
    if (!config) return null;
    const owner = config.type === 'long' ? config : config.segments.find(s => hits(s, day));
    return owner ? {region: owner.region, owner: owner.owner, configId: config.id, type: config.type} : null;
  }
  const same = (a, b) => a && b && a.region === b.region && a.owner === b.owner && a.configId === b.configId;
  function boundaries(shop, from, to) {
    const days = new Set();
    for (const c of ordered(shop)) {
      days.add(c.start);
      if (c.type !== 'annual') continue;
      for (let y = +from.slice(0, 4) - 1; y <= +to.slice(0, 4); y++) {
        for (const s of c.segments) days.add(annualStart(y,s));
      }
    }
    return [...days].filter(d => d >= from && d <= to).sort();
  }
  function next(shop, day) {
    const limit = stamp(Math.min(9998, +day.slice(0, 4) + 2), 12, 31);
    // Include remote future replacements without walking every intervening year.
    const candidates = new Set([...boundaries(shop, shift(day, 1), limit), ...shop.configs.filter(c => c.start > day).map(c => c.start)]);
    const current = resolve(shop, day);
    for (const d of [...candidates].sort()) {
      const person = resolve(shop, d);
      if (person && !same(current, person)) return {date: d, ...person};
    }
    return null;
  }
  function coverage(segments) {
    const years = [2027,2028].map(year => {
      const result = {year,gap:[],overlap:[]};
      for (let day = `${year}-01-01`; day <= `${year}-12-31`; day = shift(day,1)) {
        const count = segments.filter(s => hits(s,day)).length;
        if (!count) result.gap.push(day);
        if (count > 1) result.overlap.push(day);
      }
      return result;
    });
    function ranges(days,year,annotateLeap = false) {
      if (!days.length) return '';
      if (days.length === (lastDay(year,2) === 29 ? 366 : 365)) return '全年';
      const groups = [];
      for (const day of days) {
        const last = groups.at(-1);
        if (last && shift(last.end,1) === day) last.end = day;
        else groups.push({start:day,end:day});
      }
      // Annual coverage is circular: Dec 31 and Jan 1 belong to one continuous gap.
      if (groups.length > 1 && groups[0].start === `${year}-01-01` && groups.at(-1).end === `${year}-12-31`) {
        const first = groups.shift(), last = groups.pop();
        groups.push({start:last.start,end:first.end,cross:true});
      }
      const label = day => `${+day.slice(5,7)} 月 ${+day.slice(8)} 日`;
      return groups.map(r => {
        let text = r.start === r.end ? label(r.start) : `${label(r.start)}至${r.cross ? '次年 ' : ''}${label(r.end)}`;
        if (annotateLeap && r.end.endsWith('02-29')) text += r.start === r.end ? '（仅闰年）' : '（平年到 2 月 28 日）';
        return text;
      }).join('、');
    }
    function describe(kind) {
      const common = years[0][kind], leap = years[1][kind];
      const monthDays = dates => dates.map(d => d.slice(5)).filter(d => d !== '02-29').join(',');
      if (monthDays(common) === monthDays(leap)) return ranges(leap,2028,true);
      return [common.length ? `平年 ${ranges(common,2027)}` : '',leap.length ? `闰年 ${ranges(leap,2028)}` : ''].filter(Boolean).join('；');
    }
    const overlap = describe('overlap'), gap = describe('gap');
    if (overlap) return `时段重叠：${overlap}，请调整。`;
    if (gap) {
      const period = gap === '全年' || /^(平年|闰年)/.test(gap) || gap.includes('（仅闰年）') ? gap : `每年 ${gap}`;
      return `本次配置未覆盖：${period}，请补齐后保存。`;
    }
    return '';
  }
  function validate(c, shop, today, directory) {
    if (!validDate(c.start) || c.start < earliestStart(shop,today) || c.start > '2099-12-31') return `开始日期须为 ${formatDate(earliestStart(shop,today))} 至 2099/12/31，不能改写已生效记录。`;
    if (shop.configs.some(p => p.id === c.id && p.start <= today)) return '已生效配置不可修改。';
    if (shop.configs.some(p => p.id !== c.id && p.start === c.start)) return '该日期已有待生效配置，请编辑已有配置或选择其他日期。';
    if (!['long', 'annual'].includes(c.type)) return '请选择负责方式。';
    const segments = c.type === 'long' ? [c] : c.segments;
    if (!Array.isArray(segments) || !segments.length) return '请配置全年负责时段。';
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i], prefix = c.type === 'annual' ? `时段 ${i + 1}：` : '';
      if (!directory.regions.includes(s.region) || !directory.supervisors.includes(s.owner)) return `${prefix}请选择${directory.label || '运营大区'}及运营主管。`;
      if (c.type === 'annual' && (!Number.isInteger(s.sm) || s.sm < 1 || s.sm > 12 || !Number.isInteger(s.em) || s.em < 1 || s.em > 12 || !Number.isInteger(s.sd) || s.sd < 1 || s.sd > lastDay(2028, s.sm) || !Number.isInteger(s.ed) || s.ed < 1 || s.ed > lastDay(2028, s.em))) return `${prefix}请填写有效的月日。`;
    }
    return c.type === 'annual' ? coverage(segments) : '';
  }
  function syncSnapshots(shop, today) {
    shop.snapshots ||= [];
    const first = ordered(shop)[0]?.start;
    if (!first || first > today) return;
    const last = shop.snapshots.at(-1);
    const from = last ? shift(last.start, 1) : first;
    for (const day of boundaries(shop, from, today)) {
      const person = resolve(shop, day), previous = shop.snapshots.at(-1);
      if (!person || same(previous, person)) continue;
      if (previous) previous.end = shift(day, -1);
      shop.snapshots.push({id: `${shop.id}-${day}`, start: day, end: null, ...person});
    }
  }
  function recordsAt(shop, today) {
    return (shop.snapshots || []).filter(r => r.start <= today).map(r => ({...r, end: r.end && r.end < today ? r.end : null})).reverse();
  }
  const period = s => `每年 ${s.sm} 月 ${s.sd} 日 — ${crossYear(s) ? '次年 ' : ''}${s.em} 月 ${s.ed} 日`;
  const typeName = c => c.type === 'annual' ? '每年循环' : '长期负责';
  return {shift, validDate, formatDate, lastDay, stamp, crossYear, hits, configAt, resolve, next, coverage, validate, syncSnapshots, recordsAt, period, typeName, ordered, earliestStart};
})();
if (typeof module !== 'undefined') module.exports = Assignment;
