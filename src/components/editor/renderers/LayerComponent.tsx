'use client';

import React from 'react';
import { useEditor } from '@/context/editor-context';
import type { Layer, TextLayer, ShapeLayer, ImageLayer, Action } from '@/lib/types';
import { TextLayerRenderer } from './TextLayerRenderer';
import { ShapeLayerRenderer } from './ShapeLayerRenderer';
import { ImageLayerRenderer } from './ImageLayerRenderer';

const NODE_POINT_SIZE = 32;
const NODE_HANDLE_SIZE = 24;

export function LayerComponent({ layer, onMouseDown, onNodeMouseDown, onPathMouseDown, action, deleteNode }: { layer: Layer; onMouseDown: (e: React.MouseEvent, layerId: string) => void, onNodeMouseDown: (e: React.MouseEvent, layerId: string, pointId: string, type: 'move-node' | 'move-handle', handleType?: 'in' | 'out') => void, onPathMouseDown: (e: React.MouseEvent, layerId: string) => void, action: Action | null, deleteNode: (layerId: string, pointId: string) => void }) {
  const { project, eyedropper } = useEditor();
  const isSelected = project.selectedLayers.includes(layer.id);
  const actionInProgress = !!action;
  const isMovingThisLayer = action?.type === 'move' && action.initialLayerData?.has(layer.id);
  const isNodeEditing = project.activeTool === 'node' && isSelected;
  const isCroppingThisLayer = project.croppingLayerId === layer.id;
  const showTransforms = project.selectedLayers.length === 1 && project.activeTool === 'select';
  const isPickingColor = eyedropper?.isActive;

  const handleLocalPathMouseDown = (e: React.MouseEvent) => {
    onPathMouseDown(e, layer.id);
  };
  
  const group = layer.groupId ? project.groups.find(g => g.id === layer.groupId) : null;
  const isVisible = layer.visible && (group ? group.visible : true);
  const isLocked = layer.locked || (group ? group.locked : false);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: layer.transform.x,
    top: layer.transform.y,
    width: layer.transform.width,
    height: layer.transform.height,
    transform: `rotate(${layer.transform.rotation}deg)`,
    opacity: layer.transform.opacity,
    visibility: isVisible ? 'visible' : 'hidden',
    zIndex: layer.zIndex,
    cursor: isPickingColor ? 'crosshair' : (isCroppingThisLayer ? 'move' : (isLocked ? 'not-allowed' : (isMovingThisLayer ? 'grabbing' : (project.activeTool === 'select' ? 'grab' : 'crosshair')))),
    userSelect: 'none',
    boxShadow: isMovingThisLayer ? '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)' : undefined,
    filter: layer.transform.blur ? `blur(${layer.transform.blur}px)` : undefined,
  };

  return (
    <div
      style={style}
      className="group"
      onMouseDown={(e) => { if (!isPickingColor) onMouseDown(e, layer.id) }}
    >
      {layer.type === 'text' && <TextLayerRenderer layer={layer as TextLayer} />}
      {layer.type === 'shape' && <ShapeLayerRenderer layer={layer as ShapeLayer} onPathMouseDown={handleLocalPathMouseDown} isCropping={isCroppingThisLayer} />}
      {layer.type === 'image' && <ImageLayerRenderer layer={layer as ImageLayer} isCropping={isCroppingThisLayer} />}

      {isNodeEditing && layer.type === 'shape' && (layer as ShapeLayer).shape.points?.map(p => {
          const nodeX = (p.x / 100) * layer.transform.width;
          const nodeY = (p.y / 100) * layer.transform.height;

          const handleInX = (p.handles.in.x / 100) * layer.transform.width;
          const handleInY = (p.handles.in.y / 100) * layer.transform.height;
          const handleOutX = (p.handles.out.x / 100) * layer.transform.width;
          const handleOutY = (p.handles.out.y / 100) * layer.transform.height;

          const handleStyle: React.CSSProperties = {
              position: 'absolute',
              width: `${NODE_HANDLE_SIZE}px`,
              height: `${NODE_HANDLE_SIZE}px`,
              backgroundColor: 'hsl(var(--background))',
              borderRadius: '50%',
              border: '1px solid hsl(var(--ring))',
              cursor: 'move',
              pointerEvents: 'auto',
          }

          return (
            <React.Fragment key={p.id}>
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                    <line x1={nodeX} y1={nodeY} x2={handleInX} y2={handleInY} stroke="hsl(var(--ring))" strokeWidth="1" />
                    <line x1={nodeX} y1={nodeY} x2={handleOutX} y2={handleOutY} stroke="hsl(var(--ring))" strokeWidth="1" />
                </svg>
                <div style={{...handleStyle, left: handleInX - (NODE_HANDLE_SIZE / 2), top: handleInY - (NODE_HANDLE_SIZE / 2)}} onMouseDown={(e) => onNodeMouseDown(e, layer.id, p.id, 'move-handle', 'in')} className="transition-transform hover:scale-125" />
                <div style={{...handleStyle, left: handleOutX - (NODE_HANDLE_SIZE / 2), top: handleOutY - (NODE_HANDLE_SIZE / 2)}} onMouseDown={(e) => onNodeMouseDown(e, layer.id, p.id, 'move-handle', 'out')} className="transition-transform hover:scale-125" />
                <div style={{...handleStyle, width: `${NODE_POINT_SIZE}px`, height: `${NODE_POINT_SIZE}px`, left: nodeX - (NODE_POINT_SIZE / 2), top: nodeY - (NODE_POINT_SIZE / 2), backgroundColor: 'hsl(var(--ring))' }} onMouseDown={(e) => onNodeMouseDown(e, layer.id, p.id, 'move-node')} className="transition-transform hover:scale-125" />
                <div style={{
                    position: 'absolute',
                    left: nodeX - NODE_POINT_SIZE / 2 - 24,
                    top: nodeY - NODE_POINT_SIZE / 2,
                    width: 20, height: 20,
                    backgroundColor: 'hsl(var(--destructive))',
                    color: 'hsl(var(--destructive-foreground))',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: 14,
                    zIndex: 10,
                    pointerEvents: 'auto',
                  }}
                  onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteNode(layer.id, p.id);
                  }}
                  className="transition-all duration-200 ease-in-out hover:bg-red-600 hover:scale-110"
                  >
                    &times;
                </div>
            </React.Fragment>
          )
        })
      }

      {isSelected && !showTransforms && !actionInProgress && !isNodeEditing && !isCroppingThisLayer && <div className="absolute inset-0 border-2 border-ring pointer-events-none group-hover:border-[3px] transition-all" />}
      {!isSelected && project.activeTool === 'select' && !actionInProgress && (
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-ring/50 pointer-events-none rounded-sm" />
      )}
    </div>
  );
}
