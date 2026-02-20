import type { ProjectState } from './types';
import type { DataProvider } from './data-provider';
import html2canvas from 'html2canvas';

// --- IndexedDB utility functions ---
const DB_NAME = 'MukysartStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error('Error opening IndexedDB.'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'meta.id' });
      }
    };
  });
}

async function saveProjectToDB(project: ProjectState) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(project);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// --- DataProvider Implementation ---
export const saveProject: DataProvider['saveProject'] = async (project) => {
  const canvasArea = document.getElementById('canvas-area');
  if (!canvasArea) {
    throw new Error('Could not find canvas area to generate thumbnail.');
  }

  const canvas = await html2canvas(canvasArea, {
    useCORS: true,
    backgroundColor: null,
    scale: 200 / Math.max(canvasArea.offsetWidth, 1), // Avoid division by zero
  });
  const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

  const projectToSave: ProjectState = {
    ...project,
    meta: {
      ...project.meta,
      thumbnail,
      updatedAt: new Date().toISOString(),
    },
  };
  await saveProjectToDB(projectToSave);
};

export const getProjects: DataProvider['getProjects'] = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result || [];
        resolve(result.sort((a, b) => new Date(b.meta.updatedAt).getTime() - new Date(a.meta.updatedAt).getTime()));
      };
    } catch (error) {
      reject(error);
    }
  });
};

export const getProject: DataProvider['getProject'] = async (id: string) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    } catch (error) {
      reject(error);
    }
  });
};

export const deleteProject: DataProvider['deleteProject'] = async (id: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    } catch (error) {
      reject(error);
    }
  });
};
