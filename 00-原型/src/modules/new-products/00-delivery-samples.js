// 独立交互样例：源项目Excel未提供大货交付任务，不由首单、日报或项目状态推断完成日期。
// 每条记录显式关联源项目ID；正式接入时由项目任务台账替换此表。
const nspDeliverySamples=[
 {projectId:0,taskId:'demo-delivery-0',kind:'bulk-delivery',planned:'2026-10-01',actual:'2026-10-11',source:'demo'},
 {projectId:1,taskId:'demo-delivery-1',kind:'bulk-delivery',planned:'2026-10-01',actual:'2026-10-12',source:'demo'},
 {projectId:2,taskId:'demo-delivery-2',kind:'bulk-delivery',planned:'2026-10-03',actual:'2026-10-03',source:'demo'},
 {projectId:3,taskId:'demo-delivery-3',kind:'bulk-delivery',planned:'2026-10-05',actual:null,source:'demo'},
 {projectId:4,taskId:'demo-delivery-4',kind:'bulk-delivery',planned:'2026-10-20',actual:null,source:'demo'},
 {projectId:5,taskId:'demo-delivery-5',kind:'bulk-delivery',planned:'2026-09-20',actual:'2026-09-30',source:'demo'},
 {projectId:6,taskId:'demo-delivery-6',kind:'bulk-delivery',planned:'2026-09-20',actual:'2026-10-01',source:'demo'},
 {projectId:7,taskId:'demo-delivery-7',kind:'bulk-delivery',planned:'2026-08-25',actual:'2026-08-25',source:'demo'}
];
