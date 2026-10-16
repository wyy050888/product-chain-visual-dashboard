(() => {
  const app = GoalPrototype, { $ } = app;
  let timer;
  function configure() {
    app.goalConfig.open(() => {
      const notice = $('#goalConsumptionNotice'); notice.hidden = false; notice.textContent = '指标配置已保存';
      clearTimeout(timer); timer = setTimeout(() => { notice.hidden = true; }, 3000);
    });
  }
  function open() {
    app.periodPicker.close(); app.overviewPeriod.close(); app.entryFilterPanels.close(); app.tooltips.hide();
    $('#goalConsumption').hidden = false;
    document.querySelector('.top').inert = true; document.querySelector('.layout').inert = true;
    $('#goalConsumptionConfigure').focus(); configure();
  }
  function close() {
    $('#goalConsumption').hidden = true; $('#goalConsumptionNotice').hidden = true; clearTimeout(timer);
    document.querySelector('.top').inert = false; document.querySelector('.layout').inert = false;
    $('#goalConsumptionEntry').focus();
  }
  function init() {
    app.goalConfig.init();
    $('#goalConsumptionEntry').addEventListener('click', open);
    $('#goalConsumptionConfigure').addEventListener('click', configure);
    $('#goalConsumptionBack').addEventListener('click', close);
  }
  // 经营目标取值统一排除未匹配产品；管理总览继续使用完整规划目标。
  const targets = (kind, context) => app.targetRecords.rows(kind, { ...context, forConsumption: true });
  app.goalConsumption = { init, open, close, targets };
})();
