// 与已确认的九部门模板一致；明细保留原字段，汇总只取已确认的总金额列。
const cecDetailSchemas=[
 ['采购部','总降本额（元）',['月份','采购人员','T+供应商名称','产品类目（三级）','产品名称（SPU）','SPU码','产品图片','最新报价执行日期','首次出厂报价（元）','最新出厂报价（元）','出厂价降本额（元）','降本类型','首次品牌费（元）','最新品牌费（元）','品牌费降本额（元）','单台降本额（元）','单台累计降本率','提货量','总降本额（元）','备注'],['产品类目（三级）','产品名称（SPU）','SPU码']],
 ['研发中心','金额（元）',['月份','降本类型','降本明细','金额（元）','备注'],['降本明细']],
 ['产品中心','金额（元）',['月份','降本类型','降本明细','金额（元）','备注'],['降本明细']],
 ['计划部','降本金额（元）',['月份','降本类型','干线供应商','原价（元）','现价（元）','降本金额（元）','备注'],[]],
 ...['发货部','仓储部'].map(name=>[name,'总降本额（元）',['月份','降本类型','T+供应商名称','产品名称（SPU）','SPU码','快递','执行日期','原运费/件（元）','现运费/件（元）','降本单价（元）','发货量/充单量','总降本额（元）','备注（降价区域）'],['产品名称（SPU）','SPU码']]),
 ['品质中心','支持金额（元）',['月份','T+供应商名称','降本类型','事项明细','备注','支持金额（元）','沟通人'],['事项明细']],
 ['用户中心','总节约成本（元）',['月份','降本类型','T+供应商名称/发货仓','产品名称（SPU）','SPU码','总节约成本（元）','备注'],['产品名称（SPU）','SPU码']],
 ['风控中心','实际降本或增收（元）',['月份','降本类型','项目名称','事项负责人','启动日期','计划完成日期','项目状态','基准成本（元）','实际成本或回款（元）','实际降本或增收（元）'],['项目名称']]
].map(([name,amount,headers,required])=>({name,amount,headers,required:['月份','降本类型',amount,...required]}));
const cecTargetFileHeaders=['责任部门','年度','年度目标（元）',...Array.from({length:12},(_,i)=>(i+1)+'月（元）')];
const cecDerivedFields=new Set(['出厂价降本额（元）','品牌费降本额（元）','单台降本额（元）','单台累计降本率','降本单价（元）']);
const cecText=value=>String(value??'').normalize('NFKC').trim();
const cecFileHeader=value=>String(value??'').trim().replace(/^[*＊]\s*/,'').replace(/（(?:YYYY\/MM\/DD|YYYY\/MM|填报目标时必填)）$/,'').replace(/^(\d{1,2})月$/,'$1月（元）');
const cecRawCell=value=>value&&typeof value==='object'&&Object.hasOwn(value,'formula')?'[公式：'+(value.formula||'共享公式')+']':String(value??'');
const cecImportModule=kind=>kind==='target'?'降本目标值':'降本实际值';
function cecDownloadSplitTemplate(kind=cecState.tab){
 const name=kind==='target'?'降本目标值导入模板.xlsx':'降本实际值导入模板.xlsx',link=document.createElement('a');link.href='assets/templates/'+name;link.download=name;document.body.append(link);link.click();link.remove();
}
