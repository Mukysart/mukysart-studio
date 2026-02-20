
'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useEditor } from '@/context/editor-context';
import { generateUUID } from '@/lib/uuid';
import type { Layer, TextLayer, Transform, ShapeLayer, ImageLayer, Point, Action, Guide, ProjectState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { shapeToPath } from '@/lib/shape-utils';
import { LayerComponent } from '@/components/editor/renderers/LayerComponent';
import { 
    deleteNode as deleteNodeUtil, 
    handleNodeMouseDown as handleNodeMouseDownUtil,
    handlePathMouseDown as handlePathMouseDownUtil,
    toggleNodeType as toggleNodeTypeUtil,
} from '@/components/editor/interactions/nodeInteractions';
import { applyTransform } from '@/components/editor/interactions/transformEngine';
import html2canvas from 'html2canvas';

const HANDLE_SIZE = 48;
const ROTATION_HANDLE_OFFSET = 64;

export default function Canvas() {
  const { project, setProject, setActiveTool, duplicateLayers, eyedropper, finishEyedropper, setEyedropperPreview, toast, setProjectLive, commitHistory } = useEditor();
  const { width, height, background } = project.canvas;
  const [action, setAction] = useState<Action | null>(null);
  const [selectedNode, setSelectedNode] = useState<{layerId: string, pointId: string} | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const [eyedropperSnapshot, setEyedropperSnapshot] = useState<HTMLCanvasElement | null>(null);
  const [activeSnapLines, setActiveSnapLines] = useState<{ horizontal: number[], vertical: number[] }>({ horizontal: [], vertical: [] });
  const initialStateOnDrag = useRef<ProjectState | null>(null);

  useLayoutEffect(() => {
    setProject(p => ({...p, zoomAction: 'fit'}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProject]);

  useEffect(() => {
      if (project.zoomAction === 'fit') {
          const canvasContainer = canvasRef.current?.parentElement?.parentElement?.parentElement;
          if (!canvasContainer) return;

          const computedStyle = getComputedStyle(canvasContainer);
          const paddingX = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
          const paddingY = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);

          const availableWidth = canvasContainer.clientWidth - paddingX;
          const availableHeight = canvasContainer.clientHeight - paddingY;

          const { width: artboardWidth, height: artboardHeight } = project.canvas;

          const scaleX = availableWidth / artboardWidth;
          const scaleY = availableHeight / artboardHeight;
          
          const newZoom = Math.min(scaleX, scaleY) * 0.9;
          
          setProject(p => ({...p, zoom: newZoom, zoomAction: null}));
      }
  }, [project.zoomAction, project.canvas.width, project.canvas.height, setProject]);

  useEffect(() => {
    if (project.activeTool === 'select' || project.selectedLayers.length === 0) {
      setSelectedNode(null);
    }
  }, [project.activeTool, project.selectedLayers]);


  const deleteNode = useCallback((layerId: string, pointId: string) => {
    deleteNodeUtil(layerId, pointId, setProject, setSelectedNode);
  }, [setProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (project.activeTool === 'node' && selectedNode && (e.key === 'Backspace' || e.key === 'Delete')) {
            e.preventDefault();
            deleteNode(selectedNode.layerId, selectedNode.pointId);
            return;
        }

        const target = e.target as HTMLElement;
        const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (isInputFocused) return;

        if (project.selectedLayers.length > 0) {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                setProject(prev => ({
                    ...prev,
                    layers: prev.layers.filter(l => !prev.selectedLayers.includes(l.id)),
                    selectedLayers: [],
                }));
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                duplicateLayers(project.selectedLayers);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, project.activeTool, project.selectedLayers, deleteNode, setProject, duplicateLayers]);

  useEffect(() => {
    if (project.activeTool === 'node' && project.selectedLayers.length === 1) {
        const layerId = project.selectedLayers[0];
        setProject(prev => {
            let changed = false;
            const newLayers = prev.layers.map(l => {
                if (l.id === layerId && l.type === 'shape' && l.shape.primitive !== 'path') {
                    const newLayer = shapeToPath(l as ShapeLayer);
                    if (newLayer !== l) {
                        changed = true;
                        return newLayer;
                    }
                }
                return l;
            });
            if (changed) {
                return { ...prev, layers: newLayers };
            }
            return prev;
        });
    }
  }, [project.activeTool, project.selectedLayers, setProject]);


  const handleTransformMouseDown = useCallback((e: React.MouseEvent, type: 'resize' | 'rotate', handle?: Action['handle']) => {
    e.stopPropagation();
    e.preventDefault();
    if (project.selectedLayers.length === 0) return;

    initialStateOnDrag.current = project;

    const initialLayerData = new Map<string, any>();
    project.layers.forEach(layer => {
      if (project.selectedLayers.includes(layer.id)) {
        const data: { transform: Transform, initialFontSize?: number, pan?: any, crop?: any } = { transform: { ...layer.transform } };
        if (layer.type === 'text' && type === 'resize') {
          data.initialFontSize = (layer as TextLayer).font.size;
        }
        if (layer.type === 'image') {
            data.pan = (layer as ImageLayer).pan;
            data.crop = (layer as ImageLayer).crop;
        }
        initialLayerData.set(layer.id, data);
      }
    });

    setAction({
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialLayerData,
      handle,
      shiftKey: e.shiftKey,
    });
  }, [project]);

  const toggleNodeType = useCallback((layerId: string, pointId: string) => {
    toggleNodeTypeUtil(layerId, pointId, setProject);
  }, [setProject]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, layerId: string, pointId: string, type: 'move-node' | 'move-handle', handleType?: 'in' | 'out') => {
      handleNodeMouseDownUtil(e, layerId, pointId, type, project, setAction, setSelectedNode, handleType);
  }, [project, setAction]);

  const handleGuideMouseDown = useCallback((e: React.MouseEvent, guideId: string) => {
    e.stopPropagation();
    initialStateOnDrag.current = project;
    const guide = project.canvas.guides.items.find(g => g.id === guideId);
    if (!guide) return;
    setAction({
        type: 'move-guide',
        startX: e.clientX,
        startY: e.clientY,
        shiftKey: e.shiftKey,
        guideId,
        initialGuidePosition: guide.position,
    });
  }, [project.canvas.guides.items, project]);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
      if (!action) return;

      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      animationFrameId.current = requestAnimationFrame(() => {
        const dx = (lastMousePosition.current.x - action.startX);
        const dy = (lastMousePosition.current.y - action.startY);

        const updater = ['move', 'resize', 'rotate'].includes(action.type) ? setProjectLive : setProject;

        updater(prev => {
          if (action.type === 'move-guide' && action.guideId) {
            const guide = prev.canvas.guides.items.find(g => g.id === action.guideId);
            if (!guide || action.initialGuidePosition === undefined) return prev;

            const delta = guide.orientation === 'horizontal' ? dy : dx;
            let newPosition = action.initialGuidePosition + delta / prev.zoom;
            
            if(guide.orientation === 'horizontal') {
                newPosition = Math.max(0, Math.min(newPosition, prev.canvas.height));
            } else {
                newPosition = Math.max(0, Math.min(newPosition, prev.canvas.width));
            }

            const newGuides = prev.canvas.guides.items.map(g => g.id === action.guideId ? {...g, position: newPosition} : g);
            return {...prev, canvas: {...prev.canvas, guides: {...prev.canvas.guides, items: newGuides}}};
          }


          if (action.type === 'move-node' && action.layerId && action.pointId && action.initialPoints) {
            const newLayers = prev.layers.map(l => {
              if (l.id !== action.layerId) return l;
              const shapeLayer = l as ShapeLayer;
              const pointIndex = shapeLayer.shape.points!.findIndex(p => p.id === action.pointId);
              if (pointIndex === -1) return l;

              const initialPoint = action.initialPoints![pointIndex];
              const dxPercent = (dx / prev.zoom) / shapeLayer.transform.width * 100;
              const dyPercent = (dy / prev.zoom) / shapeLayer.transform.height * 100;

              const newPoints = [...shapeLayer.shape.points!];
              const newPoint = {...newPoints[pointIndex]};
              newPoint.x = initialPoint.x + dxPercent;
              newPoint.y = initialPoint.y + dyPercent;

              const handleDx = newPoint.x - initialPoint.x;
              const handleDy = newPoint.y - initialPoint.y;
              newPoint.handles.in.x = initialPoint.handles.in.x + handleDx;
              newPoint.handles.in.y = initialPoint.handles.in.y + handleDy;
              newPoint.handles.out.x = initialPoint.handles.out.x + handleDx;
              newPoint.handles.out.y = initialPoint.handles.out.y + handleDy;

              newPoints[pointIndex] = newPoint;
              return { ...shapeLayer, shape: { ...shapeLayer.shape, points: newPoints } };
            });
            return { ...prev, layers: newLayers };
          }

          if (action.type === 'move-handle' && action.layerId && action.pointId && action.initialPoints && action.handleType) {
              const newLayers = prev.layers.map(l => {
                if (l.id !== action.layerId) return l;
                const shapeLayer = l as ShapeLayer;
                const pointIndex = shapeLayer.shape.points!.findIndex(p => p.id === action.pointId);
                if (pointIndex === -1) return l;

                const initialPoint = action.initialPoints![pointIndex];
                const dxPercent = (dx / prev.zoom) / shapeLayer.transform.width * 100;
                const dyPercent = (dy / prev.zoom) / shapeLayer.transform.height * 100;

                const newPoints = JSON.parse(JSON.stringify(shapeLayer.shape.points!));
                const newPoint = newPoints[pointIndex];

                const handleToMove = action.handleType!;
                const oppositeHandle = handleToMove === 'in' ? 'out' : 'in';

                newPoint.handles[handleToMove].x = initialPoint.handles[handleToMove].x + dxPercent;
                newPoint.handles[handleToMove].y = initialPoint.handles[handleToMove].y + dyPercent;

                if (newPoint.type === 'curve' && !action.shiftKey) {
                    const nodeX = newPoint.x;
                    const nodeY = newPoint.y;
                    const movedHandleX = newPoint.handles[handleToMove].x;
                    const movedHandleY = newPoint.handles[handleToMove].y;

                    const angle = Math.atan2(movedHandleY - nodeY, movedHandleX - nodeX);
                    const distance = Math.sqrt(Math.pow(movedHandleX - nodeX, 2) + Math.pow(movedHandleY - nodeY, 2));

                    newPoint.handles[oppositeHandle].x = nodeX - distance * Math.cos(angle);
                    newPoint.handles[oppositeHandle].y = nodeY - distance * Math.sin(angle);
                }

                return { ...shapeLayer, shape: { ...shapeLayer.shape, points: newPoints } };
              });
              return { ...prev, layers: newLayers };
          }

          if (action.type === 'pan-image' && action.layerId) {
            const newLayers = prev.layers.map(l => {
                if (l.id !== action.layerId) return l;

                const initialData = action.initialLayerData?.get(l.id);
                if (!initialData || !initialData.pan) return l;

                let originalWidth, originalHeight, fit, pan, transform, scale;

                if (l.type === 'image') {
                    originalWidth = l.originalWidth;
                    originalHeight = l.originalHeight;
                    fit = l.fit;
                    pan = initialData.pan;
                    transform = l.transform;
                    scale = 1; // ImageLayer doesn't have scale yet.
                } else if (l.type === 'shape' && l.shape.fillImage) {
                    originalWidth = l.shape.fillImage.originalWidth;
                    originalHeight = l.shape.fillImage.originalHeight;
                    fit = l.shape.fillImage.fit;
                    pan = initialData.pan;
                    transform = l.transform;
                    scale = l.shape.fillImage.scale || 1;
                } else {
                    return l;
                }

                if (!originalWidth || !originalHeight) return l;

                const { width: layerWidth, height: layerHeight } = transform;
                const initialPan = pan;

                const imageAspectRatio = originalWidth / originalHeight;
                const layerAspectRatio = layerWidth / layerHeight;

                let scaledImageWidth, scaledImageHeight;
                if (fit === 'cover') {
                    if (layerAspectRatio > imageAspectRatio) {
                        scaledImageWidth = layerWidth * scale;
                        scaledImageHeight = (layerWidth / imageAspectRatio) * scale;
                    } else {
                        scaledImageHeight = layerHeight * scale;
                        scaledImageWidth = (layerHeight * imageAspectRatio) * scale;
                    }
                } else { // contain
                    if (layerAspectRatio > imageAspectRatio) {
                        scaledImageHeight = layerHeight * scale;
                        scaledImageWidth = (layerHeight * imageAspectRatio) * scale;
                    } else {
                        scaledImageWidth = layerWidth * scale;
                        scaledImageHeight = (layerWidth / imageAspectRatio) * scale;
                    }
                }

                const panRangeX = Math.max(0, scaledImageWidth - layerWidth);
                const panRangeY = Math.max(0, scaledImageHeight - layerHeight);
                
                const initialPanX = (initialPan.x / 100) * panRangeX;
                const initialPanY = (initialPan.y / 100) * panRangeY;

                const dxPan = (dx / prev.zoom);
                const dyPan = (dy / prev.zoom);

                let newPanX = initialPanX - dxPan;
                let newPanY = initialPanY - dyPan;

                newPanX = Math.max(0, Math.min(newPanX, panRangeX));
                newPanY = Math.max(0, Math.min(newPanY, panRangeY));

                const newPanXPercent = panRangeX > 0 ? (newPanX / panRangeX) * 100 : 50;
                const newPanYPercent = panRangeY > 0 ? (newPanY / panRangeY) * 100 : 50;
                
                const newPan = { x: newPanXPercent, y: newPanYPercent };

                if (l.type === 'image') {
                    return { ...l, pan: newPan };
                }
                if (l.type === 'shape' && l.shape.fillImage) {
                    const newFillImage = { ...l.shape.fillImage, pan: newPan };
                    return { ...l, shape: { ...l.shape, fillImage: newFillImage }};
                }
                return l;
            });
            return { ...prev, layers: newLayers };
          }


          if (['move', 'resize', 'rotate'].includes(action.type)) {
            const { layers: newLayers, snapLines } = applyTransform(prev, action, dx, dy, lastMousePosition.current);
            setTimeout(() => setActiveSnapLines(snapLines || { horizontal: [], vertical: [] }), 0);
            return { ...prev, layers: newLayers };
          }

          return prev;
        });
      });
    };

    const handleMouseUp = () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      
      if (action) {
        if (initialStateOnDrag.current) {
          commitHistory(initialStateOnDrag.current, project);
          initialStateOnDrag.current = null;
        } else if (['move-node', 'move-handle', 'pan-image'].includes(action.type)) {
            // For actions that don't use the live update, we might still need to commit
            // This part is tricky, for now we let them create history on each change.
        }
      }

      if (action?.type === 'move-node' && action.layerId && action.pointId) {
        const dx = lastMousePosition.current.x - action.startX;
        const dy = lastMousePosition.current.y - action.startY;
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
            toggleNodeType(action.layerId, action.pointId);
        }
      }

      setAction(null);
      setActiveSnapLines({ horizontal: [], vertical: [] });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [action, setProject, project, setProjectLive, commitHistory, toggleNodeType]);

    useEffect(() => {
        if (eyedropper?.isActive && canvasRef.current && !eyedropperSnapshot) {
            const canvasArea = canvasRef.current;
            toast({ title: 'Initializing eyedropper...', description: 'Please wait.' });
            html2canvas(canvasArea, { useCORS: true, logging: false, backgroundColor: null })
                .then(canvas => {
                    setEyedropperSnapshot(canvas);
                })
                .catch(err => {
                    console.error("Eyedropper snapshot failed:", err);
                    toast({
                        title: "Eyedropper failed",
                        description: "Could not create canvas snapshot.",
                        variant: "destructive",
                    });
                    finishEyedropper(null);
                });
        } else if (!eyedropper?.isActive && eyedropperSnapshot) {
            setEyedropperSnapshot(null);
        }
    }, [eyedropper?.isActive, eyedropperSnapshot, finishEyedropper, toast]);

    useEffect(() => {
        if (!eyedropper?.isActive || !eyedropperSnapshot) return;

        const handleMouseMove = (e: MouseEvent) => {
            const ctx = eyedropperSnapshot.getContext('2d', { willReadFrequently: true });
            if (!ctx || !canvasRef.current) return;
            
            const rect = canvasRef.current.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const x = (e.clientX - rect.left) * dpr;
            const y = (e.clientY - rect.top) * dpr;

            const clampedX = Math.max(0, Math.min(x, eyedropperSnapshot.width - 1));
            const clampedY = Math.max(0, Math.min(y, eyedropperSnapshot.height - 1));
            
            const pixelData = ctx.getImageData(clampedX, clampedY, 1, 1).data;
            const [r, g, b] = pixelData;
            
            const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
            const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
            
            setEyedropperPreview(hexColor);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [eyedropper?.isActive, eyedropperSnapshot, setEyedropperPreview]);

  const canvasStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: background === 'transparent' ? undefined : background,
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  };

  const wrapperStyle: React.CSSProperties = {
    transform: `scale(${project.zoom})`,
    transformOrigin: 'center center',
  };

  const handleWorkbenchMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (eyedropper?.isActive) {
        e.preventDefault();
        e.stopPropagation();

        if (!eyedropperSnapshot) {
            toast({ title: "Eyedropper not ready", description: "Snapshot is being created, please wait.", variant: "destructive" });
            return;
        }

        const ctx = eyedropperSnapshot.getContext('2d');
        if (!ctx || !canvasRef.current) {
            finishEyedropper(null);
            return;
        }
        const rect = canvasRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = (e.clientX - rect.left) * dpr;
        const y = (e.clientY - rect.top) * dpr;

        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        const [r, g, b, a] = pixelData;

        if (a === 0) { 
             const bgColor = project.canvas.background === 'transparent' ? '#ffffff' : project.canvas.background;
             finishEyedropper(bgColor);
        } else {
             const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
             const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
             finishEyedropper(hexColor);
        }
        return;
    }

    const isCreationTool = project.activeTool === 'text' || (project.activeTool === 'shape' && project.activeShapeType);
    
    if (project.croppingLayerId) {
        setProject(prev => ({...prev, croppingLayerId: null}));
    }
    
    // When a click happens on the canvas (not on a layer), it should deselect any selected layers.
    if (!e.shiftKey && !isCreationTool) {
        setProject(prev => ({...prev, selectedLayers: []}));
    }
    
    // If we are not using a creation tool, we don't need to do anything further.
    if (!isCreationTool) {
        return;
    }
    
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left) / project.zoom;
    let y = (e.clientY - rect.top) / project.zoom;
    
    const { guides } = project.canvas;
    if (guides.enabled && guides.snap) {
        const snapThreshold = 10 / project.zoom;
        for (const guide of guides.items) {
            if (guide.orientation === 'vertical' && Math.abs(x - guide.position) < snapThreshold) {
                x = guide.position;
            }
            if (guide.orientation === 'horizontal' && Math.abs(y - guide.position) < snapThreshold) {
                y = guide.position;
            }
        }
    }

    if (project.activeTool === 'text') {
      const newTextLayer: TextLayer = {
        id: generateUUID(),
        type: 'text',
        name: 'New Text',
        visible: true,
        locked: false,
        zIndex: project.layers.length,
        transform: {
          x: x - 200,
          y: y - 30,
          width: 400,
          height: 60,
          rotation: 0,
          opacity: 1,
        },
        content: 'New Text',
        padding: 0,
        font: {
          family: 'Inter',
          size: 48,
          weight: 400,
          lineHeight: 1.2,
          letterSpacing: 0,
          align: 'center',
          style: 'normal',
          decoration: 'none',
          shadow: null,
          outline: null,
          curve: null,
        },
        color: {
          type: 'solid',
          mode: 'mapped',
          value: 'primary',
        },
      };

      setProject((prev) => ({
        ...prev,
        layers: [...prev.layers, newTextLayer],
        selectedLayers: [newTextLayer.id],
      }));
      setActiveTool('select');
    } else if (project.activeTool === 'shape' && project.activeShapeType) {
        const isLine = project.activeShapeType === 'line' || project.activeShapeType === 'dashed-line';
        const newShapeLayer: ShapeLayer = {
            id: generateUUID(),
            type: 'shape',
            name: `${project.activeShapeType.charAt(0).toUpperCase() + project.activeShapeType.slice(1)} Layer`,
            visible: true,
            locked: false,
            zIndex: project.layers.length,
            transform: {
                x: x - 250,
                y: y - (isLine ? 5 : 250),
                width: 500,
                height: isLine ? 10 : 500,
                rotation: 0,
                opacity: 1,
            },
            shape: {
                primitive: project.activeShapeType,
                fill: isLine ? { type: 'solid', mode: 'custom', value: 'transparent' } : { type: 'solid', mode: 'mapped', value: 'primary' },
                stroke: isLine ? { color: { type: 'solid', mode: 'mapped', value: 'primary' }, width: 4, dash: project.activeShapeType === 'dashed-line' ? '8 8' : undefined } : null,
                isClosed: !isLine,
                shadow: null,
            }
        };

        setProject((prev) => ({
            ...prev,
            layers: [...prev.layers, newShapeLayer],
            selectedLayers: [newShapeLayer.id],
        }));
        setActiveTool('select');
    }
  };

  const handlePathMouseDown = useCallback((e: React.MouseEvent, layerId: string) => {
    handlePathMouseDownUtil(e, layerId, project, setProject, project.zoom, canvasRef.current?.getBoundingClientRect(), setSelectedNode);
  }, [project, setProject]);

  const handleLayerMouseDown = useCallback((e: React.MouseEvent, layerId: string) => {
    if (project.activeTool === 'text' || (project.activeTool === 'shape' && project.activeShapeType)) {
      return; 
    }

    e.stopPropagation();

    const layer = project.layers.find(l => l.id === layerId);
    if (!layer) return;

    if (project.croppingLayerId === layerId && (layer.type === 'image' || (layer.type === 'shape' && layer.shape.fillImage))) {
      const isImageLayer = layer.type === 'image';
      const pan = isImageLayer ? (layer as ImageLayer).pan : (layer as ShapeLayer).shape.fillImage!.pan;
      
      if (!pan) return;
  
      const initialLayerData = new Map();
      initialLayerData.set(layer.id, { transform: { ...layer.transform }, pan: pan });
  
      setAction({
          type: 'pan-image',
          startX: e.clientX,
          startY: e.clientY,
          initialLayerData,
          shiftKey: e.shiftKey,
          layerId: layerId,
      });
      return;
    }

    const group = layer.groupId ? project.groups.find(g => g.id === layer.groupId) : null;
    if (layer.locked || (group && group.locked)) return;
    
    const currentTool = project.activeTool;
    
    if (currentTool === 'select') {
      initialStateOnDrag.current = project;
      const isCurrentlySelected = project.selectedLayers.includes(layerId);
      let effectiveSelection = [...project.selectedLayers];
      let selectionNeedsUpdate = false;

      if (e.shiftKey) {
        if (isCurrentlySelected) {
          effectiveSelection = effectiveSelection.filter(id => id !== layerId);
        } else {
          effectiveSelection.push(layerId);
        }
        selectionNeedsUpdate = true;
      } else if (!isCurrentlySelected) {
        effectiveSelection = [layerId];
        selectionNeedsUpdate = true;
      }
      
      const initialLayerData = new Map<string, { transform: Transform }>();
      project.layers.forEach(l => {
        if (effectiveSelection.includes(l.id)) {
          initialLayerData.set(l.id, { transform: { ...l.transform } });
        }
      });
      
      setAction({
        type: 'move',
        startX: e.clientX,
        startY: e.clientY,
        initialLayerData,
        shiftKey: e.shiftKey,
      });

      if (selectionNeedsUpdate) {
        setProject(prev => ({ ...prev, selectedLayers: effectiveSelection }));
      }
    } else {
        const isCurrentlySelected = project.selectedLayers.includes(layerId);
        let nextSelection = [...project.selectedLayers];
        if (e.shiftKey) {
            if (isCurrentlySelected) {
                nextSelection = nextSelection.filter(id => id !== layerId);
            } else {
                nextSelection.push(layerId);
            }
        } else if (!isCurrentlySelected) {
            nextSelection = [layerId];
        }
        setProject(prev => ({ ...prev, selectedLayers: nextSelection }));
    }
  }, [project.activeTool, project.layers, project.selectedLayers, project.groups, project.croppingLayerId, setProject, project.activeShapeType, project]);

  const handles: { key: Action['handle'], cursor: string }[] = [
    { key: 'tl', cursor: 'nwse-resize' },
    { key: 'tm', cursor: 'ns-resize' },
    { key: 'tr', cursor: 'nesw-resize' },
    { key: 'ml', cursor: 'ew-resize' },
    { key: 'mr', cursor: 'ew-resize' },
    { key: 'bl', cursor: 'nesw-resize' },
    { key: 'bm', cursor: 'ns-resize' },
    { key: 'br', cursor: 'nwse-resize' },
  ];

  const showTransforms = project.selectedLayers.length === 1 && project.activeTool === 'select';
  const selectedLayer = showTransforms ? project.layers.find(l => l.id === project.selectedLayers[0]) : null;
  const isCropping = project.croppingLayerId === selectedLayer?.id;
  
  let selectionBoxStyle: React.CSSProperties = {};
  let innerBoxStyle: React.CSSProperties = { position: 'absolute', inset: 0 };
  if (showTransforms && selectedLayer) {
    selectionBoxStyle = {
      position: 'absolute',
      left: selectedLayer.transform.x,
      top: selectedLayer.transform.y,
      width: selectedLayer.transform.width,
      height: selectedLayer.transform.height,
      transform: `rotate(${selectedLayer.transform.rotation}deg)`,
      zIndex: 9999,
      pointerEvents: 'none',
    };

    if (selectedLayer.type === 'image' && !isCropping) {
      const { crop, transform } = selectedLayer;
      const cropLeftPx = transform.width * (crop.left / 100);
      const cropTopPx = transform.height * (crop.top / 100);
      const croppedWidth = transform.width * (1 - (crop.left + crop.right) / 100);
      const croppedHeight = transform.height * (1 - (crop.top + crop.bottom) / 100);

      innerBoxStyle = {
        position: 'absolute',
        left: cropLeftPx,
        top: cropTopPx,
        width: croppedWidth,
        height: croppedHeight,
      }
    }
  }


  return (
    <div 
      className="p-16 flex items-center justify-center overflow-auto"
      onMouseDown={handleWorkbenchMouseDown}
    >
      <div style={wrapperStyle} className="transition-transform duration-200">
        <div
          id="canvas-area"
          ref={canvasRef}
          style={canvasStyle}
          className={cn('relative', background === 'transparent' ? 'checkerboard' : '')}
        >
          {project.canvas.guides.enabled && project.canvas.guides.items.map(guide => {
            const interactionSize = 8 / project.zoom;
            const visualSize = 1 / project.zoom;
            return (
              <div
                key={guide.id}
                onMouseDown={(e) => handleGuideMouseDown(e, guide.id)}
                style={{
                  position: 'absolute',
                  ...(guide.orientation === 'horizontal'
                    ? { top: guide.position - (interactionSize / 2), left: 0, width: '100%', height: `${interactionSize}px`, cursor: 'row-resize' }
                    : { left: guide.position - (interactionSize / 2), top: 0, height: '100%', width: `${interactionSize}px`, cursor: 'col-resize' }),
                  zIndex: 9998,
                  pointerEvents: 'auto',
                }}
              >
                <div style={{
                    position: 'absolute',
                    backgroundColor: 'rgba(25, 118, 210, 0.7)',
                    ...(guide.orientation === 'horizontal'
                      ? { top: '50%', transform: 'translateY(-50%)', width: '100%', height: `${visualSize}px` }
                      : { left: '50%', transform: 'translateX(-50%)', height: '100%', width: `${visualSize}px` }),
                }}/>
              </div>
            )
          })}
          {activeSnapLines.vertical.map((x, i) => (
              <div key={`snap-v-${i}`} style={{ position: 'absolute', left: x, top: 0, width: `${1/project.zoom}px`, height: '100%', backgroundColor: '#ef4444', zIndex: 99999 }} />
          ))}
          {activeSnapLines.horizontal.map((y, i) => (
              <div key={`snap-h-${i}`} style={{ position: 'absolute', top: y, left: 0, height: `${1/project.zoom}px`, width: '100%', backgroundColor: '#ef4444', zIndex: 99999 }} />
          ))}
          {project.layers.sort((a,b) => a.zIndex - b.zIndex).map(layer => (
            <LayerComponent key={layer.id} layer={layer} onMouseDown={handleLayerMouseDown} onNodeMouseDown={handleNodeMouseDown} onPathMouseDown={handlePathMouseDown} action={action} deleteNode={deleteNode}/>
          ))}
          {showTransforms && selectedLayer && (
            <div
              id="selection-box"
              style={selectionBoxStyle}
            >
              <div style={innerBoxStyle}>
                  <div className={cn("absolute inset-0 border-2 pointer-events-none", isCropping ? 'border-dashed border-white' : 'border-ring')} />
                  {handles.map(({ key, cursor }) => {
                      const handleStyle: React.CSSProperties = { cursor, width: HANDLE_SIZE, height: HANDLE_SIZE, pointerEvents: 'auto' };
                      if (key.includes('t')) handleStyle.top = -HANDLE_SIZE / 2;
                      if (key.includes('b')) handleStyle.bottom = -HANDLE_SIZE / 2;
                      if (key.includes('l')) handleStyle.left = -HANDLE_SIZE / 2;
                      if (key.includes('r')) handleStyle.right = -HANDLE_SIZE / 2;
                      if (key.includes('m') && key.includes('l')) handleStyle.top = `calc(50% - ${HANDLE_SIZE / 2}px)`;
                      if (key.includes('m') && key.includes('r')) handleStyle.top = `calc(50% - ${HANDLE_SIZE / 2}px)`;
                      if (key.includes('t') && key.includes('m')) handleStyle.left = `calc(50% - ${HANDLE_SIZE / 2}px)`;
                      if (key.includes('b') && key.includes('m')) handleStyle.left = `calc(50% - ${HANDLE_SIZE / 2}px)`;

                      return (
                          <div
                              key={key}
                              onMouseDown={(e) => handleTransformMouseDown(e, 'resize', key)}
                              style={handleStyle}
                              className="absolute border-2 border-background bg-ring rounded-sm transition-transform hover:scale-125"
                          />
                      )
                  })}
              </div>

              {!isCropping && (
                <>
                  <div
                    onMouseDown={(e) => handleTransformMouseDown(e, 'rotate')}
                    style={{
                      top: `calc(${innerBoxStyle.top}px - ${ROTATION_HANDLE_OFFSET}px)`,
                      left: `calc(${innerBoxStyle.left}px + ${innerBoxStyle.width}px / 2 - ${HANDLE_SIZE / 2}px)`,
                      cursor: 'crosshair',
                      width: HANDLE_SIZE,
                      height: HANDLE_SIZE,
                      pointerEvents: 'auto',
                    }}
                    className="absolute border-2 border-background bg-ring rounded-full transition-transform hover:scale-125"
                  />
                  <div
                    style={{
                      top: `calc(${innerBoxStyle.top}px - ${ROTATION_HANDLE_OFFSET}px + ${HANDLE_SIZE}px)`,
                      left: `calc(${innerBoxStyle.left}px + ${innerBoxStyle.width}px / 2 - 1px)`,
                      height: ROTATION_HANDLE_OFFSET - HANDLE_SIZE,
                      width: '2px',
                      backgroundColor: 'hsl(var(--ring))',
                    }}
                    className="absolute pointer-events-none"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

    