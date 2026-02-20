'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState, useRef } from "react";
import { useEditor } from "@/context/editor-context";
import { handleImageFile as processImageFile } from "@/lib/image-provider";

type ImageUploadDialogProps = {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ImageUploadDialog({ children, open, onOpenChange }: ImageUploadDialogProps) {
    const { addImageLayer, toast } = useEditor();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsLoading(true);
            try {
                const { src, width, height } = await processImageFile(file);
                setImageSrc(src);
                setImageDimensions({ width, height });
            } catch (error) {
                console.error(error);
                toast({ variant: 'destructive', title: 'Image Processing Failed', description: 'Could not process the selected image.' });
                resetState();
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleAddToCanvas = () => {
        if (imageSrc && imageDimensions) {
            addImageLayer(imageSrc, imageDimensions.width, imageDimensions.height);
            onOpenChange(false);
            resetState();
        }
    }
    
    const resetState = () => {
        setImageSrc(null);
        setImageDimensions(null);
        setIsLoading(false);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        if(!isOpen) {
            resetState();
        }
        onOpenChange(isOpen);
    }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload an Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="image-upload">Picture</Label>
                <Input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} disabled={isLoading}/>
            </div>
            {isLoading && <p className="text-sm text-muted-foreground">Processing image...</p>}
            {imageSrc && (
                <div className="border rounded-md p-2 flex items-center justify-center bg-muted/40">
                    <img src={imageSrc} alt="Preview" className="max-h-64 rounded-md" />
                </div>
            )}
        </div>
        <Button onClick={handleAddToCanvas} disabled={!imageSrc || isLoading}>
          Add to Canvas
        </Button>
      </DialogContent>
    </Dialog>
  )
}
