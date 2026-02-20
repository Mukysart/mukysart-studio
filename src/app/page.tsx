import { EditorProvider } from '@/context/editor-context';
import Header from '@/components/editor/header';
import Toolbar from '@/components/editor/toolbar';
import Canvas from '@/components/editor/canvas';
import RightSidebar from '@/components/editor/right-sidebar';

export default function Page() {
  return (
    <EditorProvider>
      <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Toolbar />
          <main className="flex-1 flex items-center justify-center overflow-auto bg-muted relative">
            <Canvas />
          </main>
          <RightSidebar />
        </div>
      </div>
    </EditorProvider>
  );
}
