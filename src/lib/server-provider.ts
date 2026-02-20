import type { ProjectState } from './types';
import type { DataProvider } from './data-provider';
import html2canvas from 'html2canvas';

// This is the client-side implementation for a server-based data provider.
// You will need to create the corresponding API endpoints on your server.

export const saveProject: DataProvider['saveProject'] = async (project) => {
  const canvasArea = document.getElementById('canvas-area');
  if (!canvasArea) {
    throw new Error('Could not find canvas area to generate thumbnail.');
  }

  // Generate thumbnail before saving
  const canvas = await html2canvas(canvasArea, {
    useCORS: true,
    backgroundColor: null,
    scale: 200 / Math.max(canvasArea.offsetWidth, 1),
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

  const response = await fetch('/api/projects/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectToSave),
  });

  if (!response.ok) {
    throw new Error('Failed to save project on the server.');
  }
};

export const getProjects: DataProvider['getProjects'] = async () => {
  const response = await fetch('/api/projects');
  if (!response.ok) {
    throw new Error('Failed to get projects from the server.');
  }
  const projects = await response.json();
  // Ensure projects are sorted by update date
  return projects.sort((a, b) => new Date(b.meta.updatedAt).getTime() - new Date(a.meta.updatedAt).getTime());
};

export const getProject: DataProvider['getProject'] = async (id: string) => {
  const response = await fetch(`/api/projects/${id}`);
  if (!response.ok) {
    // Return undefined if not found, or throw for other errors
    if (response.status === 404) return undefined;
    throw new Error('Failed to get project from the server.');
  }
  return await response.json();
};

export const deleteProject: DataProvider['deleteProject'] = async (id: string) => {
  const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Failed to delete project on the server.');
  }
};