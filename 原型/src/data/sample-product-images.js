// 缺图型号使用现有同品牌同品类素材作示意；不改写产品名称、型号或库存身份。
const sampleProductImageReferences={
 'SPU-SOURCE-008':'assets/reference-images/image103.png',
 'SPU-SOURCE-018':'assets/reference-images/image14.png',
 'SPU-SOURCE-019':'assets/spu-images/spu-23.png',
 'SPU-SOURCE-021':'assets/reference-images/image108.png',
 'SPU-SOURCE-022':'assets/reference-images/image103.png',
 'SPU-SOURCE-030':'assets/spu-images/spu-32.png',
 'SPU-SOURCE-031':'assets/spu-images/spu-32.png',
 'SPU-SOURCE-041':'assets/spu-images/spu-25.png',
 'SPU-SOURCE-044':'assets/spu-images/spu-47.png',
 'SPU-SOURCE-045':'assets/spu-images/spu-47.png'
};
for(const product of sampleSpus){
 const source=sampleProductImageReferences[product.spuId];
 if(!product.image&&source){product.image=productMediaThumbnail(source);product.imageSource='same-brand-category-demo';product.imageReference=source;}
}
