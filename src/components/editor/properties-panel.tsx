'use client';

import React, { useState, useEffect, useId } from 'react';
import { useEditor } from '@/context/editor-context';
import type { Layer, TextLayer, ShapeLayer, ImageLayer, Color, ColorStop, SolidColor, Guide, ProjectState } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Strikethrough, Lock, Unlock, Crop, Trash2, Pipette, ChevronUp, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateUUID } from '@/lib/uuid';
import { Switch } from '@/components/ui/switch';
import QuickActionsPanel from './quick-actions-panel';
import { handleImageFile as processImageFile } from '@/lib/image-provider';
import { allFontFamilies } from '@/lib/fonts';

// Helper for safely updating nested properties immutably
function updateNestedProperty(layer: Layer, path: string, value: any): Layer {
  const keys = path.split('.');
  const newLayer = { ...layer } as any; // Shallow copy top level
  let currentLevel = newLayer;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    // Create shallow copies for each level of the path
    currentLevel[key] = { ...currentLevel[key] };
    currentLevel = currentLevel[key];
  }

  currentLevel[keys[keys.length - 1]] = value;
  return newLayer;
}

function NumberInput({ value, onChange, onCommit, ...props }: { value: number; onChange: (newValue: number) => void; onCommit?: () => void; } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'>) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '' || e.target.value === '-') {
      onChange(0);
      return;
    }
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const step = (amount: number) => {
    onChange(value + amount);
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        onBlur={onCommit}
        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-10"
        {...props}
      />
      <div className="flex flex-col border bg-background rounded-md overflow-hidden">
        <button
          tabIndex={-1}
          onClick={() => step(1)}
          onMouseUp={onCommit}
          className="flex h-5 w-6 items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <div className="h-px bg-border w-full"></div>
        <button
          tabIndex={-1}
          onClick={() => step(-1)}
          onMouseUp={onCommit}
          className="flex h-5 w-6 items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


type ColorEditorProps = {
  color: Color;
  onChange: (color: Color) => void;
  enableTransparent?: boolean;
};

function ColorEditor({ color, onChange, enableTransparent = false }: ColorEditorProps) {
  const { project, activateEyedropper, eyedropper, finishEyedropper } = useEditor();
  const pickerId = useId();
  const isPickerActive = eyedropper?.isActive && eyedropper.id === pickerId;

  const safeColor: Color = React.useMemo(() => {
    const defaultSolid: SolidColor = { type: 'solid', mode: 'mapped', value: 'primary' };
    if (!color) return defaultSolid;
    if (!color.type) {
      return { ...defaultSolid, ...(color as any) };
    }
    return color;
  }, [color]);

  const [activeTab, setActiveTab] = useState(safeColor.type);

  useEffect(() => {
    setActiveTab(safeColor.type);
  }, [safeColor.type]);

  const handleTypeChange = (newType: 'solid' | 'linear' | 'radial') => {
    if (newType === safeColor.type) return;
    setActiveTab(newType);

    if (newType === 'solid') {
      onChange({ type: 'solid', mode: 'mapped', value: 'primary' });
    } else if (newType === 'linear') {
      onChange({
        type: 'linear',
        angle: 90,
        stops: [
          { id: generateUUID(), color: project.colors.primary, position: 0 },
          { id: generateUUID(), color: project.colors.accent, position: 100 },
        ],
      });
    } else if (newType === 'radial') {
      onChange({
        type: 'radial',
        shape: 'ellipse',
        stops: [
          { id: generateUUID(), color: project.colors.primary, position: 0 },
          { id: generateUUID(), color: project.colors.accent, position: 100 },
        ],
      });
    }
  };

  const getDisplayColorValue = () => {
    if (safeColor.type === 'solid') {
      if (safeColor.mode === 'mapped') {
        return project.colors[safeColor.value as keyof typeof project.colors] || safeColor.value;
      }
      return safeColor.value;
    }
    if (safeColor.type === 'linear' || safeColor.type === 'radial') {
      return safeColor.stops[0]?.color || '#000000';
    }
    return '#000000';
  };
  
  const getGradientPreview = () => {
      if (safeColor.type === 'linear') {
          return `linear-gradient(${safeColor.angle}deg, ${safeColor.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`;
      }
      if (safeColor.type === 'radial') {
          return `radial-gradient(${safeColor.shape}, ${safeColor.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`;
      }
      return 'hsl(var(--muted))';
  }

  const handleStopChange = (stopId: string, newProps: Partial<ColorStop>) => {
    if (safeColor.type === 'linear' || safeColor.type === 'radial') {
      const newStops = safeColor.stops.map(s => s.id === stopId ? { ...s, ...newProps } : s);
      onChange({ ...safeColor, stops: newStops });
    }
  };

  const addStop = () => {
    if (safeColor.type === 'linear' || safeColor.type === 'radial') {
      const newStop: ColorStop = {
        id: generateUUID(),
        color: '#ffffff',
        position: 50,
      };
      const newStops = [...safeColor.stops, newStop].sort((a,b) => a.position - b.position);
      onChange({ ...safeColor, stops: newStops });
    }
  };

  const removeStop = (stopId: string) => {
    if (safeColor.type === 'linear' || safeColor.type === 'radial') {
        if (safeColor.stops.length <= 2) return;
        const newStops = safeColor.stops.filter(s => s.id !== stopId);
        onChange({ ...safeColor, stops: newStops });
    }
  };
  
  const handleSolidChange = (newSolid: SolidColor) => {
    if (newSolid.mode === 'custom' && newSolid.value.length > 7) {
        newSolid.value = newSolid.value.substring(0, 7);
    }
    onChange(newSolid);
  }

  const handleEyedropper = () => {
    if (isPickerActive) {
        finishEyedropper(null);
        return;
    }
    activateEyedropper(pickerId, (newColor) => {
        if (newColor) {
            onChange({ type: 'solid', mode: 'custom', value: newColor });
        }
    });
  };

  const previewSwatchBackground = isPickerActive && eyedropper.previewColor ? eyedropper.previewColor : (safeColor.type === 'solid' ? getDisplayColorValue() : getGradientPreview());
  const displayInputValue = isPickerActive && eyedropper.previewColor ? eyedropper.previewColor : (safeColor.type === 'solid' ? getDisplayColorValue() : `${safeColor.type} gradient`);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 w-10 p-0 border">
              <div className="w-full h-full rounded-sm checkerboard">
                <div 
                    className="w-full h-full rounded-sm" 
                    style={{ background: previewSwatchBackground }} 
                />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
             <Tabs value={activeTab} onValueChange={(value) => handleTypeChange(value as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-b-none">
                    <TabsTrigger value="solid">Solid</TabsTrigger>
                    <TabsTrigger value="linear">Linear</TabsTrigger>
                    <TabsTrigger value="radial">Radial</TabsTrigger>
                </TabsList>
                <TabsContent value="solid" className="p-2 space-y-2 mt-0">
                  {safeColor.type === 'solid' && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground px-1">Theme Colors</p>
                      <div className="flex gap-1">
                        {(Object.keys(project.colors) as Array<keyof typeof project.colors>).map((key) => (
                          <Button
                            key={key}
                            variant="outline"
                            className={cn('h-8 w-8 p-0 border', safeColor.mode === 'mapped' && safeColor.value === key && 'ring-2 ring-ring')}
                            onClick={() => handleSolidChange({ type: 'solid', mode: 'mapped', value: key })}
                          >
                            <div className="w-full h-full rounded-sm" style={{ backgroundColor: project.colors[key] }} />
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs font-medium text-muted-foreground px-1 pt-2">Custom Color</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={safeColor.mode === 'custom' ? safeColor.value : '#000000'}
                          onChange={(e) => handleSolidChange({ type: 'solid', mode: 'custom', value: e.target.value })}
                          className="w-10 h-10 p-1"
                        />
                        <Input
                          value={safeColor.mode === 'custom' ? safeColor.value : ''}
                          placeholder="#000000"
                          onChange={(e) => handleSolidChange({ type: 'solid', mode: 'custom', value: e.target.value })}
                          onFocus={() => { if (safeColor.mode === 'mapped') handleSolidChange({ type: 'solid', mode: 'custom', value: getDisplayColorValue() })}}
                        />
                      </div>
                      {enableTransparent && (
                        <Button variant="outline" size="sm" onClick={() => handleSolidChange({ type: 'solid', mode: 'custom', value: 'transparent' })}>
                          Set Transparent
                        </Button>
                      )}
                    </>
                  )}
                </TabsContent>
                <TabsContent value="linear" className="p-2 space-y-4 mt-0">
                    {safeColor.type === 'linear' && (
                        <div className="space-y-4">
                            <div>
                                <Label>Angle</Label>
                                <Slider value={[safeColor.angle]} onValueChange={([val]) => onChange({ ...safeColor, angle: val })} min={0} max={360} step={1} />
                            </div>
                            <div>
                                <Label>Stops</Label>
                                <div className="space-y-2 mt-1">
                                    {safeColor.stops.map(stop => (
                                        <div key={stop.id} className="flex items-center gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="h-8 w-8 p-0 border">
                                                        <div className="w-full h-full rounded-sm" style={{ backgroundColor: stop.color }}/>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                     <Input type="color" value={stop.color} onChange={e => handleStopChange(stop.id, { color: e.target.value })} className="w-24 h-24 p-1" />
                                                </PopoverContent>
                                            </Popover>
                                            <Input className="h-8" type="text" value={stop.color} onChange={e => handleStopChange(stop.id, { color: e.target.value })} />
                                            <NumberInput className="h-8 w-16" value={stop.position} onChange={v => handleStopChange(stop.id, { position: v })} />
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStop(stop.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={addStop}>Add Stop</Button>
                            </div>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="radial" className="p-2 space-y-4 mt-0">
                    {safeColor.type === 'radial' && (
                         <div className="space-y-4">
                            <div>
                                <Label>Shape</Label>
                                <Select value={safeColor.shape} onValueChange={(val: 'circle' | 'ellipse') => onChange({ ...safeColor, shape: val })}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="circle">Circle</SelectItem>
                                        <SelectItem value="ellipse">Ellipse</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Stops</Label>
                                <div className="space-y-2 mt-1">
                                    {safeColor.stops.map(stop => (
                                        <div key={stop.id} className="flex items-center gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="h-8 w-8 p-0 border">
                                                        <div className="w-full h-full rounded-sm" style={{ backgroundColor: stop.color }}/>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                     <Input type="color" value={stop.color} onChange={e => handleStopChange(stop.id, { color: e.target.value })} className="w-24 h-24 p-1" />
                                                </PopoverContent>
                                            </Popover>
                                            <Input className="h-8" type="text" value={stop.color} onChange={e => handleStopChange(stop.id, { color: e.target.value })} />
                                            <NumberInput className="h-8 w-16" value={stop.position} onChange={v => handleStopChange(stop.id, { position: v })} />
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStop(stop.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={addStop}>Add Stop</Button>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
        <Input
            value={displayInputValue}
            className="flex-1"
            readOnly={safeColor.type !== 'solid' || isPickerActive}
            onChange={(e) => {
                if (safeColor.type === 'solid') {
                    onChange({ type: 'solid', mode: 'custom', value: e.target.value });
                }
            }}
        />
        <Button variant={isPickerActive ? 'secondary' : 'outline'} size="icon" className="h-10 w-10" onClick={handleEyedropper}>
          <Pipette className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}


function TextLayerProperties({ layer }: { layer: TextLayer }) {
  const { project, setProject, setProjectLive, commitHistory } = useEditor();
  const [initialStateOnDrag, setInitialStateOnDrag] = useState<ProjectState | null>(null);

  const handlePropertyChange = (path: string, value: any) => {
    setProject(prev => ({
      ...prev,
      layers: prev.layers.map(l =>
        l.id === layer.id ? updateNestedProperty(l, path, value) : l
      ),
    }));
  };

  const handlePropertyChangeLive = (path: string, value: any) => {
    if (!initialStateOnDrag) {
      setInitialStateOnDrag(project);
    }
    setProjectLive(prev => ({
      ...prev,
      layers: prev.layers.map(l =>
        l.id === layer.id ? updateNestedProperty(l, path, value) : l
      ),
    }));
  };
  
  const handleCommit = () => {
    if (initialStateOnDrag) {
      commitHistory(initialStateOnDrag, project);
      setInitialStateOnDrag(null);
    }
  };
  
  const handleInteractionStart = () => {
    if (!initialStateOnDrag) {
      setInitialStateOnDrag(project);
    }
  }

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={['content', 'color', 'transform', 'font']} className="w-full">
        <AccordionItem value="content">
          <AccordionTrigger className="text-sm font-medium">Content</AccordionTrigger>
          <AccordionContent>
            <Textarea
              value={layer.content}
              onChange={(e) => handlePropertyChange('content', e.target.value)}
              className="mt-1"
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="color">
            <AccordionTrigger className="text-sm font-medium">Color</AccordionTrigger>
            <AccordionContent>
                <ColorEditor 
                    color={layer.color} 
                    onChange={(newColor) => handlePropertyChange('color', newColor)}
                />
            </AccordionContent>
        </AccordionItem>
        <AccordionItem value="transform">
          <AccordionTrigger className="text-sm font-medium">Transform</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>X</Label><NumberInput value={Math.round(layer.transform.x)} onChange={v => handlePropertyChangeLive('transform.x', v)} onCommit={handleCommit} /></div>
                  <div><Label>Y</Label><NumberInput value={Math.round(layer.transform.y)} onChange={v => handlePropertyChangeLive('transform.y', v)} onCommit={handleCommit} /></div>
                  <div><Label>Width</Label><NumberInput value={Math.round(layer.transform.width)} onChange={v => handlePropertyChangeLive('transform.width', Math.max(10, v))} onCommit={handleCommit} /></div>
                  <div><Label>Height</Label><NumberInput value={Math.round(layer.transform.height)} onChange={v => handlePropertyChangeLive('transform.height', Math.max(10, v))} onCommit={handleCommit} /></div>
                  <div><Label>Rotation</Label><NumberInput value={Math.round(layer.transform.rotation)} onChange={v => handlePropertyChangeLive('transform.rotation', v)} onCommit={handleCommit} /></div>
                </div>
                <div className="space-y-2">
                    <Label>Opacity: {Math.round(layer.transform.opacity * 100)}%</Label>
                    <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                      <Slider value={[layer.transform.opacity]} onValueChange={([val]) => handlePropertyChangeLive('transform.opacity', val)} min={0} max={1} step={0.01} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Blur: {Math.round(layer.transform.blur || 0)}px</Label>
                    <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                      <Slider value={[layer.transform.blur || 0]} onValueChange={([val]) => handlePropertyChangeLive('transform.blur', val)} min={0} max={100} step={1} />
                    </div>
                </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="font">
          <AccordionTrigger className="text-sm font-medium">Typography</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div>
                <Label>Font Family</Label>
                <Select value={layer.font.family} onValueChange={(value) => handlePropertyChange('font.family', value)}>
                  <SelectTrigger><SelectValue placeholder="Font Family" /></SelectTrigger>
                  <SelectContent>
                    {allFontFamilies.map(font => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>{font}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput value={layer.font.size} onChange={v => handlePropertyChangeLive('font.size', Math.max(1, v))} onCommit={handleCommit} placeholder="Size" />
                <Select value={layer.font.align} onValueChange={(value: 'left' | 'center' | 'right') => handlePropertyChange('font.align', value)}>
                  <SelectTrigger><SelectValue placeholder="Alignment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={layer.font.weight > 400 ? 'secondary' : 'outline'} size="icon" onClick={() => handlePropertyChange('font.weight', layer.font.weight > 400 ? 400 : 700)}><Bold className="h-4 w-4" /></Button>
                <Button variant={layer.font.style === 'italic' ? 'secondary' : 'outline'} size="icon" onClick={() => handlePropertyChange('font.style', layer.font.style === 'italic' ? 'normal' : 'italic')}><Italic className="h-4 w-4" /></Button>
                <Button variant={layer.font.decoration === 'underline' ? 'secondary' : 'outline'} size="icon" onClick={() => handlePropertyChange('font.decoration', layer.font.decoration === 'underline' ? 'none' : 'underline')}><Underline className="h-4 w-4" /></Button>
                <Button variant={layer.font.decoration === 'line-through' ? 'secondary' : 'outline'} size="icon" onClick={() => handlePropertyChange('font.decoration', layer.font.decoration === 'line-through' ? 'none' : 'line-through')}><Strikethrough className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                <Label>Line Height: {layer.font.lineHeight.toFixed(1)}</Label>
                 <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider value={[layer.font.lineHeight]} onValueChange={([val]) => handlePropertyChangeLive('font.lineHeight', val)} min={0.5} max={3} step={0.1} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Letter Spacing: {layer.font.letterSpacing.toFixed(1)}</Label>
                 <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider value={[layer.font.letterSpacing]} onValueChange={([val]) => handlePropertyChangeLive('font.letterSpacing', val)} min={-5} max={20} step={0.1} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Padding: {(layer.padding || 0).toFixed(0)}px</Label>
                 <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider value={[layer.padding || 0]} onValueChange={([val]) => handlePropertyChangeLive('padding', val)} min={0} max={100} step={1} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="shadow">
          <AccordionTrigger className="text-sm font-medium">Shadow</AccordionTrigger>
          <AccordionContent>
            {layer.font.shadow ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input type="color" value={layer.font.shadow.color} onChange={e => handlePropertyChange('font.shadow.color', e.target.value)} className="w-10 h-10 p-1" />
                  <Input value={layer.font.shadow.color} onChange={e => handlePropertyChange('font.shadow.color', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Blur: {layer.font.shadow.blur}px</Label>
                  <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider 
                      value={[layer.font.shadow.blur]} 
                      onValueChange={([val]) => handlePropertyChangeLive('font.shadow.blur', val)}
                      min={0} max={50} step={1}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Offset X</Label><NumberInput value={layer.font.shadow.offsetX} onChange={v => handlePropertyChangeLive('font.shadow.offsetX', v)} onCommit={handleCommit} /></div>
                  <div><Label>Offset Y</Label><NumberInput value={layer.font.shadow.offsetY} onChange={v => handlePropertyChangeLive('font.shadow.offsetY', v)} onCommit={handleCommit} /></div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handlePropertyChange('font.shadow', null)}>Remove Shadow</Button>
              </div>
            ) : (
              <Button onClick={() => handlePropertyChange('font.shadow', { color: '#000000', blur: 5, offsetX: 5, offsetY: 5 })}>Add Shadow</Button>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="outline">
          <AccordionTrigger className="text-sm font-medium">Outline</AccordionTrigger>
          <AccordionContent>
            {layer.font.outline ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Input type="color" value={layer.font.outline.color} onChange={e => handlePropertyChange('font.outline.color', e.target.value)} className="w-10 h-10 p-1" />
                        <Input value={layer.font.outline.color} onChange={e => handlePropertyChange('font.outline.color', e.target.value)} />
                    </div>
                    <div>
                        <Label>Width</Label>
                        <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                          <Slider value={[layer.font.outline.width]} onValueChange={([val]) => handlePropertyChangeLive('font.outline.width', val)} min={0} max={10} step={0.5} />
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handlePropertyChange('font.outline', null)}>Remove Outline</Button>
                </div>
            ) : (
                <Button onClick={() => handlePropertyChange('font.outline', { color: '#000000', width: 1 })}>Add Outline</Button>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="curve">
          <AccordionTrigger className="text-sm font-medium">Curve</AccordionTrigger>
          <AccordionContent>
            {layer.font.curve ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Bend: {layer.font.curve.amount.toFixed(0)}</Label>
                   <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider 
                      value={[layer.font.curve.amount]} 
                      onValueChange={([val]) => handlePropertyChangeLive('font.curve.amount', val)}
                      min={-100} max={100} step={1}
                    />
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handlePropertyChange('font.curve', null)}>Remove Curve</Button>
              </div>
            ) : (
              <Button onClick={() => handlePropertyChange('font.curve', { amount: 20 })}>Add Curve</Button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function ShapeLayerProperties({ layer }: { layer: ShapeLayer }) {
  const { project, setProject, setProjectLive, commitHistory, toggleCropMode, toast } = useEditor();
  const [areCornersLinked, setAreCornersLinked] = useState(
    typeof layer.shape.borderRadius !== 'object'
  );
  const isCropping = project.croppingLayerId === layer.id;
  const isClosedShape = layer.shape.isClosed !== false;
  const [initialStateOnDrag, setInitialStateOnDrag] = useState<ProjectState | null>(null);

  useEffect(() => {
    setAreCornersLinked(typeof layer.shape.borderRadius !== 'object');
  }, [layer.id, layer.shape.borderRadius]);

  const handlePropertyChange = (path: string, value: any) => {
    setProject(prev => ({
      ...prev,
      layers: prev.layers.map(l =>
        l.id === layer.id ? updateNestedProperty(l, path, value) : l
      ),
    }));
  };

  const handlePropertyChangeLive = (path: string, value: any) => {
    if (!initialStateOnDrag) {
      setInitialStateOnDrag(project);
    }
    setProjectLive(prev => ({
      ...prev,
      layers: prev.layers.map(l =>
        l.id === layer.id ? updateNestedProperty(l, path, value) : l
      ),
    }));
  };
  
  const handleCommit = () => {
    if (initialStateOnDrag) {
      commitHistory(initialStateOnDrag, project);
      setInitialStateOnDrag(null);
    }
  };
  
  const handleInteractionStart = () => {
    if (!initialStateOnDrag) {
      setInitialStateOnDrag(project);
    }
  }

  const handleCornerLinkToggle = () => {
    if (areCornersLinked) {
      const currentRadius = layer.shape.borderRadius || 0;
      handlePropertyChange('shape.borderRadius', {
        tl: currentRadius as number,
        tr: currentRadius as number,
        br: currentRadius as number,
        bl: currentRadius as number,
      });
    } else {
      const currentRadii = layer.shape.borderRadius as { tl: number };
      handlePropertyChange('shape.borderRadius', currentRadii.tl || 0);
    }
    setAreCornersLinked(!areCornersLinked);
  };
  
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { src, width, height } = await processImageFile(file);
        const imageProps = {
          src,
          fit: 'cover' as const,
          pan: { x: 50, y: 50 },
          scale: 1,
          originalWidth: width,
          originalHeight: height,
        };
        handlePropertyChange('shape.fillImage', imageProps);
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Image Upload Failed', description: 'Could not process the image.' });
      }
    }
  };

  const handleImageUrlBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const newSrc = e.target.value;
    if (!newSrc) return;
  
    const img = new window.Image();
    img.onload = () => {
      handlePropertyChange('shape.fillImage', {
        ...layer.shape.fillImage,
        src: newSrc,
        originalWidth: img.width,
        originalHeight: img.height,
      });
    };
    img.onerror = () => {
      handlePropertyChange('shape.fillImage.src', newSrc);
      console.warn("Could not load image to get dimensions for URL:", newSrc);
    };
    img.src = newSrc;
  };

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={['transform', 'fill']} className="w-full">
        <AccordionItem value="transform">
          <AccordionTrigger className="text-sm font-medium">Transform</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>X</Label><NumberInput value={Math.round(layer.transform.x)} onChange={v => handlePropertyChangeLive('transform.x', v)} onCommit={handleCommit} /></div>
                <div><Label>Y</Label><NumberInput value={Math.round(layer.transform.y)} onChange={v => handlePropertyChangeLive('transform.y', v)} onCommit={handleCommit} /></div>
                <div><Label>Width</Label><NumberInput value={Math.round(layer.transform.width)} onChange={v => handlePropertyChangeLive('transform.width', Math.max(10, v))} onCommit={handleCommit} /></div>
                <div><Label>Height</Label><NumberInput value={Math.round(layer.transform.height)} onChange={v => handlePropertyChangeLive('transform.height', Math.max(10, v))} onCommit={handleCommit} /></div>
                <div><Label>Rotation</Label><NumberInput value={Math.round(layer.transform.rotation)} onChange={v => handlePropertyChangeLive('transform.rotation', v)} onCommit={handleCommit} /></div>
              </div>
              <div className="space-y-2">
                <Label>Opacity: {Math.round(layer.transform.opacity * 100)}%</Label>
                <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                  <Slider value={[layer.transform.opacity]} onValueChange={([val]) => handlePropertyChangeLive('transform.opacity', val)} min={0} max={1} step={0.01} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Blur: {Math.round(layer.transform.blur || 0)}px</Label>
                <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                  <Slider value={[layer.transform.blur || 0]} onValueChange={([val]) => handlePropertyChangeLive('transform.blur', val)} min={0} max={100} step={1} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {isClosedShape && (
            <AccordionItem value="fill">
            <AccordionTrigger className="text-sm font-medium">Fill</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-2">
                    <Label>Color</Label>
                    <ColorEditor 
                        color={layer.shape.fill}
                        onChange={(newColor) => handlePropertyChange('shape.fill', newColor)}
                        enableTransparent={true}
                    />
                </div>
                <div className="mt-4 space-y-2">
                <Label>Image Fill</Label>
                <Input type="file" accept="image/*" onChange={handleImageFileChange} className="text-xs" />
                {layer.shape.fillImage ? (
                    <div className="space-y-4 pt-2">
                    <Textarea
                      defaultValue={layer.shape.fillImage.src}
                      onBlur={handleImageUrlBlur}
                      placeholder="Image URL"
                      className="text-xs h-20"
                    />
                    <Button onClick={() => toggleCropMode(layer.id)} variant={isCropping ? "secondary" : "outline"} className="w-full">
                        <Crop className="mr-2 h-4 w-4" />
                        {isCropping ? 'Done Adjusting' : 'Adjust Fill'}
                    </Button>
                    <Select value={layer.shape.fillImage.fit} onValueChange={(value: 'cover' | 'contain') => handlePropertyChange('shape.fillImage.fit', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="space-y-2">
                        <Label>Zoom: {Math.round((layer.shape.fillImage.scale || 1) * 100)}%</Label>
                        <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                          <Slider value={[layer.shape.fillImage.scale || 1]} onValueChange={([val]) => handlePropertyChangeLive('shape.fillImage.scale', val)} min={1} max={5} step={0.01} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Pan</Label>
                        <div className="flex items-center gap-2" onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                            <Label className="w-12 text-xs">X: {Math.round(layer.shape.fillImage.pan.x)}%</Label>
                            <Slider value={[layer.shape.fillImage.pan.x]} onValueChange={([val]) => handlePropertyChangeLive('shape.fillImage.pan.x', val)} min={0} max={100} step={1} />
                        </div>
                        <div className="flex items-center gap-2" onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                            <Label className="w-12 text-xs">Y: {Math.round(layer.shape.fillImage.pan.y)}%</Label>
                            <Slider value={[layer.shape.fillImage.pan.y]} onValueChange={([val]) => handlePropertyChangeLive('shape.fillImage.pan.y', val)} min={0} max={100} step={1} />
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handlePropertyChange('shape.fillImage', null)}>Remove Image</Button>
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground pt-2">Upload an image to use as a fill.</div>
                )}
                </div>
            </AccordionContent>
            </AccordionItem>
        )}

        <AccordionItem value="stroke">
          <AccordionTrigger className="text-sm font-medium">Outline</AccordionTrigger>
          <AccordionContent>
            {layer.shape.stroke ? (
              <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Color</Label>
                    <ColorEditor 
                        color={layer.shape.stroke.color} 
                        onChange={newColor => handlePropertyChange('shape.stroke.color', newColor)} 
                    />
                </div>
                <div>
                  <Label>Width</Label>
                  <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider value={[layer.shape.stroke.width]} onValueChange={([val]) => handlePropertyChangeLive('shape.stroke.width', val)} min={0} max={50} step={1} />
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handlePropertyChange('shape.stroke', null)}>Remove Outline</Button>
              </div>
            ) : (
              <Button onClick={() => handlePropertyChange('shape.stroke', { color: { type: 'solid', mode: 'mapped', value: 'primary' }, width: 2 })}>Add Outline</Button>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="shadow">
          <AccordionTrigger className="text-sm font-medium">Shadow</AccordionTrigger>
          <AccordionContent>
            {layer.shape.shadow ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input type="color" value={layer.shape.shadow.color} onChange={e => handlePropertyChange('shape.shadow.color', e.target.value)} className="w-10 h-10 p-1" />
                  <Input value={layer.shape.shadow.color} onChange={e => handlePropertyChange('shape.shadow.color', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Blur: {layer.shape.shadow.blur}px</Label>
                  <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider 
                      value={[layer.shape.shadow.blur]} 
                      onValueChange={([val]) => handlePropertyChangeLive('shape.shadow.blur', val)}
                      min={0} max={50} step={1}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Offset X</Label><NumberInput value={layer.shape.shadow.offsetX} onChange={v => handlePropertyChangeLive('shape.shadow.offsetX', v)} onCommit={handleCommit} /></div>
                  <div><Label>Offset Y</Label><NumberInput value={layer.shape.shadow.offsetY} onChange={v => handlePropertyChangeLive('shape.shadow.offsetY', v)} onCommit={handleCommit} /></div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handlePropertyChange('shape.shadow', null)}>Remove Shadow</Button>
              </div>
            ) : (
              <Button onClick={() => handlePropertyChange('shape.shadow', { color: '#00000080', blur: 10, offsetX: 5, offsetY: 5 })}>Add Shadow</Button>
            )}
          </AccordionContent>
        </AccordionItem>

        {layer.shape.primitive === 'rect' && (
          <AccordionItem value="corners">
            <AccordionTrigger className="text-sm font-medium">Corners</AccordionTrigger>
            <AccordionContent>
                <div className="flex items-center justify-between mb-2">
                    <Label>Border Radius</Label>
                    <Button variant="ghost" size="icon" onClick={handleCornerLinkToggle} className="h-8 w-8">
                    {areCornersLinked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                </div>
                {areCornersLinked ? (
                  <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider 
                        value={[typeof layer.shape.borderRadius === 'number' ? layer.shape.borderRadius : (layer.shape.borderRadius?.tl || 0)]} 
                        onValueChange={([val]) => handlePropertyChangeLive('shape.borderRadius', val)} 
                        min={0} max={Math.min(layer.transform.width, layer.transform.height) / 2} step={1} 
                    />
                  </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">Top Left</Label>
                            <NumberInput value={(layer.shape.borderRadius as any)?.tl || 0} onChange={v => handlePropertyChangeLive('shape.borderRadius.tl', Math.max(0,v))} onCommit={handleCommit} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Top Right</Label>
                            <NumberInput value={(layer.shape.borderRadius as any)?.tr || 0} onChange={v => handlePropertyChangeLive('shape.borderRadius.tr', Math.max(0,v))} onCommit={handleCommit} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Bottom Left</Label>
                            <NumberInput value={(layer.shape.borderRadius as any)?.bl || 0} onChange={v => handlePropertyChangeLive('shape.borderRadius.bl', Math.max(0,v))} onCommit={handleCommit} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Bottom Right</Label>
                            <NumberInput value={(layer.shape.borderRadius as any)?.br || 0} onChange={v => handlePropertyChangeLive('shape.borderRadius.br', Math.max(0,v))} onCommit={handleCommit} />
                        </div>
                    </div>
                )}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function ImageLayerProperties({ layer }: { layer: ImageLayer }) {
  const { project, setProject, setProjectLive, commitHistory, toggleCropMode, eyedropper, activateEyedropper, finishEyedropper } = useEditor();
  const isCropping = project.croppingLayerId === layer.id;
  const chromaPickerId = useId();
  const isChromaPickerActive = eyedropper?.isActive && eyedropper.id === chromaPickerId;
  const [initialStateOnDrag, setInitialStateOnDrag] = useState<ProjectState | null>(null);

  const handlePropertyChange = (path: string, value: any) => {
    setProject(prev => ({
      ...prev,
      layers: prev.layers.map(l =>
        l.id === layer.id ? updateNestedProperty(l, path, value) : l
      ),
    }));
  };

  const handlePropertyChangeLive = (path: string, value: any) => {
    if (!initialStateOnDrag) {
      setInitialStateOnDrag(project);
    }
    setProjectLive(prev => ({
      ...prev,
      layers: prev.layers.map(l =>
        l.id === layer.id ? updateNestedProperty(l, path, value) : l
      ),
    }));
  };
  
  const handleCommit = () => {
    if (initialStateOnDrag) {
      commitHistory(initialStateOnDrag, project);
      setInitialStateOnDrag(null);
    }
  };

  const handleInteractionStart = () => {
    if (!initialStateOnDrag) {
      setInitialStateOnDrag(project);
    }
  }

  const handleChromaEyedropper = () => {
    if (isChromaPickerActive) {
        finishEyedropper(null);
        return;
    }
    activateEyedropper(chromaPickerId, (newColor) => {
        if (newColor) {
            handlePropertyChange('chromaKey.color', newColor);
        }
    });
  }
  
  const chromaColorValue = isChromaPickerActive && eyedropper.previewColor
      ? eyedropper.previewColor
      : layer.chromaKey.color;

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={['source', 'transform']} className="w-full">
        <AccordionItem value="source">
          <AccordionTrigger className="text-sm font-medium">Image</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
            <Button onClick={() => toggleCropMode(layer.id)} variant={isCropping ? "secondary" : "outline"} className="w-full">
                <Crop className="mr-2 h-4 w-4" />
                {isCropping ? 'Done Cropping' : 'Crop Image'}
            </Button>
              <div>
                <Label>Source URL</Label>
                <Textarea
                  value={layer.src}
                  onChange={(e) => handlePropertyChange('src', e.target.value)}
                  className="mt-1 h-24"
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Fit</Label>
                <Select value={layer.fit} onValueChange={(value: 'cover' | 'contain') => handlePropertyChange('fit', value)}>
                    <SelectTrigger><SelectValue placeholder="Image fit" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              {layer.fit === 'cover' && (
                <div className="space-y-2">
                    <Label>Position</Label>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2" onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                            <Label className="w-12 text-xs">X: {Math.round(layer.pan.x)}%</Label>
                            <Slider value={[layer.pan.x]} onValueChange={([val]) => handlePropertyChangeLive('pan.x', val)} min={0} max={100} step={1} />
                        </div>
                        <div className="flex items-center gap-2" onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                            <Label className="w-12 text-xs">Y: {Math.round(layer.pan.y)}%</Label>
                            <Slider value={[layer.pan.y]} onValueChange={([val]) => handlePropertyChangeLive('pan.y', val)} min={0} max={100} step={1} />
                        </div>
                    </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="transform">
          <AccordionTrigger className="text-sm font-medium">Transform</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>X</Label><NumberInput value={Math.round(layer.transform.x)} onChange={v => handlePropertyChangeLive('transform.x', v)} onCommit={handleCommit}/></div>
                <div><Label>Y</Label><NumberInput value={Math.round(layer.transform.y)} onChange={v => handlePropertyChangeLive('transform.y', v)} onCommit={handleCommit}/></div>
                <div><Label>Width</Label><NumberInput value={Math.round(layer.transform.width)} onChange={v => handlePropertyChangeLive('transform.width', Math.max(10, v))} onCommit={handleCommit}/></div>
                <div><Label>Height</Label><NumberInput value={Math.round(layer.transform.height)} onChange={v => handlePropertyChangeLive('transform.height', Math.max(10, v))} onCommit={handleCommit}/></div>
                <div><Label>Rotation</Label><NumberInput value={Math.round(layer.transform.rotation)} onChange={v => handlePropertyChangeLive('transform.rotation', v)} onCommit={handleCommit}/></div>
              </div>
              <div className="space-y-2">
                  <Label>Opacity: {Math.round(layer.transform.opacity * 100)}%</Label>
                  <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider value={[layer.transform.opacity]} onValueChange={([val]) => handlePropertyChangeLive('transform.opacity', val)} min={0} max={1} step={0.01} />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label>Blur: {Math.round(layer.transform.blur || 0)}px</Label>
                  <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                    <Slider value={[layer.transform.blur || 0]} onValueChange={([val]) => handlePropertyChangeLive('transform.blur', val)} min={0} max={100} step={1} />
                  </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="shadow">
            <AccordionTrigger className="text-sm font-medium">Shadow</AccordionTrigger>
            <AccordionContent>
                {layer.shadow ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                    <Input type="color" value={layer.shadow.color} onChange={e => handlePropertyChange('shadow.color', e.target.value)} className="w-10 h-10 p-1" />
                    <Input value={layer.shadow.color} onChange={e => handlePropertyChange('shadow.color', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                    <Label>Blur: {layer.shadow.blur}px</Label>
                    <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                      <Slider 
                          value={[layer.shadow.blur]} 
                          onValueChange={([val]) => handlePropertyChangeLive('shadow.blur', val)}
                          min={0} max={50} step={1}
                      />
                    </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Offset X</Label><NumberInput value={layer.shadow.offsetX} onChange={v => handlePropertyChangeLive('shadow.offsetX', v)} onCommit={handleCommit}/></div>
                      <div><Label>Offset Y</Label><NumberInput value={layer.shadow.offsetY} onChange={v => handlePropertyChangeLive('shadow.offsetY', v)} onCommit={handleCommit}/></div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handlePropertyChange('shadow', null)}>Remove Shadow</Button>
                </div>
                ) : (
                <Button onClick={() => handlePropertyChange('shadow', { color: '#00000080', blur: 10, offsetX: 5, offsetY: 5 })}>Add Shadow</Button>
                )}
            </AccordionContent>
        </AccordionItem>
        <AccordionItem value="chroma">
          <AccordionTrigger className="text-sm font-medium">Chroma Key</AccordionTrigger>
          <AccordionContent>
              <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                      <Label htmlFor="chroma-enabled" className="cursor-pointer">Enable</Label>
                      <Switch 
                          id="chroma-enabled"
                          checked={layer.chromaKey.enabled} 
                          onCheckedChange={(val) => handlePropertyChange('chromaKey.enabled', val)}
                      />
                  </div>
                  {layer.chromaKey.enabled && (
                      <div className="space-y-4 pt-2">
                          <div>
                              <Label>Key Color</Label>
                              <div className="flex items-center gap-2">
                                  <Input 
                                      type="color" 
                                      value={chromaColorValue} 
                                      onChange={e => handlePropertyChange('chromaKey.color', e.target.value)}
                                      className="w-10 h-10 p-1"
                                  />
                                  <Input 
                                      value={chromaColorValue} 
                                      onChange={e => handlePropertyChange('chromaKey.color', e.target.value)}
                                  />
                                  <Button
                                    variant={isChromaPickerActive ? 'secondary' : 'outline'}
                                    size="icon"
                                    className="h-10 w-10"
                                    onClick={handleChromaEyedropper}
                                  >
                                    <Pipette className="h-5 w-5" />
                                  </Button>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <Label>Tolerance: {Math.round(layer.chromaKey.tolerance * 100)}%</Label>
                              <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                                <Slider 
                                    value={[layer.chromaKey.tolerance]} 
                                    onValueChange={([val]) => handlePropertyChangeLive('chromaKey.tolerance', val)}
                                    min={0} max={1} step={0.01}
                                />
                              </div>
                          </div>
                          <div className="space-y-2">
                              <Label>Feather: {Math.round(layer.chromaKey.feather * 100)}%</Label>
                              <div onMouseDown={handleInteractionStart} onMouseUp={handleCommit}>
                                <Slider 
                                    value={[layer.chromaKey.feather]} 
                                    onValueChange={([val]) => handlePropertyChangeLive('chromaKey.feather', val)}
                                    min={0} max={1} step={0.01}
                                />
                              </div>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                              <Label htmlFor="chroma-invert" className="cursor-pointer">Invert</Label>
                              <Switch
                                  id="chroma-invert"
                                  checked={layer.chromaKey.invert}
                                  onCheckedChange={(val) => handlePropertyChange('chromaKey.invert', val)}
                              />
                          </div>
                      </div>
                  )}
              </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function ProjectSettingsPanel() {
  const { project, setProject, addGuide, updateGuide, removeGuide, generateGuides, eyedropper, activateEyedropper, finishEyedropper } = useEditor();
  const [hGuides, setHGuides] = useState(4);
  const [vGuides, setVGuides] = useState(4);
  const primaryPickerId = useId();
  const secondaryPickerId = useId();
  const accentPickerId = useId();

  const handleMetaChange = (key: keyof typeof project.meta, value: string) => {
    setProject(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        [key]: value,
      }
    }));
  };

  const handleColorChange = (key: keyof typeof project.colors, value: string) => {
    setProject(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value,
      }
    }));
  };

  const handleCanvasChange = (key: keyof typeof project.canvas, value: any) => {
      setProject(prev => ({
          ...prev,
          canvas: {
              ...prev.canvas,
              [key]: value,
          }
      }));
  }

  const handleGuidesChange = (key: keyof typeof project.canvas.guides, value: any) => {
    setProject(prev => ({
        ...prev,
        canvas: {
            ...prev.canvas,
            guides: {
                ...prev.canvas.guides,
                [key]: value,
            }
        }
    }));
  }

  const handleThemeEyedropper = (pickerId: string, onPick: (color: string) => void) => {
    const isPickerActive = eyedropper?.isActive && eyedropper.id === pickerId;
    if (isPickerActive) {
      finishEyedropper(null);
      return;
    }
    activateEyedropper(pickerId, (newColor) => {
      if (newColor) {
        onPick(newColor);
      }
    });
  }

  const horizontalGuides = project.canvas.guides.items.filter(g => g.orientation === 'horizontal');
  const verticalGuides = project.canvas.guides.items.filter(g => g.orientation === 'vertical');

  const isPrimaryPickerActive = eyedropper?.isActive && eyedropper.id === primaryPickerId;
  const isSecondaryPickerActive = eyedropper?.isActive && eyedropper.id === secondaryPickerId;
  const isAccentPickerActive = eyedropper?.isActive && eyedropper.id === accentPickerId;

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={['meta', 'canvas', 'guides', 'colors']} className="w-full">
        <AccordionItem value="meta">
          <AccordionTrigger className="text-sm font-medium">Project Info</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
                <div>
                  <Label>Project Name</Label>
                  <Input value={project.meta.name} onChange={e => handleMetaChange('name', e.target.value)} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={project.meta.category} onChange={e => handleMetaChange('category', e.target.value)} />
                </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="canvas">
          <AccordionTrigger className="text-sm font-medium">Canvas</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Width</Label>
                  <NumberInput value={project.canvas.width} onChange={v => handleCanvasChange('width', Math.max(1, v))} />
                </div>
                <div>
                  <Label>Height</Label>
                  <NumberInput value={project.canvas.height} onChange={v => handleCanvasChange('height', Math.max(1, v))} />
                </div>
              </div>
              <div>
                <Label>Background</Label>
                 <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-10 w-10 p-0 border">
                                <div className={cn("w-full h-full rounded-sm", project.canvas.background === 'transparent' && 'checkerboard')} style={{ backgroundColor: project.canvas.background === 'transparent' ? undefined : project.canvas.background }} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Input
                                type="color"
                                value={project.canvas.background === 'transparent' ? '#ffffff' : project.canvas.background}
                                onChange={(e) => handleCanvasChange('background', e.target.value)}
                                className="w-24 h-24 p-1"
                            />
                        </PopoverContent>
                    </Popover>
                    <Input
                        value={project.canvas.background}
                        onChange={(e) => handleCanvasChange('background', e.target.value)}
                    />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCanvasChange('background', project.colors.primary)} className="justify-start gap-2">
                        <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: project.colors.primary }}/>
                        Primary
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCanvasChange('background', project.colors.secondary)} className="justify-start gap-2">
                        <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: project.colors.secondary }}/>
                        Secondary
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCanvasChange('background', project.colors.accent)} className="justify-start gap-2">
                        <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: project.colors.accent }}/>
                        Accent
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCanvasChange('background', 'transparent')} className="justify-start gap-2">
                        <div className="w-4 h-4 rounded-sm border checkerboard"/>
                        Transparent
                    </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="guides">
            <AccordionTrigger className="text-sm font-medium">Guides & Snapping</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <Label htmlFor="guides-enabled" className="cursor-pointer">Enable Guides</Label>
                        <Switch
                            id="guides-enabled"
                            checked={project.canvas.guides.enabled}
                            onCheckedChange={(val) => handleGuidesChange('enabled', val)}
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <Label htmlFor="guides-snap" className="cursor-pointer">Snap to Guides</Label>
                        <Switch
                            id="guides-snap"
                            checked={project.canvas.guides.snap}
                            onCheckedChange={(val) => handleGuidesChange('snap', val)}
                        />
                    </div>

                    <div className="space-y-2 pt-4">
                        <Label>Generate Grid</Label>
                        <div className="flex items-center gap-2">
                            <NumberInput value={hGuides} onChange={setHGuides} />
                            <Button size="sm" className="flex-1" onClick={() => generateGuides('horizontal', hGuides)}>Horizontal</Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <NumberInput value={vGuides} onChange={setVGuides} />
                            <Button size="sm" className="flex-1" onClick={() => generateGuides('vertical', vGuides)}>Vertical</Button>
                        </div>
                    </div>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-card px-2 text-xs text-muted-foreground">OR</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Horizontal Guides</Label>
                            <Button size="sm" onClick={() => addGuide('horizontal')}>Add</Button>
                        </div>
                        <div className="space-y-2 rounded-md border p-2 max-h-40 overflow-y-auto">
                            {horizontalGuides.map(guide => (
                                <div key={guide.id} className="flex items-center gap-2">
                                    <NumberInput value={Math.round(guide.position)} onChange={(v) => updateGuide(guide.id, v)} />
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeGuide(guide.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Vertical Guides</Label>
                            <Button size="sm" onClick={() => addGuide('vertical')}>Add</Button>
                        </div>
                        <div className="space-y-2 rounded-md border p-2 max-h-40 overflow-y-auto">
                            {verticalGuides.map(guide => (
                                <div key={guide.id} className="flex items-center gap-2">
                                    <NumberInput value={Math.round(guide.position)} onChange={(v) => updateGuide(guide.id, v)} />
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeGuide(guide.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </AccordionContent>
        </AccordionItem>
        <AccordionItem value="colors">
          <AccordionTrigger className="text-sm font-medium">Theme Colors</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div>
                <Label>Primary</Label>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-10 w-10 p-0 border">
                                <div className="w-full h-full rounded-sm" style={{ backgroundColor: project.colors.primary }} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Input
                                type="color"
                                value={project.colors.primary}
                                onChange={(e) => handleColorChange('primary', e.target.value)}
                                className="w-24 h-24 p-1"
                            />
                        </PopoverContent>
                    </Popover>
                  <Input
                    value={project.colors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                  />
                  <Button
                    variant={isPrimaryPickerActive ? 'secondary' : 'outline'}
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleThemeEyedropper(primaryPickerId, (color) => handleColorChange('primary', color))}
                  >
                    <Pipette className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Secondary</Label>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-10 w-10 p-0 border">
                                <div className="w-full h-full rounded-sm" style={{ backgroundColor: project.colors.secondary }} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Input
                                type="color"
                                value={project.colors.secondary}
                                onChange={(e) => handleColorChange('secondary', e.target.value)}
                                className="w-24 h-24 p-1"
                            />
                        </PopoverContent>
                    </Popover>
                    <Input
                        value={project.colors.secondary}
                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                    />
                     <Button
                        variant={isSecondaryPickerActive ? 'secondary' : 'outline'}
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => handleThemeEyedropper(secondaryPickerId, (color) => handleColorChange('secondary', color))}
                    >
                        <Pipette className="h-5 w-5" />
                    </Button>
                </div>
              </div>
              <div>
                <Label>Accent</Label>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-10 w-10 p-0 border">
                                <div className="w-full h-full rounded-sm" style={{ backgroundColor: project.colors.accent }} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Input
                                type="color"
                                value={project.colors.accent}
                                onChange={(e) => handleColorChange('accent', e.target.value)}
                                className="w-24 h-24 p-1"
                            />
                        </PopoverContent>
                    </Popover>
                    <Input
                        value={project.colors.accent}
                        onChange={(e) => handleColorChange('accent', e.target.value)}
                    />
                    <Button
                        variant={isAccentPickerActive ? 'secondary' : 'outline'}
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => handleThemeEyedropper(accentPickerId, (color) => handleColorChange('accent', color))}
                    >
                        <Pipette className="h-5 w-5" />
                    </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}


export default function PropertiesPanel() {
  const { project } = useEditor();
  const { selectedLayers } = project;

  if (selectedLayers.length === 0) {
    return <ProjectSettingsPanel />;
  }

  const layer = project.layers.find(l => l.id === selectedLayers[0]);
  
  const renderProperties = (l: Layer) => {
    switch (l.type) {
      case 'text':
        return <TextLayerProperties layer={l as TextLayer} />;
      case 'shape':
        return <ShapeLayerProperties layer={l as ShapeLayer} />;
      case 'image':
        return <ImageLayerProperties layer={l as ImageLayer} />;
      default:
        return (
          <p className="text-xs text-muted-foreground">Properties for {l?.type} layers will be shown here.</p>
        );
    }
  }

  return (
    <div className="space-y-4">
      <QuickActionsPanel />
      {selectedLayers.length > 1 ? (
         <div className="text-center text-muted-foreground text-sm pt-10">
            <p>{selectedLayers.length} layers selected</p>
            <p className="mt-2 text-xs">Bulk property editing is not yet supported.</p>
        </div>
      ) : (
        layer && renderProperties(layer)
      )}
    </div>
  );
}
