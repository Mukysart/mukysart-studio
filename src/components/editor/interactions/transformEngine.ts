'use client';

import type { Action, ProjectState, Layer, TextLayer, ImageLayer } from '@/lib/types';

export function applyTransform(
  project: ProjectState,
  action: Action,
  dx: number,
  dy: number,
  lastMousePosition: { x: number; y: number }
): { layers: Layer[], snapLines?: { horizontal: number[], vertical: number[] } } {
  const { guides } = project.canvas;
  const shouldSnap = guides.enabled && guides.snap;
  const snapLines = { horizontal: [] as number[], vertical: [] as number[] };

  const newLayers = project.layers.map(layer => {
    const initialData = action.initialLayerData?.get(layer.id);
    if (!initialData) return layer;
    const initialTransform = initialData.transform;

    const dxScaled = dx / project.zoom;
    const dyScaled = dy / project.zoom;

    if (action.type === 'move') {
      let newX = initialTransform.x + dxScaled;
      let newY = initialTransform.y + dyScaled;

      if (shouldSnap) {
        const snapThreshold = 10 / project.zoom;
        
        const vTargets = new Set<number>();
        const hTargets = new Set<number>();

        project.canvas.guides.items.forEach(g => {
            if (g.orientation === 'vertical') vTargets.add(g.position);
            else hTargets.add(g.position);
        });
        
        vTargets.add(0);
        vTargets.add(project.canvas.width / 2);
        vTargets.add(project.canvas.width);
        hTargets.add(0);
        hTargets.add(project.canvas.height / 2);
        hTargets.add(project.canvas.height);

        project.layers.forEach(otherLayer => {
            if (action.initialLayerData?.has(otherLayer.id)) return;
            const { x, y, width, height } = otherLayer.transform;
            vTargets.add(x);
            vTargets.add(x + width / 2);
            vTargets.add(x + width);
            hTargets.add(y);
            hTargets.add(y + height / 2);
            hTargets.add(y + height);
        });

        const { width, height } = initialTransform;
        const layerVPointOffsets = [0, width / 2, width];
        const layerHPointOffsets = [0, height / 2, height];

        let snapDx = 0;
        let snapDy = 0;
        let minDx = snapThreshold;
        let minDy = snapThreshold;
        let bestVTarget: number | null = null;
        let bestHTarget: number | null = null;


        layerVPointOffsets.forEach(offset => {
            const pointX = newX + offset;
            vTargets.forEach(target => {
                const diff = pointX - target;
                if (Math.abs(diff) < minDx) {
                    minDx = Math.abs(diff);
                    snapDx = -diff;
                    bestVTarget = target;
                }
            });
        });

        layerHPointOffsets.forEach(offset => {
            const pointY = newY + offset;
            hTargets.forEach(target => {
                const diff = pointY - target;
                if (Math.abs(diff) < minDy) {
                    minDy = Math.abs(diff);
                    snapDy = -diff;
                    bestHTarget = target;
                }
            });
        });
        
        if (bestVTarget !== null) {
            newX += snapDx;
            snapLines.vertical.push(bestVTarget);
        }

        if (bestHTarget !== null) {
            newY += snapDy;
            snapLines.horizontal.push(bestHTarget);
        }
      }

      return {
        ...layer,
        transform: {
          ...initialTransform,
          x: newX,
          y: newY,
        },
      };
    }

    if (action.type === 'resize' && action.handle) {
      const isCroppingImage = layer.type === 'image' && project.croppingLayerId === layer.id;

      if (isCroppingImage) {
        const imageLayer = layer as ImageLayer;
        const initialCrop = initialData.crop!;

        const rad = initialTransform.rotation * (Math.PI / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const localDx = dxScaled * cos + dyScaled * sin;
        const localDy = -dxScaled * sin + dyScaled * cos;
        
        let dTop = 0, dRight = 0, dBottom = 0, dLeft = 0;

        if (action.handle.includes('t')) {
            dTop = (localDy / initialTransform.height) * 100;
        }
        if (action.handle.includes('b')) {
            dBottom = (-localDy / initialTransform.height) * 100;
        }
        if (action.handle.includes('l')) {
            dLeft = (localDx / initialTransform.width) * 100;
        }
        if (action.handle.includes('r')) {
            dRight = (-localDx / initialTransform.width) * 100;
        }

        let newCrop = {
            top: initialCrop.top + dTop,
            right: initialCrop.right + dRight,
            bottom: initialCrop.bottom + dBottom,
            left: initialCrop.left + dLeft
        };
        
        newCrop.top = Math.max(0, newCrop.top);
        newCrop.right = Math.max(0, newCrop.right);
        newCrop.bottom = Math.max(0, newCrop.bottom);
        newCrop.left = Math.max(0, newCrop.left);

        if (newCrop.left + newCrop.right >= 100) {
            if (action.handle.includes('l')) newCrop.left = 100 - newCrop.right;
            else newCrop.right = 100 - newCrop.left;
        }
        if (newCrop.top + newCrop.bottom >= 100) {
            if (action.handle.includes('t')) newCrop.top = 100 - newCrop.bottom;
            else newCrop.bottom = 100 - newCrop.top;
        }
        
        return { ...imageLayer, crop: newCrop };
      }

      const { x, y, width, height, rotation } = initialTransform;
      const rad = rotation * (Math.PI / 180);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const localDx = dxScaled * cos + dyScaled * sin;
      const localDy = -dxScaled * sin + dyScaled * cos;

      let newWidth = width;
      let newHeight = height;
      
      let finalLocalDx = localDx;
      let finalLocalDy = localDy;

      if (shouldSnap) {
        const snapThreshold = 10 / project.zoom;

        const vTargets = new Set<number>();
        const hTargets = new Set<number>();

        project.canvas.guides.items.forEach(g => {
            if (g.orientation === 'vertical') vTargets.add(g.position);
            else hTargets.add(g.position);
        });
        
        vTargets.add(0);
        vTargets.add(project.canvas.width / 2);
        vTargets.add(project.canvas.width);
        hTargets.add(0);
        hTargets.add(project.canvas.height / 2);
        hTargets.add(project.canvas.height);

        project.layers.forEach(otherLayer => {
            if (action.initialLayerData?.has(otherLayer.id)) return;
            const { x: ox, y: oy, width: ow, height: oh } = otherLayer.transform;
            vTargets.add(ox);
            vTargets.add(ox + ow / 2);
            vTargets.add(ox + ow);
            hTargets.add(oy);
            hTargets.add(oy + oh / 2);
            hTargets.add(oy + oh);
        });

        let proposedWidth = width;
        let proposedHeight = height;
        if (action.handle.includes('l')) proposedWidth -= localDx; else if (action.handle.includes('r')) proposedWidth += localDx;
        if (action.handle.includes('t')) proposedHeight -= localDy; else if (action.handle.includes('b')) proposedHeight += localDy;

        const dw = proposedWidth - width;
        const dh = proposedHeight - height;

        let dx_center_local = 0, dy_center_local = 0;
        if (action.handle.includes('r')) dx_center_local = dw / 2; else if (action.handle.includes('l')) dx_center_local = -dw / 2;
        if (action.handle.includes('b')) dy_center_local = dh / 2; else if (action.handle.includes('t')) dy_center_local = -dh / 2;
        
        const initialCenterX = x + width / 2;
        const initialCenterY = y + height / 2;
        const dx_center_world = dx_center_local * cos - dy_center_local * sin;
        const dy_center_world = dx_center_local * sin + dy_center_local * cos;
        const proposedCenterX = initialCenterX + dx_center_world;
        const proposedCenterY = initialCenterY + dy_center_world;
        
        const halfW = proposedWidth / 2;
        const halfH = proposedHeight / 2;
        const corners_local = [{x: -halfW, y: -halfH}, {x: halfW, y: -halfH}, {x: halfW, y: halfH}, {x: -halfW, y: halfH}];
        const corners_world = corners_local.map(p => ({ x: proposedCenterX + p.x * cos - p.y * sin, y: proposedCenterY + p.x * sin + p.y * cos }));
        
        const allPoints = [
          ...corners_world,
          { x: (corners_world[0].x + corners_world[1].x) / 2, y: (corners_world[0].y + corners_world[1].y) / 2 },
          { x: (corners_world[1].x + corners_world[2].x) / 2, y: (corners_world[1].y + corners_world[2].y) / 2 },
          { x: (corners_world[2].x + corners_world[3].x) / 2, y: (corners_world[2].y + corners_world[3].y) / 2 },
          { x: (corners_world[3].x + corners_world[0].x) / 2, y: (corners_world[3].y + corners_world[0].y) / 2 },
          { x: proposedCenterX, y: proposedCenterY }
        ];

        const handlePointsMap: { [key: string]: number[] } = {
          'tl': [0, 4, 7, 8], 'tm': [4, 8], 'tr': [1, 4, 5, 8],
          'ml': [7, 8], 'mr': [5, 8],
          'bl': [3, 6, 7, 8], 'bm': [6, 8], 'br': [2, 5, 6, 8]
        };
        const pointsToCheck = handlePointsMap[action.handle].map(i => allPoints[i]);

        let snapDx = 0, snapDy = 0;
        let minDx = snapThreshold, minDy = snapThreshold;
        
        pointsToCheck.forEach(p => {
          vTargets.forEach(target => {
            const diff = p.x - target;
            if (Math.abs(diff) < minDx) {
              minDx = Math.abs(diff);
              snapDx = -diff;
            }
          });
          hTargets.forEach(target => {
            const diff = p.y - target;
            if (Math.abs(diff) < minDy) {
              minDy = Math.abs(diff);
              snapDy = -diff;
            }
          });
        });

        if (snapDx !== 0 || snapDy !== 0) {
          const snap_dx_local = snapDx * cos + snapDy * sin;
          const snap_dy_local = -snapDx * sin + snapDy * cos;

          finalLocalDx = localDx + snap_dx_local;
          finalLocalDy = localDy + snap_dy_local;

          pointsToCheck.forEach(p => {
              vTargets.forEach(target => {
                  if (Math.abs((p.x + snapDx) - target) < 0.1 && !snapLines.vertical.includes(target)) {
                      snapLines.vertical.push(target);
                  }
              });
              hTargets.forEach(target => {
                  if (Math.abs((p.y + snapDy) - target) < 0.1 && !snapLines.horizontal.includes(target)) {
                      snapLines.horizontal.push(target);
                  }
              });
          });
        }
      }

      const isCornerHandle = !action.handle.includes('m');
      const aspectRatio = initialTransform.width / initialTransform.height;

      let widthChange = 0;
      if (action.handle.includes('l')) widthChange = -finalLocalDx;
      else if (action.handle.includes('r')) widthChange = finalLocalDx;

      let heightChange = 0;
      if (action.handle.includes('t')) heightChange = -finalLocalDy;
      else if (action.handle.includes('b')) heightChange = finalLocalDy;

      if (isCornerHandle) {
        if (Math.abs(widthChange) > Math.abs(heightChange)) {
            newWidth = width + widthChange;
            newHeight = newWidth / aspectRatio;
        } else {
            newHeight = height + heightChange;
            newWidth = newHeight * aspectRatio;
        }
      } else {
        newWidth = width + widthChange;
        newHeight = height + heightChange;
      }

      if (newWidth < 10) {
        newWidth = 10;
        if (isCornerHandle) newHeight = newWidth / aspectRatio;
      }
      if (newHeight < 10) {
        newHeight = 10;
        if (isCornerHandle) newWidth = newHeight * aspectRatio;
      }
      
      const dw = newWidth - width;
      const dh = newHeight - height;

      let dx_center_local = 0;
      let dy_center_local = 0;

      if (action.handle.includes('r')) {
        dx_center_local = dw / 2;
      } else if (action.handle.includes('l')) {
        dx_center_local = -dw / 2;
      }
      
      if (action.handle.includes('b')) {
        dy_center_local = dh / 2;
      } else if (action.handle.includes('t')) {
        dy_center_local = -dh / 2;
      }
      
      const initialCenterX = x + width / 2;
      const initialCenterY = y + height / 2;

      const dx_center_world = dx_center_local * cos - dy_center_local * sin;
      const dy_center_world = dx_center_local * sin + dy_center_local * cos;

      const newCenterX = initialCenterX + dx_center_world;
      const newCenterY = initialCenterY + dy_center_world;

      const newX = newCenterX - newWidth / 2;
      const newY = newCenterY - newHeight / 2;
      
      if (layer.type === 'text' && isCornerHandle) {
        const textLayer = layer as TextLayer;
        const initialFontSize = initialData.initialFontSize;
        if (initialFontSize) {
          const widthRatio = newWidth / initialTransform.width;
          const heightRatio = newHeight / initialTransform.height;
          const sizeChange = (widthRatio + heightRatio) / 2;
          let newFontSize = initialFontSize * sizeChange;
          if (newFontSize < 4) newFontSize = 4;
          return {
            ...layer,
            transform: { ...initialTransform, x: newX, y: newY, width: newWidth, height: newHeight },
            font: { ...textLayer.font, size: newFontSize },
          };
        }
      }

      return { ...layer, transform: { ...initialTransform, x: newX, y: newY, width: newWidth, height: newHeight } };
    }

    if (action.type === 'rotate') {
      const bbox = document.getElementById('selection-box')?.getBoundingClientRect();
      if (!bbox) return layer;

      const centerX = bbox.left + bbox.width / 2;
      const centerY = bbox.top + bbox.height / 2;

      const startAngle = Math.atan2(action.startY - centerY, action.startX - centerX);
      const currentAngle = Math.atan2(lastMousePosition.y - centerY, lastMousePosition.x - centerX);

      const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
      let newRotation = initialTransform.rotation + angleDiff;

      if (action.shiftKey) newRotation = Math.round(newRotation / 15) * 15;

      return { ...layer, transform: { ...initialTransform, rotation: newRotation } };
    }

    return layer;
  });

  return { layers: newLayers, snapLines };
}
