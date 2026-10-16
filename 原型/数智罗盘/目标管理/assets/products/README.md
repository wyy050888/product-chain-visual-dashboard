# 商品缩略图演示资源

- 文件：`appliance-atlas.png`，本地3×3图集，按行从0编号。
- 来源：内置 imagegen，2026-09-18 生成；通用虚构家电演示图，不代表具体品牌/型号实拍。
- 顺序：无线吸尘器、电饭煲、电热水壶、蒸汽拖把、布艺清洗机、取暖器、挂烫机、台灯、手持吸尘器。
- 产品主数据维护 `thumbnail: { src, tile }`，链接可覆盖；真实独立商品图只需 `{ src }`。图集由CSS裁切展示，不依赖外网。

## 完整生成提示词

Create ONE square raster sprite atlas for an ecommerce prototype, a precisely aligned 3-by-3 grid of product photography thumbnails. This is one image file to be displayed through CSS sprite cropping. Each of the 9 equally sized square cells has its own centered appliance, fully contained with 12% internal margin, clean warm ivory studio background and a subtle natural shadow. No grid lines, no gutters, no labels, no text, no logos, no watermark. Photorealistic catalog product photography, recognizable at 56px. Exact cell order: top-left slim burgundy and graphite cordless upright stick vacuum cleaner; top-middle modern white countertop rice cooker with black lid; top-right brushed stainless electric kettle. Middle-left upright white steam floor mop; middle-middle portable cream upholstery/carpet cleaner with coiled flexible hose and clear water tank; middle-right slim charcoal tower space heater. Bottom-left white garment steamer with upright pole and steam head; bottom-middle white adjustable desk reading lamp; bottom-right compact dark handheld vacuum cleaner. All are generic fictional appliances, not specific branded products. Square overall image, nine equal cells, crisp photorealism.
