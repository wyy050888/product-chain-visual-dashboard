// 本地原型的进度与结果选择；进度不代表真实服务端上传速度。
(() => {
  const app = GoalPrototype, { $ } = app;
  let revision = 0, busy = false, uploading = false;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  function lock(value) {
    busy = value;
    ['#importChoose', '#importReplace', '#importFile', '#importCid', '#importTemplate', '#importConfirm'].forEach(selector => { $(selector).disabled = value; });
    $('#importDrop').setAttribute('aria-disabled', String(value));
    $('#importConfirm').textContent = value ? '导入中…' : '确认导入';
  }
  function percent(value) {
    $('#importProgressBar').value = value;
    $('#importProgressValue').textContent = `${value}%`;
  }
  function cancel() {
    revision++; uploading = false; lock(false);
    $('#importProgress').hidden = true;
    $('#importUpload').hidden = true;
    $('#importDrop').setAttribute('aria-busy', 'false');
    $('#importChoice').close();
  }
  // 上传为独立演示阶段；替换文件或关闭时，旧进度不能再启用确认按钮。
  async function upload() {
    const current = ++revision;
    uploading = true;
    $('#importConfirm').disabled = true;
    $('#importConfirm').textContent = '上传中…';
    $('#importDrop').setAttribute('aria-busy', 'true');
    $('#importUpload').hidden = false;
    $('#importFileState').hidden = true;
    $('#importUploadLabel').textContent = '上传中';
    $('#importUploadBar').value = 0;
    $('#importUploadValue').textContent = '0%';
    for (const value of [18, 42, 68, 87, 100]) {
      await delay(240);
      if (current !== revision) return;
      $('#importUploadBar').value = value;
      $('#importUploadValue').textContent = `${value}%`;
    }
    uploading = false;
    $('#importUploadLabel').textContent = '上传完成';
    $('#importUpload').hidden = true;
    $('#importFileState').hidden = false;
    $('#importDrop').setAttribute('aria-busy', 'false');
    $('#importConfirm').textContent = '确认导入';
    $('#importConfirm').disabled = false;
  }
  async function run(prepare) {
    if (busy || uploading) return null;
    const current = ++revision;
    lock(true); percent(0); $('#importProgress').hidden = false;
    const pending = prepare();
    for (const value of [15, 38, 65, 85]) {
      await delay(280);
      if (current !== revision) return null;
      percent(value);
    }
    const result = await pending;
    if (current !== revision) return null;
    // 内容校验仅决定能否写入真实目标，不阻断原型结果演示。
    percent(100);
    await delay(250);
    if (current !== revision) return null;
    $('#importConfirm').textContent = '等待选择结果';
    $('#importChoice').showModal();
    return result;
  }
  function init(success, failure) {
    $('#importChoiceSuccess').addEventListener('click', () => { if (!busy) return; cancel(); success(); });
    $('#importChoiceFailure').addEventListener('click', () => { if (!busy) return; cancel(); failure(); });
    $('#importChoiceClose').addEventListener('click', cancel);
    $('#importChoice').addEventListener('cancel', event => { event.preventDefault(); cancel(); });
  }
  app.importFlow = { run, upload, cancel, init, isBusy: () => busy, isUploading: () => uploading };
})();
