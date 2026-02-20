'use client';

import React from 'react';
import Image from 'next/image';
import type { ShapeLayer, Color, LinearGradient, RadialGradient } from '@/lib/types';
import { getPrimitivePathD } from '@/lib/shape-utils';
import { useEditor } from '@/context/editor-context';

function GradientDef({ grad, id }: { grad: LinearGradient | RadialGradient, id: string }) {
    if (grad.type === 'linear') {
        return (
            <linearGradient id={id} gradientTransform={`rotate(${grad.angle}, 0.5, 0.5)`}>
                {grad.stops.map(stop => (
                    <stop key={stop.id} offset={`${stop.position}%`} stopColor={stop.color} />
                ))}
            </linearGradient>
        );
    }
    if (grad.type === 'radial') {
        return (
            <radialGradient id={id} gradientUnits="objectBoundingBox" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5" spreadMethod="pad">
                 {grad.stops.map(stop => (
                    <stop key={stop.id} offset={`${stop.position}%`} stopColor={stop.color} />
                ))}
            </radialGradient>
        )
    }
    return null;
}

export function ShapeLayerRenderer({ layer, onPathMouseDown, isCropping }: { layer: ShapeLayer, onPathMouseDown: (e: React.MouseEvent) => void, isCropping?: boolean }) {
    const { project } = useEditor();
    const { shape } = layer;
    const uniqueId = layer.id;
    const clipPathId = `clip-path-${uniqueId}`;
    const shadowFilterId = `shadow-${uniqueId}`;
    const fillGradientId = `fill-gradient-${uniqueId}`;
    const strokeGradientId = `stroke-gradient-${uniqueId}`;
  
    const resolveColor = (color: Color): string => {
        if (color.type === 'solid') {
            if (color.mode === 'custom') {
                return color.value;
            }
            const themeColors = project.colors as Record<string, string>;
            return themeColors[color.value] || '#000000';
        }
        return 'none'; // Should be handled by gradient fills
    };
    
    const pathD = getPrimitivePathD(layer);
    const pathProps = { d: pathD };
  
    const handleMouseDown = shape.primitive === 'path' ? onPathMouseDown : undefined;

    const fillValue = shape.fill.type === 'solid' ? resolveColor(shape.fill) : `url(#${fillGradientId})`;
    const strokeValue = shape.stroke?.color.type === 'solid' ? resolveColor(shape.stroke.color) : `url(#${strokeGradientId})`;
  
    const fillImage = shape.fillImage;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }} className="group transition-opacity group-hover:opacity-80">
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }} >
              <defs>
                  {shape.shadow && (
                      <filter id={shadowFilterId} x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow 
                              dx={shape.shadow.offsetX} 
                              dy={shape.shadow.offsetY} 
                              stdDeviation={shape.shadow.blur / 2}
                              floodColor={shape.shadow.color}
                          />
                      </filter>
                  )}
                  {shape.isClosed !== false && (
                    <clipPath id={clipPathId}>
                        <path {...pathProps} />
                    </clipPath>
                  )}
                  {shape.fill.type !== 'solid' && <GradientDef grad={shape.fill} id={fillGradientId} />}
                  {shape.stroke && shape.stroke.color.type !== 'solid' && <GradientDef grad={shape.stroke.color} id={strokeGradientId} />}
              </defs>
              
              <path
                  {...pathProps}
                  fill={shape.isClosed === false ? 'none' : fillValue}
                  filter={shape.shadow ? `url(#${shadowFilterId})` : 'none'}
                  onMouseDown={handleMouseDown}
                  style={{ pointerEvents: 'all', cursor: shape.primitive === 'path' ? 'copy' : undefined }}
              />
              
              {shape.stroke && (
                  <path
                      {...pathProps}
                      fill="none"
                      stroke={strokeValue}
                      strokeWidth={shape.stroke.width}
                      strokeDasharray={shape.stroke.dash}
                      style={{ pointerEvents: 'none' }}
                  />
              )}
          </svg>
  
          {fillImage?.src && shape.isClosed !== false && (
              <div style={{
                  width: '100%',
                  height: '100%',
                  clipPath: `url(#${clipPathId})`,
                  pointerEvents: 'none',
                  overflow: 'hidden',
              }}>
                  <Image
                      src={fillImage.src}
                      alt={layer.name}
                      fill
                      style={{
                          objectFit: fillImage.fit,
                          objectPosition: `${fillImage.pan.x}% ${fillImage.pan.y}%`,
                          transform: `scale(${fillImage.scale || 1})`,
                      }}
                      className="pointer-events-none"
                      draggable={false}
                  />
              </div>
          )}

          {isCropping && fillImage && (
            <div 
              className="absolute inset-0 bg-black/30 pointer-events-none" 
              style={{ clipPath: `url(#${clipPathId})` }}
            />
          )}
      </div>
    );
  }

    
