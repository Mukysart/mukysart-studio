'use client';

import React, { useState } from 'react';
import { useEditor } from '@/context/editor-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Tool } from '@/lib/types';
import { MousePointer2, Type, Image, Shapes, PenTool } from 'lucide-react';
import { ShapeSelectDialog } from './shape-select-dialog';
import { ImageUploadDialog } from './image-upload-dialog';

const tools: { name: Tool; icon: React.ElementType; label: string }[] = [
  { name: 'select', icon: MousePointer2, label: 'Select (V)' },
  { name: 'text', icon: Type, label: 'Text (T)' },
  { name: 'image', icon: Image, label: 'Image (I)' },
  { name: 'shape', icon: Shapes, label: 'Shape (S)' },
  { name: 'node', icon: PenTool, label: 'Node Edit (P)' },
];

export default function Toolbar() {
  const { project, setActiveTool, setSelectedShape } = useEditor();
  const [isShapeDialogOpen, setIsShapeDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  const handleToolClick = (tool: Tool) => {
    if (tool === 'shape') {
      setIsShapeDialogOpen(true);
    } else if (tool === 'image') {
      setIsImageDialogOpen(true);
    }
     else {
      setActiveTool(tool);
    }
  };

  return (
    <aside className="w-16 flex flex-col items-center gap-2 py-4 border-r bg-card">
      <TooltipProvider delayDuration={0}>
        <nav className="flex flex-col gap-2">
          {tools.map((tool) => {
            const isShapeTool = tool.name === 'shape';
            const isImageTool = tool.name === 'image';
            const trigger = (
              <Tooltip key={tool.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'rounded-lg',
                      project.activeTool === tool.name && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                    )}
                    onClick={() => handleToolClick(tool.name)}
                    aria-label={tool.label}
                  >
                    <tool.icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{tool.label}</p>
                </TooltipContent>
              </Tooltip>
            );

            if (isShapeTool) {
              return (
                <ShapeSelectDialog
                  key="shape-dialog"
                  open={isShapeDialogOpen}
                  onOpenChange={setIsShapeDialogOpen}
                  onShapeSelect={setSelectedShape}
                >
                  {trigger}
                </ShapeSelectDialog>
              );
            }
            if (isImageTool) {
              return (
                <ImageUploadDialog
                  key="image-dialog"
                  open={isImageDialogOpen}
                  onOpenChange={setIsImageDialogOpen}
                >
                  {trigger}
                </ImageUploadDialog>
              );
            }
            return trigger;
          })}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
