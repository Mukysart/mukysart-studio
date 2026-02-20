'use client';

import type {
  ProjectState,
  Tool,
  ShapePrimitive,
  ImageLayer,
  Layer,
  Group,
  ShapeLayer,
  Guide,
} from '@/lib/types';
import React, { useState, useCallback, useEffect } from 'react';
import { generateUUID } from '@/lib/uuid';
import { useToast } from '@/hooks/use-toast';
import { saveProject as saveProjectWithProvider, getProject as getProjectFromProvider } from '@/lib/data-provider';
import { exportProject as exportWithProvider } from '@/lib/export-provider';

type History<T> = {
    past: T[];
    present: T;
    future: T[];
};

type EyedropperState = {
  id: string;
  isActive: boolean;
  onPick: (color: string | null) => void;
  previewColor?: string | null;
};

type EditorContextType = {
  project: ProjectState;
  setProject: React.Dispatch<React.SetStateAction<ProjectState>>;
  setProjectLive: React.Dispatch<React.SetStateAction<ProjectState>>;
  commitHistory: (initialState: ProjectState, finalState: ProjectState) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setActiveTool: (tool: Tool) => void;
  setSelectedShape: (shape: ShapePrimitive) => void;
  addImageLayer: (src: string, width: number, height: number) => void;
  setSelectedLayers: (layerIds: string[]) => void;
  toggleCropMode: (layerId: string) => void;
  updateLayer: (layerId: string, newProps: Partial<Layer>) => void;
  deleteLayers: (layerIds: string[]) => void;
  duplicateLayers: (layerIds: string[]) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
  alignLayers: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  bringToFront: () => void;
  sendToBack: () => void;
  groupLayers: (layerIds: string[]) => void;
  ungroupLayers: (groupId: string) => void;
  updateGroup: (groupId: string, newProps: Partial<Group>) => void;
  deleteGroup: (groupId: string) => void;
  addNewGroup: (name: string) => void;
  handleLayerDrop: (
    draggedLayerId: string,
    dropTargetId: string | null,
    position: 'before' | 'after' | 'inside'
  ) => void;
  zoomToFit: () => void;
  addGuide: (orientation: 'horizontal' | 'vertical') => void;
  updateGuide: (id: string, position: number) => void;
  removeGuide: (id: string) => void;
  generateGuides: (orientation: 'horizontal' | 'vertical', count: number) => void;
  toggleSnapping: () => void;
  eyedropper: EyedropperState | null;
  activateEyedropper: (id: string, onPick: (color: string | null) => void) => void;
  finishEyedropper: (color: string | null) => void;
  setEyedropperPreview: (color: string | null) => void;
  toast: (options: any) => void;
  saveProject: () => void;
  exportProject: () => void;
  loadProject: (id: string) => Promise<void>;
};

const EditorContext = React.createContext<EditorContextType | undefined>(undefined);

const initialProjectState: ProjectState = {
  meta: {
    id: 'new-project',
    name: 'Untitled Design',
    description: '',
    category: 'flyers',
    createdAt: '',
    updatedAt: '',
  },
  canvas: {
    width: 1080,
    height: 1350,
    background: 'transparent',
    guides: {
      enabled: true,
      snap: true,
      items: [],
    },
  },
  colors: {
    primary: '#111111',
    secondary: '#ffffff',
    accent: '#f43f5e',
  },
  groups: [
    { id: 'editable-group', name: 'Editable', visible: true, locked: false, layerIds: [] },
  ],
  layers: [],
  selectedLayers: [],
  activeTool: 'select',
  zoom: 1,
  croppingLayerId: null,
  zoomAction: null,
};


