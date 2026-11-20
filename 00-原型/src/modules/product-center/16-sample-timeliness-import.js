smRegisterPage({
 route:'#system-sample-timeliness',
 id:'sample-timeliness-import-page',
 title:'直播间样机提供及时率导入',
 markup:`<header class="lt-page-head sm-target-head"><h2 class="sm-page-title">直播间样机提供及时率导入</h2></header>
 <section class="lt-panel"><div class="inline">
  ${smDataAction('import','导入','disabled aria-describedby="sample-timeliness-template-status"')}
  ${smDataAction('download','下载模板','disabled aria-describedby="sample-timeliness-template-status"')}
  <p id="sample-timeliness-template-status" class="muted">导入模板待定</p>
 </div></section>`,
 onShow(){}
});
