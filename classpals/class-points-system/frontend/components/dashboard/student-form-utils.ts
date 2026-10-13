export const CADRE_POSITIONS = ['班长', '副班长', '学习委员', '生活委员', '体育委员', '文艺委员', '宣传委员', '纪律委员', '卫生委员', '组长'];

export const PARENT_RELATIONSHIPS = ['爸爸', '妈妈', '家长1', '家长2', '其他'];

export const PHONE_PATTERN = /^1[3-9]\d{9}$/;

export async function compressImage(file: File, maxSize = 512) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    const { width, height } = resizeDimensions(image.width, image.height, maxSize);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('图片处理失败');
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });

    if (!blob) {
      throw new Error('图片压缩失败');
    }

    return new File([blob], renameFileToJpg(file.name), { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = src;
  });
}

function resizeDimensions(width: number, height: number, maxSize: number) {
  if (width <= maxSize && height <= maxSize) {
    return { width, height };
  }

  if (width >= height) {
    return {
      width: maxSize,
      height: Math.round((height / width) * maxSize),
    };
  }

  return {
    width: Math.round((width / height) * maxSize),
    height: maxSize,
  };
}

function renameFileToJpg(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '') + '.jpg';
}
