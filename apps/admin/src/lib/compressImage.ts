import { createImage } from './cropImage';

/**
 * Compresses an image to HD resolution (max 1920px width/height) 
 * while maintaining aspect ratio and using high quality Jpeg compression.
 */
export async function compressToHD(file: File, maxDimension = 1920): Promise<File> {
    const src = URL.createObjectURL(file);
    const image = await createImage(src);
    URL.revokeObjectURL(src);

    let { width, height } = image;

    // Calculate new dimensions
    if (width > maxDimension || height > maxDimension) {
        if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
        } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, width, height);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                }));
            } else {
                resolve(file);
            }
        }, 'image/jpeg', 0.85); // 0.85 is a good balance for HD quality
    });
}
