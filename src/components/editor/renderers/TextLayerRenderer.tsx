'use client';

import React, { useRef, useLayoutEffect, useCallback } from 'react';
import type { TextLayer, Color, LinearGradient, RadialGradient } from '@/lib/types';
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


export function TextLayerRenderer({ layer }: { layer: TextLayer }) {
  const { project } = useEditor();
  const textRef = useRef<HTMLDivElement>(null);
  const layerId = layer.id;

  const resolveColor = (color: Color): string => {
    if (color.type === 'solid') {
      if (color.mode === 'custom') {
        return color.value;
      }
      return project.colors[color.value as keyof typeof project.colors] || '#000000';
    }
    return 'transparent';
  };

  const getGradientCss = (color: Color) => {
    if (color.type === 'linear') {
      return `linear-gradient(${color.angle}deg, ${color.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`;
    }
    if (color.type === 'radial') {
      return `radial-gradient(${color.shape}, ${color.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`;
    }
    return 'none';
  }


  const textColor = resolveColor(layer.color);
  
  // For SVG filters, we need a unique ID
  const shadowFilterId = `shadow-${layer.id}`;
  const outlineFilterId = `outline-${layer.id}`;
  const gradientId = `text-grad-${layer.id}`;

  if (layer.font.curve && layer.font.curve.amount !== 0) {
    const { width, height } = layer.transform;
    const curveAmount = layer.font.curve.amount;

    // A quadratic Bezier curve for the text path.
    const bend = -curveAmount * 0.75; // Invert and scale
    const pathD = `M 0,${height / 2} Q ${width / 2},${(height / 2) + (bend / 100 * height)} ${width},${height / 2}`;
    
    const textAnchor = layer.font.align === 'left' ? 'start' : layer.font.align === 'right' ? 'end' : 'middle';
    const startOffset = layer.font.align === 'left' ? '0%' : layer.font.align === 'right' ? '100%' : '50%';
    
    const hasShadow = !!layer.font.shadow;
    const hasOutline = !!layer.font.outline;
    
    let filter = '';
    if (hasOutline) filter += `url(#${outlineFilterId}) `;
    if (hasShadow) filter += `url(#${shadowFilterId})`;
    
    const fill = layer.color.type === 'solid' ? textColor : `url(#${gradientId})`;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <path id={`curve-path-${layer.id}`} d={pathD} fill="transparent" stroke="transparent" />
          {layer.color.type !== 'solid' && <GradientDef grad={layer.color} id={gradientId} />}
          {hasShadow && (
            <filter id={shadowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow 
                dx={layer.font.shadow!.offsetX} 
                dy={layer.font.shadow!.offsetY} 
                stdDeviation={layer.font.shadow!.blur / 2}
                floodColor={layer.font.shadow!.color}
              />
            </filter>
          )}
          {hasOutline && (
             <filter id={outlineFilterId} x="-50%" y="-50%" width="200%" height="200%">
                <feMorphology operator="dilate" radius={layer.font.outline!.width} in="SourceAlpha" result="thickened" />
                <feFlood floodColor={layer.font.outline!.color} result="colorized" />
                <feComposite in="colorized" in2="thickened" operator="in" result="outline" />
                <feMerge>
                  <feMergeNode in="outline" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
          )}
        </defs>
        <text
          style={{
            fontFamily: layer.font.family,
            fontSize: layer.font.size,
            fontWeight: layer.font.weight,
            letterSpacing: layer.font.letterSpacing,
            fontStyle: layer.font.style,
            textDecoration: layer.font.decoration,
          }}
          fill={fill}
          textAnchor={textAnchor}
          filter={filter.trim() || undefined}
        >
          <textPath href={`#curve-path-${layer.id}`} startOffset={startOffset}>
            {layer.content}
          </textPath>
        </text>
      </svg>
    );
  }

  // Fallback to div-based rendering if not curved
  const justify =
    layer.font.align === 'left'
      ? 'flex-start'
      : layer.font.align === 'right'
      ? 'flex-end'
      : 'center';

  const textShadow = layer.font.shadow
    ? `${layer.font.shadow.offsetX}px ${layer.font.shadow.offsetY}px ${layer.font.shadow.blur}px ${layer.font.shadow.color}`
    : 'none';
  const textStroke = layer.font.outline
    ? `${layer.font.outline.width}px ${layer.font.outline.color}`
    : 'none';

  const style: React.CSSProperties = {
    padding: layer.padding ? `${layer.padding}px` : undefined,
    fontSize: layer.font.size,
    fontWeight: layer.font.weight,
    fontFamily: layer.font.family,
    lineHeight: layer.font.lineHeight,
    letterSpacing: layer.font.letterSpacing,
    textAlign: layer.font.align,
    color: textColor,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: justify,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontStyle: layer.font.style,
    textDecoration: layer.font.decoration,
    textShadow,
    WebkitTextStroke: textStroke,
  };

  if (layer.color.type !== 'solid') {
    style.background = getGradientCss(layer.color);
    style.color = 'transparent';
    style.WebkitBackgroundClip = 'text';
    style.backgroundClip = 'text';
  }

  return (
    <div
      ref={textRef}
      style={style}
      contentEditable={false}
    >
      {layer.content}
    </div>
  );
}
