//import * as base64Provider from './base64-image-provider';
import * as serverProvider from './server-image-provider'; // Future implementation

export interface ImageProvider {
  handleImageFile(file: File): Promise<{ src: string, width: number, height: number }>;
}

// To switch to a server implementation, change this line
//const provider: ImageProvider = base64Provider;
const provider: ImageProvider = serverProvider; // Future implementation

export const handleImageFile = provider.handleImageFile;
