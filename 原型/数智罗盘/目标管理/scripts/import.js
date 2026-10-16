(() => {
  const app = GoalPrototype, { $ } = app;
  let kind, selectedFile, prepared, opener, generation = 0;
  function reset() {
    generation++; app.importFlow.cancel(); selectedFile = null; prepared = null;
    clearTimeout(downloadTemplate.timer);
    $('#importTemplateNotice').hidden = true;
    $('#importConfirm').disabled = true;
    $('#importErrors').hidden = true;
    $('#importResult').textContent = '';
    $('#importFile').value = '';
    $('#importFilename').textContent = '选择文件或拖拽到此处';
    $('#importChoose').removeAttribute('title');
    $('#importDrop').classList.remove('has-file');
    $('#importFileSize').textContent = '';
    $('#importFileState').hidden = true;
    $('#importReplace').hidden = true;
  }
  function open() {
    kind = app.state.entryTab; opener = document.activeElement; reset();
    $('#importTitle').textContent = `导入${kind === 'product' ? '产品目标' : '产品链接目标'}`;
    $('#importCid').value = app.state.cid; $('#refImport').showModal();
  }
  function close() { reset(); $('#refImport').close(); opener?.focus(); }
  function choose(files) {
    if (app.importFlow.isBusy() || !files.length) return;
    reset();
    if (files.length !== 1) { $('#importResult').textContent = '一次请选择一个文件'; return; }
    const file = files[0];
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { $('#importResult').textContent = '请选择 CSV、XLSX 或 XLS 文件'; return; }
    if (file.size > 100 * 1024 * 1024) { $('#importResult').textContent = '文件不能超过100MB'; return; }
    selectedFile = file; $('#importFilename').textContent = file.name;
    $('#importChoose').title = file.name;
    $('#importDrop').classList.add('has-file');
    $('#importFileSize').textContent = file.size < 1024 ? `${file.size} B` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    $('#importReplace').hidden = false;
    app.importFlow.upload();
  }
  function pickFile() {
    if (app.importFlow.isBusy()) return;
    $('#importFile').value = ''; // 同名文件修改后也可以重新选择；取消不清除已选文件。
    $('#importFile').click();
  }
  async function prepare(file, cid, targetKind) {
    const output = { file: file.name, kind: targetKind, result: null, plan: null, error: '', blocking: false };
    let stage = 'read';
    try {
      const buffer = await file.arrayBuffer();
      if (!buffer.byteLength) return { ...output, blocking: true, error: '文件中没有目标数据，请填写后重新上传' };
      let source = buffer, type = 'array';
      if (/\.csv$/i.test(file.name)) {
        try { source = new TextDecoder('utf-8', { fatal: true }).decode(buffer); } catch (_) { source = new TextDecoder('gb18030').decode(buffer); }
        type = 'string';
      }
      const book = XLSX.read(source, { type, raw: true, cellNF: true });
      stage = 'validate';
      output.source = app.importSource.read(book, targetKind);
      if (output.source.headerError) throw new Error('表头与当前目标类型不一致，请使用对应模板');
      if (!output.source.rows.length) throw new Error('文件中没有目标数据，请填写后重新上传');
      output.result = app.entryImportData.validate(targetKind, output.source.matrix, cid, output.source);
      // 日期单元格本身有误时走逐行提示，避免用周期提示掩盖具体行错误。
      const datesValid = output.result.rows.every(row => !row.invalidMonth && !row.issues.some(issue => /年份|月份/.test(issue.field)));
      if (datesValid) app.targetStore.importPeriod(output.result.rows.map(row => row.record));
      if (output.result.errors.length) { output.error = '存在填写错误'; return output; }
      output.plan = app.targetStore.importPlan(targetKind, output.result.rows.map(row => row.record), cid);
    } catch (error) {
      output.blocking = true;
      output.error = stage === 'read'
        ? (/password|encrypt|密码|加密/i.test(error.message) ? '文件已加密，请取消密码保护后重新上传' : '文件无法读取，请检查文件是否损坏并重新保存')
        : error.message;
    }
    return output;
  }
  async function start() {
    if (!selectedFile || app.importFlow.isBusy() || app.importFlow.isUploading()) return;
    const current = ++generation;
    prepared = null; $('#importErrors').hidden = true; $('#importResult').textContent = '';
    const result = await app.importFlow.run(() => prepare(selectedFile, $('#importCid').value, kind));
    if (current === generation && result) {
      prepared = result;
    }
  }
  function failure(demo = false) {
    if(demo && prepared) {
      prepared.blocking=false;
      prepared.error='导入失败，目标数据未变更，请下载失败文件查看原因。';
    }
    $('#importResult').textContent = prepared?.blocking ? prepared.error : '导入失败，请下载失败文件查看原因。';
    $('#importErrors').hidden = Boolean(prepared?.blocking);
    recordResult('failed');
  }
  function recordResult(status) {
    if (!prepared || prepared.logged) return true;
    try {
      let period=prepared.plan;
      if(!period && prepared.result?.rows.length) {
        try { const scope=app.targetStore.importPeriod(prepared.result.rows.map(row=>row.record));period={year:scope.years[0],months:scope.months}; } catch (_) { /* 失败记录可保留未识别周期。 */ }
      }
      if(status==='demo' && !period)period=app.historyExamples.period(app.entry.context());
      app.targetStore.recordImport({kind,cid:$('#importCid').value,file:prepared.file,status,
        year:period?.year,months:period?.months || [],
        reason:status==='demo'?'':prepared.error || '导入失败，目标数据未变更。',
        downloadable:status==='failed' && !prepared.blocking});
      prepared.logged=true;
      return true;
    } catch (_) { $('#importResult').textContent += ' 操作记录未能保存，请检查浏览器存储后重试。'; return false; }
  }
  function success() {
    if (!prepared) return;
    const real = Boolean(prepared.plan);
    try {
      // 合法文件仅在选择成功后原子写入；不合法文件允许演示成功，不写入目标。
      if (real) app.targetStore.applyImport(prepared.plan, prepared.file);
    } catch (error) {
      prepared.blocking = true;
      prepared.error = /变化|修改/.test(error.message) ? '目标数据已更新，请重新发起导入。' : '导入未完成，本次数据未生效，请稍后重试。';
      failure(); return;
    }
    const label = kind === 'product' ? '产品目标' : '产品链接目标';
    const count = prepared.plan?.total ?? prepared.result?.rows.length ?? prepared.source?.rows.length;
    const unmatched = prepared.plan?.summary.unmatched || 0;
    const message = `${label}导入成功${count > 0 ? `，共导入 ${count} 条` : ''}${unmatched ? `，其中 ${unmatched} 条未匹配产品档案，不参与目标消费` : ''}`;
    if (!real && !recordResult('demo')) return;
    close(); if (real) app.entry.refresh();
    app.entry.notify(real ? message : `${label}导入成功`, { type: 'success' });
  }
  function downloadFailure() {
    // 原型固定下载场景合集，与上传文件及目标类型无关。
    const link = document.createElement('a');
    link.href = 'assets/导入失败示例.xlsx';
    link.download = '导入失败示例.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  function downloadTemplate() {
    const notice = $('#importTemplateNotice');
    const link = document.createElement('a');
    link.href = `assets/templates/${kind === 'product' ? 'product-target' : 'link-target'}.xlsx`;
    link.download = `一类${kind === 'product' ? '产品目标' : '产品链接目标'}导入模版.xlsx`;
    document.body.appendChild(link); link.click(); link.remove();
    notice.textContent = '模板已下载';
    notice.hidden = false;
    clearTimeout(downloadTemplate.timer);
    downloadTemplate.timer = setTimeout(() => { notice.hidden = true; }, 3000);
  }
  function init() {
    app.importFlow.init(success, () => failure(true));
    $('#refImport [data-close-dialog]').addEventListener('click', close);
    $('#refImport').addEventListener('cancel', event => { event.preventDefault(); close(); });
    $('#importCid').addEventListener('change', reset);
    $('#importChoose').addEventListener('click', pickFile);
    $('#importReplace').addEventListener('click', pickFile);
    $('#importDrop').addEventListener('click', event => { if (!event.target.closest('button, input')) pickFile(); });
    $('#importFile').addEventListener('change', event => { const files = [...event.target.files]; choose(files); });
    $('#importDrop').addEventListener('dragover', event => { event.preventDefault(); if (!app.importFlow.isBusy()) event.currentTarget.classList.add('dragging'); });
    $('#importDrop').addEventListener('dragleave', event => event.currentTarget.classList.remove('dragging'));
    $('#importDrop').addEventListener('drop', event => { event.preventDefault(); event.currentTarget.classList.remove('dragging'); choose([...event.dataTransfer.files]); });
    $('#importTemplate').addEventListener('click', downloadTemplate);
    $('#importErrors').addEventListener('click', downloadFailure);
    $('#importConfirm').addEventListener('click', start);
  }
  app.entryImport = { open, init };
})();
