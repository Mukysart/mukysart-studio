import type { ProjectState } from './types';
//import * as idbProvider from './idb-provider';
 import * as serverProvider from './server-provider'; // Future implementation

export interface DataProvider {
  saveProject(project: ProjectState): Promise<void>;
  getProjects(): Promise<ProjectState[]>;
  getProject(id: string): Promise<ProjectState | undefined>;
  deleteProject(id: string): Promise<void>;
}

// To switch to a server implementation, change this line
//const provider: DataProvider = idbProvider;
const provider: DataProvider = serverProvider; // Future implementation

export const saveProject = provider.saveProject;
export const getProjects = provider.getProjects;
export const getProject = provider.getProject;
export const deleteProject = provider.deleteProject;
