import type { ProjectState } from './types';
import type { ExportProvider } from './export-provider';
import { projectToHtml } from './html-generator';

export const exportProject: ExportProvider['exportProject'] = async (project) => {
  const html = projectToHtml(project);

  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html: html,
      category: project.meta.category,
      name: project.meta.name,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to export project on the server.');
  }
  // The server could optionally return the public URL of the exported flyer
  const { url } = await response.json();
  console.log(`Project exported to server at: ${url}`);
};