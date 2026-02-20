'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PropertiesPanel from './properties-panel';
import LayersPanel from './layers-panel';

export default function RightSidebar() {
  return (
    <aside className="w-80 border-l bg-card flex flex-col">
      <Tabs defaultValue="properties" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="layers">Layers</TabsTrigger>
        </TabsList>
        <TabsContent value="properties" className="flex-1 overflow-y-auto p-4">
          <PropertiesPanel />
        </TabsContent>
        <TabsContent value="layers" className="flex-1 overflow-hidden">
          <LayersPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
