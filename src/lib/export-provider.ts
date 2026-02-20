import type { ProjectState } from './types';
//import * as clientProvider from './client-export-provider';
import * as serverProvider from './server-export-provider'; // Future implementation

export interface ExportProvider {
  exportProject(project: ProjectState): Promise<void>;
}

// To switch to a server implementation, change this line
//const provider: ExportProvider = clientProvider;
const provider: ExportProvider = serverProvider; // Future implementation

export const exportProject = provider.exportProject;
