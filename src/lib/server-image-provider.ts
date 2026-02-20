import type { ImageProvider } from './image-provider';

export const handleImageFile: ImageProvider['handleImageFile'] = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  // You might want to pass the project category to the API to save it in the correct folder
  // formData.append('category', project.meta.category);

  const response = await fetch('/api/images/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Image upload failed on the server.');
  }

  // The server should return the public URL, width, and height of the uploaded image.
  const { src, width, height } = await response.json();
  return { src, width, height };
};