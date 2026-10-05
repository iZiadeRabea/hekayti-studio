import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "./api";
const api: DesktopApi = {
  newStory: (request) => ipcRenderer.invoke("story:new", request),
  loadStory: (projectId) => ipcRenderer.invoke("story:load", projectId),
  reviseStory: (input) => ipcRenderer.invoke("story:revise", input),
  storyAction: (input) => ipcRenderer.invoke("story:action", input),
  listProjects: () => ipcRenderer.invoke("projects:list"),
  seedSynthetic: () => ipcRenderer.invoke("projects:seed"),
  inspectProject: (id) => ipcRenderer.invoke("projects:inspect", id),
  updateTitle: (input) => ipcRenderer.invoke("projects:title", input),
  openProject: () => ipcRenderer.invoke("projects:open"),
  saveProject: (id) => ipcRenderer.invoke("projects:save", id),
  exportProof: () => ipcRenderer.invoke("export:proof"),
  diagnostics: () => ipcRenderer.invoke("diagnostics"),
};
contextBridge.exposeInMainWorld("hekayti", api);
