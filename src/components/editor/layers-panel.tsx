'use client';

import React, { useState, useRef } from 'react';
import { useEditor } from '@/context/editor-context';
import { Eye, EyeOff, Lock, Unlock, Trash2, Folder, Box, Layers, FolderPlus, ChevronDown, Copy, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Layer, Group } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion';
import * as AccordionPrimitive from '@radix-ui/react-accordion';


type DraggedItem = {
  id: string;
  type: 'layer' | 'group';
};

type DropIndicator = {
  targetId: string;
  position: 'before' | 'after' | 'inside';
};

export default function LayersPanel() {
  const { project, setSelectedLayers, updateLayer, deleteLayers, groupLayers, ungroupLayers, updateGroup, deleteGroup, addNewGroup, handleLayerDrop, duplicateLayers, moveLayer } = useEditor();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSelect = (e: React.MouseEvent, id: string, type: 'layer' | 'group') => {
    if (renamingId === id) return;
    
    if (type === 'group') {
        const group = project.groups.find(g => g.id === id);
        if (group) {
            setSelectedLayers(group.layerIds);
        }
        return;
    }

    if (e.shiftKey) {
      const currentSelection = project.selectedLayers;
      if (currentSelection.includes(id)) {
        setSelectedLayers(currentSelection.filter((layerId) => layerId !== id));
      } else {
        setSelectedLayers([...currentSelection, id]);
      }
    } else {
      setSelectedLayers([id]);
    }
  };

  const handleRenameStart = (item: Layer | Group) => {
    setRenamingId(item.id);
    setNewName(item.name);
  };

  const handleRenameEnd = () => {
    if (renamingId && newName.trim()) {
        const isGroup = project.groups.some(g => g.id === renamingId);
        if (isGroup) {
            updateGroup(renamingId, { name: newName.trim() });
        } else {
            updateLayer(renamingId, { name: newName.trim() });
        }
    }
    setRenamingId(null);
    setNewName('');
  };

  const handleGroup = () => {
    if (project.selectedLayers.length > 1) {
        groupLayers(project.selectedLayers);
    }
  }

  const handleUngroup = () => {
    const firstSelectedLayer = project.layers.find(l => project.selectedLayers.includes(l.id));
    if (firstSelectedLayer?.groupId) {
        ungroupLayers(firstSelectedLayer.groupId);
    }
  }

  const sortedLayers = [...project.layers].sort((a, b) => b.zIndex - a.zIndex);

  const onDragStart = (e: React.DragEvent, id: string, type: 'layer' | 'group') => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggedItem({ id, type });
  };
  
  const onDragOverItem = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.id === targetId) {
      setDropIndicator(null);
      return;
    }
  
    const targetElement = (e.currentTarget as HTMLElement);
    const rect = targetElement.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const position: 'before' | 'after' = y < rect.height / 2 ? 'before' : 'after';
  
    setDropIndicator({ targetId, position });
  };

  const onDragOverGroupContent = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.id === groupId || draggedItem.type === 'group') {
      setDropIndicator(null);
      return;
    };
    
    setDropIndicator({ targetId: groupId, position: 'inside' });
  }
  
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem && dropIndicator) {
      if (dropIndicator.targetId === 'root-drop-zone') {
        handleLayerDrop(draggedItem.id, null, 'after');
      } else {
        handleLayerDrop(draggedItem.id, dropIndicator.targetId, dropIndicator.position);
      }
    }
    setDraggedItem(null);
    setDropIndicator(null);
  };

  const onDragEnd = () => {
    setDraggedItem(null);
    setDropIndicator(null);
  };

  const onDragLeavePanel = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropIndicator(null);
  };

  const layersInGroups = new Set(project.groups.flatMap(g => g.layerIds));
  const rootLayers = sortedLayers.filter(l => !layersInGroups.has(l.id));

  const renderLayerItem = (layer: Layer, isGrouped = false) => {
    const isSelected = project.selectedLayers.includes(layer.id);
    const isBeingDragged = draggedItem?.id === layer.id;
    const isDropTarget = dropIndicator?.targetId === layer.id && dropIndicator.position !== 'inside';
    return (
        <li
            key={layer.id}
            data-id={layer.id}
            draggable
            onDragStart={(e) => onDragStart(e, layer.id, 'layer')}
            onDragOver={(e) => onDragOverItem(e, layer.id)}
            className={cn(
              'relative flex items-center justify-between p-2 rounded-md hover:bg-accent/20 cursor-pointer',
              isGrouped && 'ml-4',
              isSelected && 'bg-accent/10',
              isBeingDragged && 'opacity-50',
            )}
            onClick={(e) => handleSelect(e, layer.id, 'layer')}
          >
            {isDropTarget && <div className={cn("absolute left-0 right-0 h-0.5 bg-ring", dropIndicator.position === 'before' ? '-top-px' : '-bottom-px')} />}
            {renamingId === layer.id ? (
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRenameEnd}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameEnd();
                  if (e.key === 'Escape') { setRenamingId(null); setNewName(''); }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="h-7 text-sm"
              />
            ) : (
              <span className="text-sm truncate flex items-center gap-2" onDoubleClick={() => handleRenameStart(layer)}>
                <MoreVertical className="h-4 w-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleRenameStart(layer); }}/>
                {layer.name}
              </span>
            )}
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); duplicateLayers([layer.id]); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}>
                {layer.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}>
                {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteLayers([layer.id]); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
    )
  }

  if (project.layers.length === 0 && project.groups.length <= 1) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center text-muted-foreground text-sm pt-10 flex-1">
          <p>No layers yet</p>
          <p className="mt-2 text-xs">Use the tools to add text, images, or shapes.</p>
        </div>
        <div className="p-2 border-t flex items-center justify-center">
            <Button variant="outline" size="sm" onClick={() => addNewGroup('New Group')}>
                <FolderPlus className="mr-2 h-4 w-4"/> Add Group
            </Button>
        </div>
      </div>
    );
  }
  
  const sortedGroups = [...project.groups].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col h-full" ref={panelRef} onDrop={onDrop} onDragEnd={onDragEnd} onDragLeave={onDragLeavePanel}>
        <div className="flex-1 overflow-y-auto p-4">
            <Accordion type="multiple" className="w-full" defaultValue={project.groups.map(g => g.id)}>
                {sortedGroups.map(group => {
                    const groupLayers = sortedLayers.filter(l => l.groupId === group.id);
                    const isGroupSelected = group.layerIds.length > 0 && group.layerIds.every(id => project.selectedLayers.includes(id));
                    const isDropTargetBeforeOrAfter = dropIndicator?.targetId === group.id && dropIndicator.position !== 'inside';
                    const isDropTargetInside = dropIndicator?.targetId === group.id && dropIndicator.position === 'inside';

                    return (
                        <AccordionItem 
                            key={group.id} 
                            value={group.id} 
                            data-id={group.id}
                            className="relative border-b group/item"
                        >
                            {isDropTargetBeforeOrAfter && <div className={cn("absolute left-0 right-0 h-0.5 bg-ring z-10", dropIndicator.position === 'before' ? '-top-px' : 'bottom-[-1px]')} />}
                            <AccordionPrimitive.Header 
                                onDragOver={(e) => onDragOverItem(e, group.id)}
                                className={cn(
                                    "flex items-center justify-between w-full px-2 rounded-md",
                                    "hover:bg-accent/20",
                                    isGroupSelected && 'bg-accent/10'
                                )}
                            >
                                {renamingId === group.id ? (
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        onBlur={handleRenameEnd}
                                        onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameEnd();
                                        if (e.key === 'Escape') { setRenamingId(null); setNewName(''); }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                        className="h-7 text-sm my-1 flex-1 bg-transparent"
                                    />
                                ) : (
                                    <AccordionPrimitive.Trigger 
                                        className="flex-1 flex items-center justify-between py-2 text-sm text-left"
                                        onClick={(e) => handleSelect(e, group.id, 'group')}
                                    >
                                        <span className="text-sm truncate flex items-center gap-2" onDoubleClick={(e) => { e.stopPropagation(); handleRenameStart(group)}}>
                                            <Folder className="h-4 w-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleRenameStart(group); }}/>
                                            {group.name}
                                        </span>
                                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/item:rotate-180" />
                                    </AccordionPrimitive.Trigger>
                                )}

                                <div className="flex items-center gap-1 shrink-0 pl-2">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateGroup(group.id, { locked: !group.locked }); }}>
                                        {group.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateGroup(group.id, { visible: !group.visible }); }}>
                                        {group.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </Button>
                                    {group.id !== 'editable-group' && (
                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </AccordionPrimitive.Header>
                            <AccordionContent onDragOver={(e) => onDragOverGroupContent(e, group.id)}>
                                <ul className={cn(
                                    "space-y-1 p-1 rounded-lg border-2 border-dashed border-transparent transition-colors",
                                    isDropTargetInside && 'border-ring bg-accent/10'
                                    )}>
                                    {groupLayers.length > 0 ? (
                                        groupLayers.map(layer => renderLayerItem(layer, true))
                                    ) : (
                                        <li className="text-xs text-muted-foreground text-center p-2 h-8 flex items-center justify-center">Drop to add to group</li>
                                    )}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
            <ul 
                className={cn(
                    "space-y-1 mt-2 p-1 rounded-lg border-2 border-dashed border-transparent transition-colors min-h-[40px]",
                    dropIndicator?.targetId === 'root-drop-zone' && 'border-ring bg-accent/10'
                )}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedItem?.type === 'layer') {
                        setDropIndicator({ targetId: 'root-drop-zone', position: 'inside' });
                    }
                }}
            >
                {rootLayers.length > 0 ? (
                    rootLayers.map(layer => renderLayerItem(layer))
                ) : (
                    <li className="text-xs text-muted-foreground text-center p-2 h-8 flex items-center justify-center pointer-events-none">Drop here to make a root layer</li>
                )}
            </ul>
        </div>
        <div className="p-2 border-t flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => addNewGroup('New Group')}>
                <FolderPlus className="mr-2 h-4 w-4"/> Add Group
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={handleGroup} disabled={project.selectedLayers.length < 2}>
                <Layers className="mr-2 h-4 w-4"/> Group
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={handleUngroup} disabled={!project.selectedLayers.some(id => project.layers.find(l => l.id === id)?.groupId)}>
                <Box className="mr-2 h-4 w-4"/> Ungroup
            </Button>
        </div>
    </div>
  );
}
