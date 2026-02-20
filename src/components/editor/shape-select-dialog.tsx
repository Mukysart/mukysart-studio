'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Square, Circle, Pentagon, Heart, Star, Minus } from "lucide-react";
import type { ShapePrimitive } from "@/lib/types";

type ShapeSelectDialogProps = {
  children: React.ReactNode;
  onShapeSelect: (shape: ShapePrimitive) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DashedLineIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h2" />
      <path d="M11 12h2" />
      <path d="M17 12h2" />
    </svg>
);

const shapes: { name: ShapePrimitive, icon: React.ElementType, label: string }[] = [
    { name: 'rect', icon: Square, label: 'Rectangle' },
    { name: 'circle', icon: Circle, label: 'Circle' },
    { name: 'pentagon', icon: Pentagon, label: 'Pentagon' },
    { name: 'heart', icon: Heart, label: 'Heart' },
    { name: 'star', icon: Star, label: 'Star' },
    { name: 'line', icon: Minus, label: 'Line' },
    { name: 'dashed-line', icon: DashedLineIcon, label: 'Dashed Line' },
];

export function ShapeSelectDialog({ children, onShapeSelect, open, onOpenChange }: ShapeSelectDialogProps) {

  const handleSelect = (shape: ShapePrimitive) => {
    onShapeSelect(shape);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose a shape</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          {shapes.map((shape) => (
            <Button
              key={shape.name}
              variant="outline"
              className="flex flex-col h-24"
              onClick={() => handleSelect(shape.name)}
            >
              <shape.icon className="h-8 w-8 mb-2" />
              {shape.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
