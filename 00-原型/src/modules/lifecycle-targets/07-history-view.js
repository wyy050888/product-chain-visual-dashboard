// 导入记录统一复用全局记录弹窗。
function ltOpenTargetHistory(){return uiImportHistory('生命周期目标')}
function ltDownloadImportErrors(entry){downloadCsv(['原始行号','字段','错误原因'],entry.errors.map(error=>[error.row,error.field,error.message]),'生命周期目标-'+entry.year+'-导入错误')}
