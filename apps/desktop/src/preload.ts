import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "./api";
const api: DesktopApi = {
  bridgeCopy: (input) => ipcRenderer.invoke("bridge:copy", input),
  libraryLoad: () => ipcRenderer.invoke("library:load"),
  librarySeed: () => ipcRenderer.invoke("library:seed"),
  libraryCommand: (input) => ipcRenderer.invoke("library:command", input),
  bridgePrepare: (input) => ipcRenderer.invoke("bridge:prepare", input),
  bridgeText: (input) => ipcRenderer.invoke("bridge:text", input),
  bridgeLoad: (id) => ipcRenderer.invoke("bridge:load", id),
  bridgeImport: (input) => ipcRenderer.invoke("bridge:import", input),
  bridgeUse: (input) => ipcRenderer.invoke("bridge:use", input),
  manualDraftText: (id) => ipcRenderer.invoke("bridge:draft-text", id),
  manualDraftImport: (input) =>
    ipcRenderer.invoke("bridge:draft-import", input),
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
