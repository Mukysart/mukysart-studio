import type { ProjectState, Point, ShapeLayer, Action } from '@/lib/types';
import { generateUUID } from '@/lib/uuid';

type SetProject = React.Dispatch<React.SetStateAction<ProjectState>>;
type SetSelectedNode = React.Dispatch<React.SetStateAction<{layerId: string, pointId: string} | null>>;
type SetAction = React.Dispatch<React.SetStateAction<Action | null>>;

export const toggleNodeType = (
  layerId: string,
  pointId: string,
  setProject: SetProject
) => {
  setProject(prev => {
    const newLayers = prev.layers.map(l => {
        if (l.id === layerId && l.type === 'shape' && l.shape.points) {
            const shapeLayer = l as ShapeLayer;
            const newPoints = shapeLayer.shape.points.map(p => {
                if (p.id === pointId) {
                    const newType = p.type === 'corner' ? 'curve' : 'corner';
                    let newHandles = p.handles;
                    if (newType === 'corner') {
                        newHandles = { in: { x: p.x, y: p.y }, out: { x: p.x, y: p.y } };
                    } else {
                        // When converting to curve, create some default handles if they are collapsed
                        if (p.handles.in.x === p.x && p.handles.in.y === p.y && p.handles.out.x === p.x && p.handles.out.y === p.y) {
                            newHandles = { in: { x: p.x - 15, y: p.y }, out: { x: p.x + 15, y: p.y } };
                        }
                    }
                    return { ...p, type: newType, handles: newHandles };
                }
                return p;
            });
            return { ...shapeLayer, shape: { ...shapeLayer.shape, points: newPoints }};
        }
        return l;
    });
    return { ...prev, layers: newLayers };
  });
};

export const deleteNode = (
  layerId: string,
  pointId: string,
  setProject: SetProject,
  setSelectedNode: SetSelectedNode
) => {
  setProject(prev => {
      const newLayers = prev.layers.map(l => {
          if (l.id === layerId && l.type === 'shape') {
              const shapeLayer = l as ShapeLayer;
              if (!shapeLayer.shape.points || shapeLayer.shape.points.length <= 3) return l;

              const newPoints = shapeLayer.shape.points.filter(p => p.id !== pointId);
              return { ...shapeLayer, shape: { ...shapeLayer.shape, points: newPoints }};
          }
          return l;
      });
      return { ...prev, layers: newLayers };
  });
  setSelectedNode(null);
};

export const handleNodeMouseDown = (
  e: React.MouseEvent,
  layerId: string,
  pointId: string,
  type: 'move-node' | 'move-handle',
  project: ProjectState,
  setAction: SetAction,
  setSelectedNode: SetSelectedNode,
  handleType?: 'in' | 'out'
) => {
  e.stopPropagation();
  e.preventDefault();
  const layer = project.layers.find(l => l.id === layerId) as ShapeLayer | undefined;
  if (!layer || !layer.shape.points) return;

  setSelectedNode({ layerId, pointId });

  setAction({
      type,
      startX: e.clientX,
      startY: e.clientY,
      shiftKey: e.shiftKey,
      layerId,
      pointId,
      handleType,
      initialPoints: JSON.parse(JSON.stringify(layer.shape.points)),
  });
};

export const handlePathMouseDown = (
  e: React.MouseEvent,
  layerId: string,
  project: ProjectState,
  setProject: SetProject,
  zoom: number,
  canvasArea: DOMRect | null | undefined,
  setSelectedNode: SetSelectedNode
) => {
  if (project.activeTool !== 'node') return;
  e.stopPropagation();

  const layer = project.layers.find(l => l.id === layerId) as ShapeLayer | undefined;
  if (!layer || !layer.shape.points || !canvasArea) return;

  const localX = (e.clientX - canvasArea.left) / zoom - layer.transform.x;
  const localY = (e.clientY - canvasArea.top) / zoom - layer.transform.y;

  let closestSegmentIndex = -1;
  let minDistance = Infinity;

  for (let i = 0; i < layer.shape.points.length; i++) {
      const p1 = layer.shape.points[i];
      const p2 = layer.shape.points[(i + 1) % layer.shape.points.length];

      const p1x = (p1.x / 100) * layer.transform.width;
      const p1y = (p1.y / 100) * layer.transform.height;
      const p2x = (p2.x / 100) * layer.transform.width;
      const p2y = (p2.y / 100) * layer.transform.height;

      const l2 = (p2x - p1x)**2 + (p2y - p1y)**2;
      if (l2 === 0) continue;
      let t = ((localX - p1x) * (p2x - p1x) + (localY - p1y) * (p2y - p1y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projectionX = p1x + t * (p2x - p1x);
      const projectionY = p1y + t * (p2y - p1y);
      const dist = Math.sqrt((localX - projectionX)**2 + (localY - projectionY)**2);

      if (dist < minDistance) {
          minDistance = dist;
          closestSegmentIndex = i;
      }
  }

  if (closestSegmentIndex === -1) return;

  const newPointX = (localX / layer.transform.width) * 100;
  const newPointY = (localY / layer.transform.height) * 100;

  const newPoint: Point = {
      id: generateUUID(),
      x: newPointX,
      y: newPointY,
      type: 'curve',
      handles: {
          in: { x: newPointX - 10, y: newPointY },
          out: { x: newPointX + 10, y: newPointY },
      }
  };

  setProject(prev => {
      const newLayers = prev.layers.map(l => {
          if (l.id === layerId) {
              const shapeLayer = l as ShapeLayer;
              const newPoints = [...shapeLayer.shape.points!];
              newPoints.splice(closestSegmentIndex + 1, 0, newPoint);
              return { ...l, shape: { ...l.shape, points: newPoints }};
          }
          return l;
      });
      return { ...prev, layers: newLayers };
  });
  setSelectedNode({ layerId, pointId: newPoint.id });
};