export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [history, setHistory] = useState<History<ProjectState>>({
    past: [],
    present: initialProjectState,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  
  const [eyedropper, setEyedropper] = useState<EyedropperState | null>(null);
  const { toast } = useToast();

  const setProject = useCallback((action: React.SetStateAction<ProjectState>) => {
    setHistory(currentHistory => {
        const newPresent = typeof action === 'function' 
            ? (action as (prevState: ProjectState) => ProjectState)(currentHistory.present) 
            : action;

        if (JSON.stringify(newPresent) === JSON.stringify(currentHistory.present)) {
            return currentHistory;
        }

        return {
            past: [...currentHistory.past, currentHistory.present],
            present: newPresent,
            future: [],
        };
    });
  }, []);

  const setProjectLive = useCallback((action: React.SetStateAction<ProjectState>) => {
    setHistory(currentHistory => {
      const newPresent = typeof action === 'function' 
            ? (action as (prevState: ProjectState) => ProjectState)(currentHistory.present) 
            : action;
      return { ...currentHistory, present: newPresent };
    });
  }, []);

  const commitHistory = useCallback((initialState: ProjectState, finalState: ProjectState) => {
    setHistory(currentHistory => ({
      past: [...currentHistory.past, initialState],
      present: finalState,
      future: [],
    }))
  }, []);
  
  const undo = useCallback(() => {
    if (!canUndo) return;
    setHistory(currentHistory => {
        const newPresent = currentHistory.past[currentHistory.past.length - 1];
        const newPast = currentHistory.past.slice(0, currentHistory.past.length - 1);
        return {
            past: newPast,
            present: newPresent,
            future: [currentHistory.present, ...currentHistory.future],
        };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
      if (!canRedo) return;
      setHistory(currentHistory => {
          const newPresent = currentHistory.future[0];
          const newFuture = currentHistory.future.slice(1);
          return {
              past: [...currentHistory.past, currentHistory.present],
              present: newPresent,
              future: newFuture,
          };
      });
  }, [canRedo]);


  useEffect(() => {
    if (history.present.meta.id === 'new-project') {
      const now = new Date().toISOString();
      setProject((prev) => ({
        ...prev,
        meta: {
          ...prev.meta,
          id: generateUUID(),
          createdAt: now,
          updatedAt: now,
        },
      }));
    }
  }, [history.present.meta.id, setProject]);

  useEffect(() => {
    document.body.style.cursor = eyedropper?.isActive ? 'crosshair' : '';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && eyedropper?.isActive) {
        finishEyedropper(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eyedropper]);

  const setActiveTool = useCallback((tool: Tool) => {
    setProject((prev) => {
      if (tool === prev.activeTool) return prev;
      return { ...prev, activeTool: tool };
    });
  }, [setProject]);

  const setSelectedShape = useCallback((shape: ShapePrimitive) => {
    setProject((prev) => ({
      ...prev,
      activeTool: 'shape',
      activeShapeType: shape,
      selectedLayers: [],
    }));
  }, [setProject]);

  const addImageLayer = useCallback((src: string, width: number, height: number) => {
    const ratio = width / height;
    const newWidth = 300;
    const newHeight = 300 / ratio;

    setProject((prev) => {
      const newImageLayer: ImageLayer = {
        id: generateUUID(),
        type: 'image',
        name: 'Image Layer',
        visible: true,
        locked: false,
        zIndex: prev.layers.length,
        transform: {
          x: (prev.canvas.width - newWidth) / 2,
          y: (prev.canvas.height - newHeight) / 2,
          width: newWidth,
          height: newHeight,
          rotation: 0,
          opacity: 1,
        },
        src,
        originalWidth: width,
        originalHeight: height,
        fit: 'cover',
        pan: { x: 50, y: 50 },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        filters: { brightness: 1, contrast: 1, saturation: 1, hue: 0, exposure: 0, grayscale: false },
        chromaKey: { enabled: false, color: '#00ff00', tolerance: 0.1, feather: 0, invert: false },
        shadow: null,
      };
      return {
        ...prev,
        layers: [...prev.layers, newImageLayer],
        selectedLayers: [newImageLayer.id],
        activeTool: 'select',
      };
    });
  }, [setProject]);

  const setSelectedLayers = useCallback((layerIds: string[]) => {
    setProject((prev) => ({ ...prev, selectedLayers: layerIds }));
  }, [setProject]);

  const toggleCropMode = useCallback((layerId: string) => {
    setProject((prev) => {
      const layer = prev.layers.find((l) => l.id === layerId);
      if (!layer) return prev;

      const canCrop = layer.type === 'image' || (layer.type === 'shape' && (layer as ShapeLayer).shape.fillImage);
      if (!canCrop) return prev;

      if (prev.croppingLayerId === layerId) {
        return { ...prev, croppingLayerId: null, activeTool: 'select' };
      } else {
        return { ...prev, croppingLayerId: layerId, activeTool: 'select', selectedLayers: [layerId] };
      }
    });
  }, [setProject]);

  const updateLayer = useCallback((layerId: string, newProps: Partial<Layer>) => {
    setProject((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, ...newProps } : l)),
    }));
  }, [setProject]);

  const deleteLayers = useCallback((layerIds: string[]) => {
    setProject((prev) => {
      const remainingLayers = prev.layers.filter((l) => !layerIds.includes(l.id));
      const sortedRemaining = remainingLayers.sort((a, b) => a.zIndex - b.zIndex);
      const newLayers = sortedRemaining.map((l, i) => ({ ...l, zIndex: i }));
      const newGroups = prev.groups
        .map((g) => ({ ...g, layerIds: g.layerIds.filter((id) => !layerIds.includes(id)) }))
        .filter((g) => g.layerIds.length > 0 || g.id === 'editable-group');
      return {
        ...prev,
        layers: newLayers,
        groups: newGroups,
        selectedLayers: prev.selectedLayers.filter((id) => !layerIds.includes(id)),
      };
    });
  }, [setProject]);

  const duplicateLayers = useCallback((layerIds: string[]) => {
    setProject((prev) => {
      const layersToDuplicate = prev.layers.filter((l) => layerIds.includes(l.id));
      if (layersToDuplicate.length === 0) return prev;
      const newLayers: Layer[] = [];
      const newSelectedLayerIds: string[] = [];
      layersToDuplicate.forEach((layer) => {
        const newLayer = JSON.parse(JSON.stringify(layer));
        newLayer.id = generateUUID();
        newLayer.name = `${layer.name} copy`;
        newLayer.transform.x += 20;
        newLayer.transform.y += 20;
        newLayers.push(newLayer);
        newSelectedLayerIds.push(newLayer.id);
      });
      const sortedLayers = [...prev.layers].sort((a, b) => a.zIndex - b.zIndex);
      const highestZIndexLayer = layersToDuplicate.reduce((max, l) => (l.zIndex > max.zIndex ? l : max), layersToDuplicate[0]);
      const insertionIndex = sortedLayers.findIndex((l) => l.id === highestZIndexLayer.id) + 1;
      sortedLayers.splice(insertionIndex, 0, ...newLayers);
      const finalLayers = sortedLayers.map((l, i) => ({ ...l, zIndex: i }));
      return { ...prev, layers: finalLayers, selectedLayers: newSelectedLayerIds };
    });
  }, [setProject]);

  const moveLayer = useCallback((layerId: string, direction: 'up' | 'down') => {
    setProject((prev) => {
      const sortedLayers = [...prev.layers].sort((a, b) => b.zIndex - a.zIndex);
      const layerToMove = sortedLayers.find((l) => l.id === layerId);
      if (!layerToMove) return prev;
      const siblingLayers = sortedLayers.filter((l) => l.groupId === layerToMove.groupId);
      const currentIndex = siblingLayers.findIndex((l) => l.id === layerId);
      if (currentIndex === -1) return prev;
      let targetIndex: number;
      if (direction === 'up') {
        if (currentIndex === 0) return prev;
        targetIndex = currentIndex - 1;
      } else {
        if (currentIndex === siblingLayers.length - 1) return prev;
        targetIndex = currentIndex + 1;
      }
      const targetLayer = siblingLayers[targetIndex];
      const newLayers = prev.layers.map((l) => {
        if (l.id === layerToMove.id) return { ...l, zIndex: targetLayer.zIndex };
        if (l.id === targetLayer.id) return { ...l, zIndex: layerToMove.zIndex };
        return l;
      });
      return { ...prev, layers: newLayers };
    });
  }, [setProject]);
  
  const alignLayers = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    setProject(prev => {
        const selected = prev.layers.filter(l => prev.selectedLayers.includes(l.id));
        if (selected.length === 0) return prev;

        const newLayers = [...prev.layers];

        if (selected.length === 1) {
            const layer = selected[0];
            const newTransform = { ...layer.transform };
            switch(alignment) {
                case 'left': newTransform.x = 0; break;
                case 'center': newTransform.x = (prev.canvas.width - layer.transform.width) / 2; break;
                case 'right': newTransform.x = prev.canvas.width - layer.transform.width; break;
                case 'top': newTransform.y = 0; break;
                case 'middle': newTransform.y = (prev.canvas.height - layer.transform.height) / 2; break;
                case 'bottom': newTransform.y = prev.canvas.height - layer.transform.height; break;
            }
            const layerIndex = newLayers.findIndex(l => l.id === layer.id);
            newLayers[layerIndex] = { ...layer, transform: newTransform };
        } else {
            const bbox = selected.reduce((acc, l) => ({
                minX: Math.min(acc.minX, l.transform.x),
                minY: Math.min(acc.minY, l.transform.y),
                maxX: Math.max(acc.maxX, l.transform.x + l.transform.width),
                maxY: Math.max(acc.maxY, l.transform.y + l.transform.height),
            }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

            selected.forEach(layer => {
                const layerIndex = newLayers.findIndex(l => l.id === layer.id);
                const newTransform = { ...layer.transform };
                 switch(alignment) {
                    case 'left': newTransform.x = bbox.minX; break;
                    case 'center': newTransform.x = bbox.minX + (bbox.maxX - bbox.minX - layer.transform.width) / 2; break;
                    case 'right': newTransform.x = bbox.maxX - layer.transform.width; break;
                    case 'top': newTransform.y = bbox.minY; break;
                    case 'middle': newTransform.y = bbox.minY + (bbox.maxY - bbox.minY - layer.transform.height) / 2; break;
                    case 'bottom': newTransform.y = bbox.maxY - layer.transform.height; break;
                }
                newLayers[layerIndex] = { ...layer, transform: newTransform };
            })
        }
        return { ...prev, layers: newLayers };
    });
  }, [setProject]);

  const bringToFront = useCallback(() => {
    setProject(prev => {
        if (prev.selectedLayers.length === 0) return prev;
        const selectedIds = new Set(prev.selectedLayers);
        const selected = prev.layers.filter(l => selectedIds.has(l.id));
        const others = prev.layers.filter(l => !selectedIds.has(l.id));
        const newLayerOrder = [...others, ...selected];
        const newLayers = newLayerOrder.map((l, i) => ({ ...l, zIndex: i }));
        return { ...prev, layers: newLayers };
    });
  }, [setProject]);

  const sendToBack = useCallback(() => {
      setProject(prev => {
        if (prev.selectedLayers.length === 0) return prev;
        const selectedIds = new Set(prev.selectedLayers);
        const selected = prev.layers.filter(l => selectedIds.has(l.id));
        const others = prev.layers.filter(l => !selectedIds.has(l.id));
        const newLayerOrder = [...selected, ...others];
        const newLayers = newLayerOrder.map((l, i) => ({ ...l, zIndex: i }));
        return { ...prev, layers: newLayers };
    });
  }, [setProject]);

  const groupLayers = useCallback((layerIds: string[]) => {
    setProject((prev) => {
      if (layerIds.length < 1) return prev;
      const newGroup: Group = { id: generateUUID(), name: 'New Group', visible: true, locked: false, layerIds: layerIds };
      const newLayers = prev.layers.map((l) => (layerIds.includes(l.id) ? { ...l, groupId: newGroup.id } : l));
      return { ...prev, groups: [...prev.groups, newGroup], layers: newLayers, selectedLayers: [] };
    });
  }, [setProject]);

  const ungroupLayers = useCallback((groupId: string) => {
    setProject((prev) => {
      const group = prev.groups.find((g) => g.id === groupId);
      if (!group) return prev;
      const newLayers = prev.layers.map((l) => (l.groupId === groupId ? { ...l, groupId: undefined } : l));
      const newGroups = prev.groups.filter((g) => g.id !== groupId);
      return { ...prev, groups: newGroups, layers: newLayers, selectedLayers: group.layerIds };
    });
  }, [setProject]);

  const updateGroup = useCallback((groupId: string, newProps: Partial<Group>) => {
    setProject((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, ...newProps } : g)),
    }));
  }, [setProject]);

  const deleteGroup = useCallback((groupId: string) => {
    setProject((prev) => {
      const group = prev.groups.find((g) => g.id === groupId);
      if (!group || group.id === 'editable-group') return prev;
      const layerIdsToDelete = group.layerIds;
      const remainingLayers = prev.layers.filter((l) => !layerIdsToDelete.includes(l.id));
      const sortedRemaining = remainingLayers.sort((a, b) => a.zIndex - b.zIndex);
      const newLayers = sortedRemaining.map((l, i) => ({ ...l, zIndex: i }));
      const newGroups = prev.groups.filter((g) => g.id !== groupId);
      return { ...prev, layers: newLayers, groups: newGroups, selectedLayers: [] };
    });
  }, [setProject]);

  const addNewGroup = useCallback((name: string) => {
    setProject((prev) => {
      const newGroup: Group = { id: generateUUID(), name, visible: true, locked: false, layerIds: [] };
      return { ...prev, groups: [...prev.groups, newGroup] };
    });
  }, [setProject]);

  const handleLayerDrop = useCallback((draggedLayerId: string, dropTargetId: string | null, position: 'before' | 'after' | 'inside') => {
    setProject((prev) => {
      const isDraggingGroup = prev.groups.some((g) => g.id === draggedLayerId);
      if (isDraggingGroup) return prev;
      type VisualListItem = { id: string; type: 'layer' | 'group' | 'root-delimiter' };
      const visualList: VisualListItem[] = [];
      const sortedLayers = [...prev.layers].sort((a, b) => b.zIndex - a.zIndex);
      const layersInGroups = new Set(prev.groups.flatMap((g) => g.layerIds));
      const sortedGroups = [...prev.groups].sort((a, b) => a.name.localeCompare(b.name));
      sortedGroups.forEach((group) => {
        visualList.push({ id: group.id, type: 'group' });
        sortedLayers.filter((l) => l.groupId === group.id).forEach((l) => visualList.push({ id: l.id, type: 'layer' }));
      });
      visualList.push({ id: 'root-delimiter', type: 'root-delimiter' });
      const rootLayers = sortedLayers.filter((l) => !layersInGroups.has(l.id));
      rootLayers.forEach((l) => visualList.push({ id: l.id, type: 'layer' }));
      const draggedItemIndex = visualList.findIndex((item) => item.id === draggedLayerId);
      if (draggedItemIndex === -1) return prev;
      const [draggedItem] = visualList.splice(draggedItemIndex, 1);
      if (draggedItem.type === 'root-delimiter') {
        visualList.splice(draggedItemIndex, 0, draggedItem);
        return prev;
      }
      const targetIsGroup = prev.groups.some((g) => g.id === dropTargetId);
      let dropIndex = visualList.findIndex((item) => item.id === dropTargetId);
      if (dropIndex !== -1) {
        if (position === 'inside' && targetIsGroup) {
          visualList.splice(dropIndex + 1, 0, draggedItem);
        } else {
          if (position === 'after') dropIndex++;
          visualList.splice(dropIndex, 0, draggedItem);
        }
      } else {
        visualList.push(draggedItem);
      }
      const layerOrder = visualList.filter((item) => item.type === 'layer').map((item) => item.id).reverse();
      const layerGroupMap = new Map<string, string | undefined>();
      let currentGroupIdForMap: string | undefined = undefined;
      visualList.forEach((item) => {
        if (item.type === 'group') currentGroupIdForMap = item.id;
        else if (item.type === 'root-delimiter') currentGroupIdForMap = undefined;
        else if (item.type === 'layer') layerGroupMap.set(item.id, currentGroupIdForMap);
      });
      const newLayers = prev.layers.map((layer) => ({
        ...layer,
        zIndex: layerOrder.indexOf(layer.id),
        groupId: layerGroupMap.get(layer.id),
      }));
      const newGroups = prev.groups.map((group) => ({
        ...group,
        layerIds: newLayers.filter((l) => l.groupId === group.id).map((l) => l.id),
      }));
      return { ...prev, layers: newLayers, groups: newGroups };
    });
  }, [setProject]);

  const zoomToFit = useCallback(() => {
    setProject((prev) => ({ ...prev, zoomAction: 'fit' }));
  }, [setProject]);

  const addGuide = useCallback((orientation: 'horizontal' | 'vertical') => {
    setProject(prev => {
        const guidesOfOrientation = prev.canvas.guides.items.filter(
            g => g.orientation === orientation
        );
        const canvasMax = orientation === 'horizontal' ? prev.canvas.height : prev.canvas.width;
        
        let lastPosition = 0;
        if (guidesOfOrientation.length > 0) {
            lastPosition = Math.max(...guidesOfOrientation.map(g => g.position));
        }

        const newPosition = lastPosition + 100;

        if (newPosition > canvasMax) {
            toast({ title: "Cannot Add Guide", description: "Not enough space on the canvas to add a new guide." });
            return prev;
        }

        const newGuide: Guide = {
            id: generateUUID(),
            orientation,
            position: newPosition,
        };
        const newItems = [...prev.canvas.guides.items, newGuide];
        return {...prev, canvas: {...prev.canvas, guides: {...prev.canvas.guides, items: newItems}}};
    })
  }, [setProject, toast]);

  const updateGuide = useCallback((id: string, position: number) => {
    setProject(prev => {
        const newItems = prev.canvas.guides.items.map(g => g.id === id ? {...g, position} : g);
        return {...prev, canvas: {...prev.canvas, guides: {...prev.canvas.guides, items: newItems}}};
    })
  }, [setProject]);
  
  const removeGuide = useCallback((id: string) => {
    setProject(prev => {
        const newItems = prev.canvas.guides.items.filter(g => g.id !== id);
        return {...prev, canvas: {...prev.canvas, guides: {...prev.canvas.guides, items: newItems}}};
    })
  }, [setProject]);
  
  const generateGuides = useCallback((orientation: 'horizontal' | 'vertical', count: number) => {
    setProject(prev => {
        if (count < 1) {
            const otherGuides = prev.canvas.guides.items.filter(g => g.orientation !== orientation);
            return {...prev, canvas: {...prev.canvas, guides: {...prev.canvas.guides, items: otherGuides}}};
        }
        const canvasMax = orientation === 'horizontal' ? prev.canvas.height : prev.canvas.width;
        const spacing = canvasMax / (count + 1);

        const newGuidesForOrientation: Guide[] = Array.from({ length: count }, (_, i) => ({
            id: generateUUID(),
            orientation,
            position: spacing * (i + 1),
        }));
        
        const otherGuides = prev.canvas.guides.items.filter(g => g.orientation !== orientation);
        const newItems = [...otherGuides, ...newGuidesForOrientation];
        
        return {...prev, canvas: {...prev.canvas, guides: {...prev.canvas.guides, items: newItems}}};
    })
  }, [setProject]);

  const toggleSnapping = useCallback(() => {
    setProject(prev => ({
        ...prev,
        canvas: {
            ...prev.canvas,
            guides: {
                ...prev.canvas.guides,
                snap: !prev.canvas.guides.snap
            }
        }
    }));
  }, [setProject]);

  const activateEyedropper = useCallback((id: string, onPick: (color: string | null) => void) => {
    setEyedropper({ id, isActive: true, onPick, previewColor: null });
  }, []);

  const finishEyedropper = useCallback((color: string | null) => {
    if (eyedropper) {
      eyedropper.onPick(color);
      setEyedropper(null);
    }
  }, [eyedropper]);

  const setEyedropperPreview = useCallback((color: string | null) => {
    setEyedropper(prev => prev ? { ...prev, previewColor: color } : null);
  }, []);
  
  const saveProject = useCallback(async () => {
    try {
      await saveProjectWithProvider(history.present);
      toast({ title: 'Project Saved!', description: 'Your project has been saved.' });
    } catch (error) {
      console.error('Failed to save project:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save project.' });
    }
  }, [history.present, toast]);

  const exportProject = useCallback(async () => {
    try {
      await exportWithProvider(history.present);
      toast({ title: 'Project Exported!', description: 'Your project has been exported as an HTML file.' });
    } catch (error) {
       console.error('Failed to export project:', error);
       toast({ variant: 'destructive', title: 'Export Failed', description: (error as Error).message || 'Could not export your project.' });
    }
  }, [history.present, toast]);

  const loadProject = useCallback(async (id: string) => {
    try {
      const projectToLoad = await getProjectFromProvider(id);
      if (projectToLoad) {
          setHistory({
              past: [],
              present: projectToLoad,
              future: [],
          });
          toast({ title: 'Project Loaded' });
      } else {
          toast({ variant: 'destructive', title: 'Load Failed', description: 'Could not find project.' });
      }
    } catch (error) {
       console.error('Failed to load project:', error);
       toast({ variant: 'destructive', title: 'Load Failed', description: 'Could not load project.' });
    }
  }, [toast]);

  return (
    <EditorContext.Provider
      value={{
        project: history.present,
        setProject,
        setProjectLive,
        commitHistory,
        undo,
        redo,
        canUndo,
        canRedo,
        setActiveTool,
        setSelectedShape,
        addImageLayer,
        setSelectedLayers,
        toggleCropMode,
        updateLayer,
        deleteLayers,
        duplicateLayers,
        moveLayer,
        alignLayers,
        bringToFront,
        sendToBack,
        groupLayers,
        ungroupLayers,
        updateGroup,
        deleteGroup,
        addNewGroup,
        handleLayerDrop,
        zoomToFit,
        addGuide,
        updateGuide,
        removeGuide,
        generateGuides,
        toggleSnapping,
        eyedropper,
        activateEyedropper,
        finishEyedropper,
        setEyedropperPreview,
        toast,
        saveProject,
        exportProject,
        loadProject,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = React.useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
