import { generateUUID } from '@/lib/uuid';
import type { ShapeLayer, Point } from '@/lib/types';

export function getPrimitivePathD(layer: ShapeLayer): string {
    const { shape, transform } = layer;
    const { width, height } = transform;

    const getPointsForPolygon = (primitive: string) => {
        let pointsStr = '';
        switch(primitive) {
            case 'pentagon': pointsStr = "50,0 100,38 81,100 19,100 0,38"; break;
            case 'star': pointsStr = "50,0 61.2,35.2 98.2,35.2 68.5,57 79.7,92.2 50,70 20.3,92.2 31.5,57 1.8,35.2 38.8,35.2"; break;
            default: return "";
        }
        return pointsStr.split(' ').map(p => {
            const [x, y] = p.split(',');
            return `${(parseFloat(x) / 100) * width},${(parseFloat(y) / 100) * height}`;
        }).join(' ');
    }

    switch(shape.primitive) {
        case 'rect':
            const r = shape.borderRadius || 0;
            if (typeof r === 'number') {
                const radius = Math.min(r, width / 2, height / 2);
                if (radius <= 0) return `M 0,0 H ${width} V ${height} H 0 Z`;
                return `M ${radius},0 H ${width - radius} A ${radius},${radius} 0 0 1 ${width},${radius} V ${height - radius} A ${radius},${radius} 0 0 1 ${width - radius},${height} H ${radius} A ${radius},${radius} 0 0 1 0,${height - radius} V ${radius} A ${radius},${radius} 0 0 1 ${radius},0 Z`;
            }
            let { tl, tr, br, bl } = r;
            tl = Math.max(0, Math.min(tl, width / 2, height / 2));
            tr = Math.max(0, Math.min(tr, width / 2, height / 2));
            br = Math.max(0, Math.min(br, width / 2, height / 2));
            bl = Math.max(0, Math.min(bl, width / 2, height / 2));
            return `M ${tl},0 L ${width - tr},0 A ${tr},${tr} 0 0 1 ${width},${tr} V ${height - br} A ${br},${br} 0 0 1 ${width - br},${height} L ${bl},${height} A ${bl},${bl} 0 0 1 0,${height - bl} V ${tl} A ${tl},${tl} 0 0 1 ${tl},0 Z`;
        case 'circle':
            return `M ${width / 2}, 0 A ${width / 2},${height / 2} 0 1,1 ${width / 2}, ${height} A ${width / 2},${height / 2} 0 1,1 ${width / 2}, 0 Z`;
        case 'heart':
            const pathData = "M50 30 C30 10, 10 30, 10 50 C10 70, 50 90, 50 90 C50 90, 90 70, 90 50 C90 30, 70 10, 50 30 Z";
            const scaledPath = pathData.replace(/(\d+(\.\d+)?)/g, (val, num, i) => {
                // simple scaling, assumes path is on a 100x100 grid.
                return (parseFloat(num) * ((i % 2 === 0) ? height/100 : width/100)).toString();
            })
            return `M${(50/100)*width} ${(30/100)*height} C${(30/100)*width} ${(10/100)*height}, ${(10/100)*width} ${(30/100)*height}, ${(10/100)*width} ${(50/100)*height} C${(10/100)*width} ${(70/100)*height}, ${(50/100)*width} ${(90/100)*height}, ${(50/100)*width} ${(90/100)*height} C${(50/100)*width} ${(90/100)*height}, ${(90/100)*width} ${(70/100)*height}, ${(90/100)*width} ${(50/100)*height} C${(90/100)*width} ${(30/100)*height}, ${(70/100)*width} ${(10/100)*height}, ${(50/100)*width} ${(30/100)*height} Z`;
        case 'path':
            return pointsToPathD(shape.points?.map(p => ({
                ...p,
                x: (p.x / 100) * width,
                y: (p.y / 100) * height,
                handles: {
                    in: { x: (p.handles.in.x / 100) * width, y: (p.handles.in.y / 100) * height },
                    out: { x: (p.handles.out.x / 100) * width, y: (p.handles.out.y / 100) * height },
                }
            })), shape.isClosed);
        case 'line':
        case 'dashed-line':
            return `M 0,${height / 2} L ${width},${height / 2}`;
        case 'pentagon':
        case 'star':
            return `M ${getPointsForPolygon(shape.primitive)} Z`;
    }
    return '';
}

export function pointsToPathD(points?: Point[], isClosed: boolean = true): string {
    if (!points || points.length < 1) return '';
    
    if (points.length < 2) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    const d = points.map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        return `C ${prev.handles.out.x} ${prev.handles.out.y}, ${p.handles.in.x} ${p.handles.in.y}, ${p.x} ${p.y}`;
    }).join(' ');
    
    if (isClosed) {
        const last = points[points.length - 1];
        const first = points[0];
        return `${d} C ${last.handles.out.x} ${last.handles.out.y}, ${first.handles.in.x} ${first.handles.in.y}, ${first.x} ${first.y} Z`;
    }
    return d;
}

