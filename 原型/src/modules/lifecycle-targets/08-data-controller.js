$('#lt-target-page').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-lt-download'))ltDownloadTargets();
 if(button.hasAttribute('data-lt-import'))ltOpenTargetImport();
 if(button.dataset.ltHistory==='import')ltOpenTargetHistory();
});
ltImportDialog.addEventListener('cancel',event=>{event.preventDefault();ltCloseTargetImport()});
ltImportDialog.addEventListener('click',event=>{
 if(event.target.closest('[data-lt-import-close]'))ltCloseTargetImport();
 if(event.target.closest('[data-lt-template]'))ltDownloadTargets(Number(ltImportDialog.dataset.year));
});
