import type { ImageProvider } from './image-provider';

export const handleImageFile: ImageProvider['handleImageFile'] = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
        return reject(new Error('File is not an image.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        resolve({ src: result, width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image.'));
      };
      img.src = result;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    }
    reader.readAsDataURL(file);
  });
};
