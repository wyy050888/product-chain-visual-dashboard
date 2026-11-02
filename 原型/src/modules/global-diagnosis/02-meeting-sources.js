// 钉钉文档Excel抓取后的行记录；源文档只读，任务确认不回写文档。
const gdMeetingReferences={
 ...gdDecisionMeetingReferences,
 'coordinate-project':{file:'产品链协同会议纪要.xlsx',sheet:'10月协同会',row:8,date:'2026-10-08',subject:'重点项目交付排期',discussion:'样机交付与检测验证窗口需要统一，采购和品质分别反馈可用排期。',decision:'项目部汇总排期，确认统一交付窗口及分阶段交付可行性。',owner:'沈舟',due:'2026-10-13'},
 'coordinate-margin':{file:'产品链协同会议纪要.xlsx',sheet:'10月协同会',row:12,date:'2026-10-08',subject:'重点产品改善路径',discussion:'报价优化和结构替代两条路径需要比较，验证支持尚未安排。',decision:'产品中心牵头对比采购条件、验证周期和交付影响，提交方案选择。',owner:'周铭',due:'2026-10-13'},
 'coordinate-supplier':{file:'产品链协同会议纪要.xlsx',sheet:'10月协同会',row:16,date:'2026-10-08',subject:'供应商准入资源',discussion:'候选供应商评审资料和验证窗口待对齐，需核对现有资源池适配性。',decision:'采购与品质共同确认资料、样品和准入评审安排。',owner:'唐琪',due:'2026-10-13'},
 'meeting-delivery':{file:'产品链协同会议纪要.xlsx',sheet:'10月协同会',row:9,date:'2026-10-08',subject:'重点项目样机交付清单',discussion:'采购与品质反馈需汇总至项目交付清单。',decision:'项目部形成样机交付清单，确认交付内容、节点和验收岗位。',owner:'沈舟',due:'2026-10-12'},
 'meeting-quality':{file:'品质专项会议纪要.xlsx',sheet:'整改跟踪',row:20,date:'2026-10-07',subject:'整改验证结论回收',discussion:'重点产品问题复现与复测完成后，需要持续观察经营指标。',decision:'品质提交验证结论，产品中心复核后续观察安排。',owner:'刘畅',due:'2026-10-09'}
};
function gdMeetingReference(id){const alias={'resource-test':'coordinate-project','resource-engineering':'coordinate-margin','resource-supplier':'coordinate-supplier'};return gdMeetingReferences[alias[id]||id]}
function gdMeetingMarkup(reference){return `<section class="gd-detail-section"><h4>会议原文</h4><dl class="gd-source-info"><div><dt>来源</dt><dd>钉钉文档 Excel</dd></div><div><dt>会议日期</dt><dd>${reference.date}</dd></div><div class="gd-wide"><dt>文档</dt><dd>${esc(reference.file)} · ${esc(reference.sheet)} · 第${reference.row}行</dd></div></dl><div class="gd-excel-record">${[['议题',reference.subject],['讨论记录',reference.discussion],['会议决议',reference.decision],['责任人',reference.owner],['完成日期',reference.due]].map(([label,value])=>`<div><b>${label}</b><span>${gdReadableMarkup(value)}</span></div>`).join('')}</div></section>`}
