'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from "@/components/ui/button";
import { useEditor } from "@/context/editor-context";
import { getProjects as getProjectsFromProvider, deleteProject as deleteProjectFromProvider } from '@/lib/data-provider';
import type { ProjectState } from "@/lib/types";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

type LoadProjectDialogProps = {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoadProjectDialog({ children, open, onOpenChange }: LoadProjectDialogProps) {
    const { loadProject, toast } = useEditor();
    const [projects, setProjects] = useState<ProjectState[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const refreshProjects = async () => {
        setIsLoading(true);
        try {
            const fetchedProjects = await getProjectsFromProvider();
            setProjects(fetchedProjects);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Failed to load projects' });
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (open) {
            refreshProjects();
        }
    }, [open]);

    const handleLoad = (id: string) => {
        loadProject(id);
        onOpenChange(false);
    }
    
    const handleDelete = async (id: string) => {
        try {
            await deleteProjectFromProvider(id);
            toast({ title: 'Project Deleted' });
            refreshProjects();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Delete Failed' });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Load Project</DialogTitle>
                    <DialogDescription>
                        Select a project saved in your browser to continue editing.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    {isLoading ? (
                        <div className="text-center text-muted-foreground py-10">Loading projects...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                            {projects.length > 0 ? (
                                projects.map(p => (
                                    <div key={p.meta.id} className="border rounded-lg overflow-hidden flex flex-col group">
                                        <div className="aspect-video bg-muted relative">
                                            {p.meta.thumbnail ? (
                                                <Image src={p.meta.thumbnail} alt={p.meta.name} layout="fill" objectFit="cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No preview</div>
                                            )}
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col">
                                            <h3 className="font-semibold truncate">{p.meta.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Updated {p.meta.updatedAt ? formatDistanceToNow(new Date(p.meta.updatedAt), { addSuffix: true }) : 'a while ago'}
                                            </p>
                                            <div className="mt-4 flex items-center gap-2 pt-4 border-t">
                                                <Button size="sm" className="flex-1" onClick={() => handleLoad(p.meta.id)}>Load</Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="icon"><Trash2 /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the project from your browser.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(p.meta.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center text-muted-foreground py-10">
                                    No saved projects found in this browser.
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
