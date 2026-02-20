'use client';

import { 
    AlignHorizontalJustifyCenter, 
    AlignHorizontalJustifyEnd, 
    AlignHorizontalJustifyStart, 
    AlignVerticalJustifyCenter, 
    AlignVerticalJustifyEnd, 
    AlignVerticalJustifyStart, 
    BringToFront, 
    Copy, 
    SendToBack, 
    Trash2 
} from "lucide-react";
import { useEditor } from "@/context/editor-context";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

export default function QuickActionsPanel() {
    const { project, alignLayers, bringToFront, sendToBack, duplicateLayers, deleteLayers } = useEditor();
    const { selectedLayers } = project;

    const handleDuplicate = () => {
        duplicateLayers(selectedLayers);
    }

    const handleDelete = () => {
        deleteLayers(selectedLayers);
    }

    return (
        <TooltipProvider>
            <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1 p-1 border rounded-lg">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => alignLayers('left')}><AlignHorizontalJustifyStart /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Align Left</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => alignLayers('center')}><AlignHorizontalJustifyCenter /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Align Center</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => alignLayers('right')}><AlignHorizontalJustifyEnd /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Align Right</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => alignLayers('top')}><AlignVerticalJustifyStart /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Align Top</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => alignLayers('middle')}><AlignVerticalJustifyCenter /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Align Middle</TooltipContent>
                    </Tooltip>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => alignLayers('bottom')}><AlignVerticalJustifyEnd /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Align Bottom</TooltipContent>
                    </Tooltip>
                </div>
                 <div className="grid grid-cols-4 gap-1 p-1 border rounded-lg">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => bringToFront()}><BringToFront /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Bring to Front</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => sendToBack()}><SendToBack /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Send to Back</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleDuplicate}><Copy /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicate</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={handleDelete}><Trash2 /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    )
}
