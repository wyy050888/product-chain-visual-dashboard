from pathlib import Path
import json
root=Path(r'E:\需求合集\产品链目视化看板')
p=root/'原型/styles/34-risk-presentation.css'
s=p.read_text(encoding='utf-8-sig')
start=s.index('/* 原生图片对话框')
end=s.index('@media(max-width:1450px)',start)
s=s[:start]+'''/* 图片直接呈现在蒙版上；仅保留关闭入口，不展示弹窗头尾或说明。 */
#product-image-viewer {position:fixed;inset:0;margin:0;padding:0;width:100vw;height:100dvh;max-width:none;max-height:none;background:transparent;border:0;border-radius:0;box-shadow:none;overflow:hidden;color:#fff}
#product-image-viewer[open] {display:flex;align-items:center;justify-content:center}
#product-image-viewer::backdrop {background:#111827bf}
#product-image-viewer .rp-image-close {position:absolute;top:16px;right:20px;z-index:1;width:36px;height:36px;padding:0;border:0;border-radius:50%;background:#0004;font-size:28px;line-height:36px;color:#fff;cursor:pointer}
#product-image-viewer .rp-image-close:focus-visible {outline:2px solid #fff;outline-offset:3px}
#product-image-viewer .rp-image-canvas {display:flex;align-items:center;justify-content:center;width:min(900px,calc(100vw - 64px));height:min(85dvh,900px);padding:0;background:transparent;overflow:hidden;position:relative}
#product-image-viewer img {display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;transform-origin:center;cursor:zoom-in}
#product-image-viewer .rp-image-error {position:absolute;text-align:center;color:#fff}
'''+s[end:]
s=s.replace(' #product-image-viewer {width:94vw;max-width:94vw}',' #product-image-viewer .rp-image-canvas {width:calc(100vw - 32px);height:80dvh}')
s=s.replace('.rp-preview-image:hover {outline:2px solid #b8d7ff;outline-offset:1px}','')
p.write_text(s,encoding='utf-8')
p=root/'原型/README.md'
s=p.read_text(encoding='utf-8-sig')+'\n\n产品图片点击后直接在背景蒙版上放大，不展示标题栏、底部说明和图片悬浮提示；点击蒙版、关闭按钮或Escape退出图片，保留原业务抽屉、页签及滚动状态。\n'
p.write_text(s,encoding='utf-8')
p=root/'.artifact-build-risk-rules/global-review.json'
data=json.loads(p.read_text(encoding='utf-8-sig'))
for row in data:
 if row[0]=='产品信息':row[1]=row[1].replace('图片支持点击预览。','点击图片直接蒙版放大，无标题栏、底部说明和图片悬浮提示；退出图片保留业务抽屉。')
p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
p=root/'.artifact-build-risk-rules/build.mjs'
s=p.read_text(encoding='utf-8-sig').replace('看板规则与指标展示规划_1013显示规则更新.xlsx','看板规则与指标展示规划_1013显示规则更新_无千位逗号.xlsx')
p.write_text(s,encoding='utf-8')
p=root/'outputs/risk-revision-20261013/display-workbook-check.py'
s=p.read_text(encoding='utf-8-sig').replace('1013显示规则更新.xlsx','1013显示规则更新_无千位逗号.xlsx')
p.write_text(s,encoding='utf-8')
