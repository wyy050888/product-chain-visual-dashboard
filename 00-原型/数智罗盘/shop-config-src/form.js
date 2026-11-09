const View = {
  date: value => Assignment.formatDate(value),
  dateTime(value) {
    if (!value || !Number.isFinite(Date.parse(value))) return '--';
    return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(value)).replaceAll('-','/');
  },
  escape: value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  options(values, selected = '', placeholder = '') {
    const items = placeholder ? [['', placeholder], ...values.map(v => Array.isArray(v) ? v : [v, v])] : values.map(v => Array.isArray(v) ? v : [v, v]);
    return items.map(([value, label]) => `<option value="${View.escape(value)}"${String(value) === String(selected) ? ' selected' : ''}>${View.escape(label)}</option>`).join('');
  },
  person: p => p ? `${p.region} / ${p.owner}` : '--',
  schedule(config, day) {
    return `<table class="schedule-table"><tbody>${config.segments.map(s => `<tr class="${Assignment.hits(s, day) ? 'current-row' : ''}"><td>${Assignment.period(s)}</td><td>${View.escape(View.person(s))}</td></tr>`).join('')}</tbody></table>`;
  }
};

function createConfigurationForm(root, {getToday, getShop, directory}) {
  const $ = s => root.querySelector(s), A = Assignment, V = View;
  const {regions,label} = directory;
  let editingId = null, initial = '';
  const cascader = MonthDayCascader.create(root), people = createPersonPicker(root);
  const getType = () => $('input[name="mode"]:checked').value;
  function owners(input, owner = '') {
    people.set(input,supervisors,owner);
  }
  function readSegments() {
    return [...root.querySelectorAll('.segment')].map(row => {
      const read = name => row.querySelector(`[data-field="${name}"]`).value;
      return {sm:+read('sm'),sd:+read('sd'),em:+read('em'),ed:+read('ed'),region:read('region'),owner:people.value(row.querySelector('[data-field="owner"]'))};
    });
  }
  function renderSegments(segments) {
    cascader.close();
    $('#segments').innerHTML = segments.map((s, i) => `<section class="segment" data-index="${i}"><div class="segment-header"><span>时段 ${i + 1}</span><button type="button" class="text-button danger" data-remove="${i}" ${segments.length === 1 ? 'disabled' : ''}>删除</button></div><div class="segment-dates"><div><div class="date-caption">每年开始</div>${MonthDayCascader.field('s',s.sm,s.sd,i)}</div><span class="separator">—</span><div><div class="date-caption">结束<span class="cross-tag" ${A.crossYear(s) ? '' : 'hidden'}>次年</span></div>${MonthDayCascader.field('e',s.em,s.ed,i)}</div></div><div class="two-col"><label class="field">${V.escape(label)}<select data-field="region" aria-label="时段 ${i + 1} ${V.escape(label)}">${V.options(regions,s.region,directory.placeholder)}</select></label><label class="field">运营主管<input type="text" data-field="owner" aria-label="时段 ${i + 1} 运营主管"></label></div></section>`).join('');
    [...root.querySelectorAll('.segment')].forEach((row,i) => owners(row.querySelector('[data-field="owner"]'),segments[i].owner));
  }
  function snapshot() {
    return JSON.stringify({config:draft(),queries:[...root.querySelectorAll('#config-form [role="combobox"]')].map(input => input.value)});
  }
  function draft() {
    const base = {id:editingId,start:$('#config-start').value,type:getType()};
    return base.type === 'annual' ? {...base,segments:readSegments()} : {...base,region:$('#long-region').value,owner:people.value($('#long-owner'))};
  }
  function syncFields() {
    const c = draft(), annual = c.type === 'annual';
    const missingDate = annual && c.segments.some(s => !s.sm || !s.sd || !s.em || !s.ed);
    const coverageError = annual ? (missingDate ? '请选择完整的开始和结束月日。' : A.coverage(c.segments)) : '';
    $('#annual-fields').hidden = !annual; $('#long-fields').hidden = annual;
    $('#form-error').hidden = true;
    if (annual) {
      $('#coverage-note').textContent = coverageError || '✓ 全年时段已配齐，含闰年 2 月 29 日';
      $('#coverage-note').classList.toggle('ok', !coverageError);
    }
  }
  function load(config) {
    root.querySelector('.annual-help').classList.remove('dismissed');
    editingId = config?.id || null;
    // A new configuration follows the latest saved arrangement; effective history is never edited.
    const latest = A.ordered(getShop()).at(-1);
    const earliest = A.earliestStart(getShop(),getToday());
    const start = latest?.start >= earliest ? A.shift(latest.start,1) : earliest;
    const source = config || latest, person = A.resolve(getShop(),config?.start || start);
    const base = config || {type:'long',...latest,id:null,start};
    $('#config-start').min = earliest; $('#config-start').value = base.start;
    $('#start-hint').textContent = `最早 ${V.date(earliest)} 生效`;
    $(`input[name="mode"][value="${base.type}"]`).checked = true;
    $('#long-region').innerHTML = V.options(regions,base.region || person?.region || '',directory.placeholder);
    owners($('#long-owner'),base.owner || person?.owner || '');
    const segments = source?.type === 'annual' ? source.segments : [
      {sm:3,sd:1,em:8,ed:31,region:'',owner:''}, {sm:9,sd:1,em:2,ed:29,region:'',owner:''}
    ];
    renderSegments(segments);
    $('#save-config').textContent = config ? '保存修改' : '保存配置';
    syncFields(); initial = snapshot();
  }
  $('#config-form').addEventListener('change', event => {
    const el = event.target, row = el.closest('.segment');
    if (row) {
      const segment = readSegments()[+row.dataset.index];
      row.querySelector('.cross-tag').hidden = !segment.sm || !segment.sd || !segment.em || !segment.ed || !A.crossYear(segment);
    }
    syncFields();
  });
  $('#config-start').addEventListener('input',syncFields);
  $('#config-form').addEventListener('input',event => { if (event.target.matches('[role="combobox"]')) syncFields(); });
  $('#add-segment').addEventListener('click',() => {
    renderSegments([...readSegments(),{sm:1,sd:1,em:12,ed:31,region:'',owner:''}]); syncFields();
    $('#segments').lastElementChild.querySelector('.cascader-trigger').focus();
  });
  $('#segments').addEventListener('click',event => {
    const button = event.target.closest('[data-remove]'); if (!button) return;
    renderSegments(readSegments().filter((_,i) => i !== +button.dataset.remove)); syncFields(); $('#add-segment').focus();
  });
  const help = root.querySelector('.annual-help');
  help.addEventListener('mouseenter',() => help.classList.remove('dismissed'));
  help.addEventListener('focusin',() => help.classList.remove('dismissed'));
  help.addEventListener('keydown',event => {
    if (event.key === 'Escape' && !help.classList.contains('dismissed')) {
      event.preventDefault(); event.stopPropagation(); help.classList.add('dismissed');
    }
  });
  return {load,draft,closeTransient:() => { cascader.close(); people.close(); help.classList.add('dismissed'); },dirty:() => snapshot() !== initial,validate:c => A.validate(c,getShop(),getToday(),{regions,supervisors,label})};
}
