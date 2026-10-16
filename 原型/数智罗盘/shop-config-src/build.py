"""Build the offline prototype from small, editable source files."""
from pathlib import Path

source = Path(__file__).resolve().parent
read = lambda name: (source / name).read_text(encoding='utf-8')
scripts = '\n'.join(read(name) for name in ['data.js', 'goal-seed.js', 'dashboard-shops.js', 'goal-attribution.js', 'shop-settings.js', 'platforms.js', 'engine.js', 'storage.js', 'configuration-history.js', 'date-cascader.js', 'person-picker.js', 'form.js', 'configuration-list.js', 'records.js', 'pagination.js', 'clearable-select.js', 'brand-editor.js', 'app.js'])
document = f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>店铺配置</title>
<style>{read('styles.css')}{read('strategy.css')}{read('date-cascader.css')}{read('person-picker.css')}{read('clearable-select.css')}{read('platforms.css')}{read('shop-settings.css')}</style>
</head>
<body>{read('layout.html')}<script>{scripts}</script></body>
</html>
'''
target = source.parent / '店铺配置.html'
target.write_text(document, encoding='utf-8')
print(f'Built {target.name} ({len(document.encode("utf-8"))} bytes)')
