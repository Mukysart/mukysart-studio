import type { ProjectState } from './types';
import type { ExportProvider } from './export-provider';
import { projectToHtml } from './html-generator';

export const exportProject: ExportProvider['exportProject'] = async (project) => {
  try {
    const html = projectToHtml(project);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.meta.name.replace(/ /g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export project:', error);
    throw new Error('Could not export your project.');
  }
};
