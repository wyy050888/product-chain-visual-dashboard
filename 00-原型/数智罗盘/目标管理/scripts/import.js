(() => {
  const app = GoalPrototype, { $ } = app;
  let kind, selectedFile, prepared, opener, generation = 0;
  app.importResultsMemory=[];
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
    if (app.importFlow.isBusy() || selectedFile || !files.length) return;
    reset();
    if (files.length !== 1) { $('#importResult').textContent = '一次请选择一个文件'; return; }
    const file = files[0];
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { $('#importResult').textContent = '请选择 CSV、XLSX 或 XLS 文件'; return; }
    if (file.size > 5 * 1024 * 1024) { $('#importResult').textContent = '文件不能超过5MB'; return; }
    selectedFile = file; $('#importFilename').textContent = file.name;
    $('#importChoose').title = file.name;
    $('#importDrop').classList.add('has-file');
    $('#importFileSize').textContent = file.size < 1024 ? `${file.size} B` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    $('#importReplace').hidden = false;
    $('#importConfirm').disabled=false;$('#importFileState').hidden=true;
  }
  function pickFile() {
    if (app.importFlow.isBusy() || selectedFile) return;
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
      output.raw=app.entryImportData.matrix(book.Sheets[book.SheetNames[0]]);
      stage = 'validate';
      output.source = app.importSource.read(book, targetKind);
      if (output.source.headerError) throw new Error('表头与当前目标类型不一致，请使用对应模板');
      if(output.source.rows.length>5000)throw new Error('单次最多导入5000条');
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
    if (!selectedFile || app.importFlow.isBusy()) return;
    const current = ++generation;
    prepared = null; $('#importErrors').hidden = true; $('#importResult').textContent = '';
    const result = await app.importFlow.run(() => prepare(selectedFile, $('#importCid').value, kind));
    if (current === generation && result) {
      prepared = result;
      if(prepared.error || !prepared.plan)failure();else success();
    }
  }
  function sourceStats(){
    const source=prepared.source,raw=prepared.raw||[],start=source?.headerLine||1,headers=source?.headers||raw[start-1]||[],rows=source?.rows||raw.slice(start).map((cells,index)=>({line:start+index+1,cells})).filter(row=>row.cells.some(value=>String(value??'').trim()));
    const issues=new Map((prepared.result?.rows||[]).map(row=>[row.line,row.issues]));
    const failedRows=rows.map(row=>({row:row.line,values:raw[row.line-1]||row.cells,reason:issues.get(row.line)?.map(issue=>issue.field+'：'+issue.reason).join('；')||prepared.error||'同批文件含错误，本行未导入'}));
    return {totalRows:rows.length,skippedCount:raw.slice(start).filter(row=>!row.some(value=>String(value??'').trim())).length,headers,failedRows};
  }
  function failure(){
    const stats=sourceStats(),record={id:app.targetAudit.id(),timestamp:new Date().toISOString(),actor:'系统租户管理员',source:'import',groups:[],summary:{},kind,cid:$('#importCid').value,file:prepared.file,status:'failed',...stats,successCount:0,failureCount:stats.totalRows,reason:prepared.error||'导入失败，数据未保存'};
    if(!record.failedRows.length)record.failedRows=[{row:'—',values:[],reason:record.reason}];
    try{app.targetStore.recordImport(record)}catch(_){app.importResultsMemory.push(record)}
    prepared.failureRecord=record;$('#importResult').textContent='导入失败，未保存数据。移除文件后可重新上传。';$('#importErrors').hidden=false;
  }
  function success(){
    try{const stats=sourceStats();app.targetStore.applyImport(prepared.plan,prepared.file,{totalRows:stats.totalRows,successCount:stats.totalRows,failureCount:0,skippedCount:stats.skippedCount})}
    catch(error){prepared.error=error.message;failure();return}
    const count=prepared.plan.total;close();app.entry.refresh();app.entry.notify('导入成功，共 '+count+' 条',{type:'success'});
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
    $('#refImport [data-close-dialog]').addEventListener('click', close);
    $('#refImport').addEventListener('cancel', event => { event.preventDefault(); close(); });
    $('#importCid').addEventListener('change', reset);
    $('#importChoose').addEventListener('click', pickFile);
    $('#importReplace').addEventListener('click', reset);
    $('#importDrop').addEventListener('click', event => { if (!event.target.closest('button, input')) pickFile(); });
    $('#importFile').addEventListener('change', event => { const files = [...event.target.files]; choose(files); });
    $('#importDrop').addEventListener('dragover', event => { event.preventDefault(); if (!app.importFlow.isBusy()) event.currentTarget.classList.add('dragging'); });
    $('#importDrop').addEventListener('dragleave', event => event.currentTarget.classList.remove('dragging'));
    $('#importDrop').addEventListener('drop', event => { event.preventDefault(); event.currentTarget.classList.remove('dragging'); choose([...event.dataTransfer.files]); });
    $('#importTemplate').addEventListener('click', downloadTemplate);
    $('#importErrors').addEventListener('click',()=>{if(prepared?.failureRecord)app.history.openFailure(prepared.failureRecord)});
    $('#importHistory').addEventListener('click',()=>app.history.open());
    $('#importCancel').addEventListener('click',close);
    $('#importConfirm').addEventListener('click', start);
  }
  app.entryImport = { open, init };
})();
