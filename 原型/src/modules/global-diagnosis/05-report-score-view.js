// 诊断项、具体问题和对应原文并列展示，不提供评分入口。
function gdReportDiagnosisView(row){
 const rows=row.checks.filter(check=>!check.passed).map(check=>`<tr data-gd-diagnosis-key="${esc(check.key)}"><td>${esc(check.label)}</td><td>${check.issues.map(item=>`<div class="gd-report-issue gd-readable-text">${gdReadableMarkup(item.problem)}</div>`).join('')}</td><td>${Array.from(new Set(check.issues.map(item=>item.excerpt))).map(text=>`<blockquote>${gdReadableMarkup(text)}</blockquote>`).join('')}</td></tr>`).join('');
 if(!rows)return '<section class="gd-detail-section gd-report-diagnosis"><p class="gd-analysis-muted">未发现内容问题</p></section>';
 return `<section class="gd-detail-section gd-report-diagnosis"><div class="gd-analysis-sources gd-report-evidence"><table aria-label="报告问题诊断"><thead><tr><th>诊断项</th><th>问题说明</th><th>对应原文</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
