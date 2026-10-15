from pathlib import Path
root=Path(r'E:\需求合集\产品链目视化看板\原型')
p=root/'styles/35-risk-reading.css'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('padding:7px 0;min-height:0','padding:6px 0;min-height:0').replace('min-height:30px;margin-bottom:5px','min-height:30px;margin-bottom:4px')
s=s.replace('font-weight:500;line-height:20px;white-space:nowrap;display:block','font-weight:500;line-height:18px;white-space:nowrap;display:block').replace('font-size:12px;line-height:16px;color:#8a97aa','font-size:12px;line-height:14px;color:#8a97aa')
s=s.replace('.rp-detail-link {flex:none;white-space:nowrap;font-size:12px;line-height:20px','.rp-detail-link {flex:none;white-space:nowrap;font-size:12px;line-height:18px')
s=s.replace('#riskrail .rp-key-metrics .rp-item small {line-height:16px}','#riskrail .rp-key-metrics .rp-item small {line-height:15px}').replace('#riskrail .rp-support-metrics .rp-item small {line-height:20px}','#riskrail .rp-support-metrics .rp-item small {line-height:18px}')
s=s.replace('#riskrail .rp-key-metrics .rp-item-value,#riskrail .rp-key-metrics .rp-value,#riskrail .rp-support-metrics .rp-value {line-height:20px}','#riskrail .rp-key-metrics .rp-item-value,#riskrail .rp-key-metrics .rp-value,#riskrail .rp-support-metrics .rp-value {line-height:18px}').replace('#riskrail .rp-key-metrics em{line-height:15px}','#riskrail .rp-key-metrics em{line-height:13px}')
p.write_text(s,encoding='utf-8')
p=root/'styles/38-document-review.css'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('#riskrail .rp-entry:nth-child(1) .rank{color:#e34255}#riskrail .rp-entry:nth-child(2) .rank{color:#dc713d}#riskrail .rp-entry:nth-child(3) .rank{color:#c4942a}\n','')
p.write_text(s,encoding='utf-8')
