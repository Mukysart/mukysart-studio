'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useEditor } from '@/context/editor-context';
import { Save, Share2, Undo2, Redo2, ZoomIn, ZoomOut, Magnet, FolderOpen } from 'lucide-react';
import { LoadProjectDialog } from './load-project-dialog';

export default function Header() {
  const { project, setProject, zoomToFit, undo, redo, canUndo, canRedo, toggleSnapping, saveProject, exportProject } = useEditor();
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);

  const handleZoom = (factor: number) => {
    setProject(prev => {
        const newZoom = prev.zoom * factor;
        return { ...prev, zoom: Math.max(0.02, Math.min(newZoom, 16)) };
    });
  };

  return (
    <header className="shrink-0 h-14 px-4 flex items-center justify-between border-b bg-card">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold font-headline">Mukysart Studio</h1>
        <Separator orientation="vertical" className="h-6" />
        <span className="text-sm text-muted-foreground">{project.meta.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Zoom Out" onClick={() => handleZoom(1 / 1.2)}>
          <ZoomOut />
        </Button>
        <Button variant="ghost" size="sm" className="w-20" onClick={zoomToFit}>
          {Math.round(project.zoom * 100)}%
        </Button>
        <Button variant="ghost" size="icon" aria-label="Zoom In" onClick={() => handleZoom(1.2)}>
          <ZoomIn />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button 
            variant={project.canvas.guides.snap ? 'secondary' : 'ghost'} 
            size="icon" 
            aria-label="Toggle Snapping" 
            onClick={toggleSnapping}
        >
          <Magnet />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Undo" onClick={undo} disabled={!canUndo}>
          <Undo2 />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Redo" onClick={redo} disabled={!canRedo}>
          <Redo2 />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <LoadProjectDialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
          <Button variant="ghost" size="sm">
            <FolderOpen className="mr-2" />
            Load
          </Button>
        </LoadProjectDialog>
        <Button variant="ghost" size="sm" onClick={saveProject}>
          <Save className="mr-2" />
          Save
        </Button>
        <Button size="sm" onClick={exportProject}>
          <Share2 className="mr-2" />
          Export
        </Button>
      </div>
    </header>
  );
}