function rectToPath(layer: ShapeLayer): ShapeLayer {
  if (layer.shape.primitive !== 'rect' || layer.shape.points) return layer;

  const points: Point[] = [
    { id: generateUUID(), x: 0, y: 0, type: 'corner', handles: { in: { x: 0, y: 0 }, out: { x: 0, y: 0 } } },
    { id: generateUUID(), x: 100, y: 0, type: 'corner', handles: { in: { x: 100, y: 0 }, out: { x: 100, y: 0 } } },
    { id: generateUUID(), x: 100, y: 100, type: 'corner', handles: { in: { x: 100, y: 100 }, out: { x: 100, y: 100 } } },
    { id: generateUUID(), x: 0, y: 100, type: 'corner', handles: { in: { x: 0, y: 100 }, out: { x: 0, y: 100 } } },
  ];

  return { ...layer, shape: { ...layer.shape, primitive: 'path', points, isClosed: true } };
}

function circleToPath(layer: ShapeLayer): ShapeLayer {
  if (layer.shape.primitive !== 'circle' || layer.shape.points) return layer;
  const kappa = 0.552284749831;
  const handleOffset = 50 * kappa;

  const points: Point[] = [
    { id: generateUUID(), x: 50, y: 0, type: 'curve', handles: { in: { x: 50 - handleOffset, y: 0 }, out: { x: 50 + handleOffset, y: 0 } } },
    { id: generateUUID(), x: 100, y: 50, type: 'curve', handles: { in: { x: 100, y: 50 - handleOffset }, out: { x: 100, y: 50 + handleOffset } } },
    { id: generateUUID(), x: 50, y: 100, type: 'curve', handles: { in: { x: 50 + handleOffset, y: 100 }, out: { x: 50 - handleOffset, y: 100 } } },
    { id: generateUUID(), x: 0, y: 50, type: 'curve', handles: { in: { x: 0, y: 50 + handleOffset }, out: { x: 0, y: 50 - handleOffset } } },
  ];
  return { ...layer, shape: { ...layer.shape, primitive: 'path', points, isClosed: true } };
}

function pentagonToPath(layer: ShapeLayer): ShapeLayer {
  if (layer.shape.primitive !== 'pentagon' || layer.shape.points) return layer;
  const pentagonPoints = [ { x: 50, y: 0 }, { x: 100, y: 38 }, { x: 81, y: 100 }, { x: 19, y: 100 }, { x: 0, y: 38 } ];
  const points: Point[] = pentagonPoints.map(p => ({
    id: generateUUID(), x: p.x, y: p.y, type: 'corner', handles: { in: { x: p.x, y: p.y }, out: { x: p.x, y: p.y } },
  }));
  return { ...layer, shape: { ...layer.shape, primitive: 'path', points, isClosed: true } };
}

function starToPath(layer: ShapeLayer): ShapeLayer {
  if (layer.shape.primitive !== 'star' || layer.shape.points) return layer;
  const starPoints = [
    { x: 50, y: 0 }, { x: 61.2, y: 35.2 }, { x: 98.2, y: 35.2 }, { x: 68.5, y: 57 }, { x: 79.7, y: 92.2 },
    { x: 50, y: 70 }, { x: 20.3, y: 92.2 }, { x: 31.5, y: 57 }, { x: 1.8, y: 35.2 }, { x: 38.8, y: 35.2 }
  ];
  const points: Point[] = starPoints.map(p => ({
    id: generateUUID(), x: p.x, y: p.y, type: 'corner', handles: { in: { x: p.x, y: p.y }, out: { x: p.x, y: p.y } },
  }));
  return { ...layer, shape: { ...layer.shape, primitive: 'path', points, isClosed: true } };
}

function heartToPath(layer: ShapeLayer): ShapeLayer {
  if (layer.shape.primitive !== 'heart' || layer.shape.points) return layer;
  const points: Point[] = [
    { id: generateUUID(), x: 50, y: 30, type: 'curve', handles: { in: { x: 70, y: 10 }, out: { x: 30, y: 10 } } },
    { id: generateUUID(), x: 10, y: 50, type: 'curve', handles: { in: { x: 10, y: 30 }, out: { x: 10, y: 70 } } },
    { id: generateUUID(), x: 50, y: 90, type: 'corner', handles: { in: { x: 50, y: 90 }, out: { x: 50, y: 90 } } },
    { id: generateUUID(), x: 90, y: 50, type: 'curve', handles: { in: { x: 90, y: 70 }, out: { x: 90, y: 30 } } }
  ];
  return { ...layer, shape: { ...layer.shape, primitive: 'path', points, isClosed: true } };
}

function lineToPath(layer: ShapeLayer): ShapeLayer {
  if ((layer.shape.primitive !== 'line' && layer.shape.primitive !== 'dashed-line') || layer.shape.points) return layer;

  const points: Point[] = [
    { id: generateUUID(), x: 0, y: 50, type: 'corner', handles: { in: { x: 0, y: 50 }, out: { x: 0, y: 50 } } },
    { id: generateUUID(), x: 100, y: 50, type: 'corner', handles: { in: { x: 100, y: 50 }, out: { x: 100, y: 50 } } },
  ];

  return { 
      ...layer, 
      shape: { 
          ...layer.shape, 
          primitive: 'path', 
          points, 
          isClosed: false,
      } 
  };
}

export function shapeToPath(layer: ShapeLayer): ShapeLayer {
  if (layer.shape.primitive === 'path') return layer;
  switch (layer.shape.primitive) {
    case 'rect': return rectToPath(layer);
    case 'circle': return circleToPath(layer);
    case 'pentagon': return pentagonToPath(layer);
    case 'star': return starToPath(layer);
    case 'heart': return heartToPath(layer);
    case 'line': return lineToPath(layer);
    case 'dashed-line': return lineToPath(layer);
    default: return layer;
  }
}
