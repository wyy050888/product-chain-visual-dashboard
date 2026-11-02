# 商品图片素材

- `remote-sources.json`：8份公开商品素材的品牌、品类、页面与资源URL。
- `generated-sources.json`：6份内置image_gen生成的无品牌示意素材、提示词和项目内原图路径。
- `replacements.json`：39款SPU小图及1份原本空白的项目图的替换关系。
- `originals/`：采集/生成的原始文件，仅供开发，不进入运行页面。
- `build-images.mjs`：生成112/224px WebP与最大960px完整图；文件名包含素材及配方指纹。完整图不预加载，不在JS中嵌入图片。
- `check-images.mjs`：单浏览器三轮前后对比、39款素材解码、DPR2/3、图片放大、抽屉与窄屏。

生成命令：`node dev/media/build-images.mjs`，随后 `node build.mjs`。使用安装了sharp的Node；Codex附带运行时可用。生成后会移除product-media目录中本工具命名格式的过期版本。

来源图片与商品资料独立。用户已确认同型号高清图缺失时使用同品牌同品类示意图；六款品牌素材仍不可核实时使用无品牌同品类示意图。图片不作为型号外观核验依据。已有11条缺图SPU继续使用缺图占位。页面不额外展示说明文案。
