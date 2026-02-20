'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ImageLayer } from '@/lib/types';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function ImageLayerRenderer({ layer, isCropping }: { layer: ImageLayer, isCropping?: boolean }) {
    const [processedSrc, setProcessedSrc] = useState(layer.src);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!layer.chromaKey.enabled || !layer.src) {
            if (processedSrc !== layer.src) {
                setProcessedSrc(layer.src);
            }
            return;
        }

        const image = new window.Image();
        image.crossOrigin = 'Anonymous';
        image.src = layer.src;

        image.onload = () => {
            const canvas = canvasRef.current ?? document.createElement('canvas');
            if (!canvasRef.current) canvasRef.current = canvas;

            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            ctx.drawImage(image, 0, 0);

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const keyColorRgb = hexToRgb(layer.chromaKey.color);

                if (!keyColorRgb) return;

                const { r: keyR, g: keyG, b: keyB } = keyColorRgb;
                const tolerance = layer.chromaKey.tolerance * 255 * 1.732; // Scale tolerance to match color distance
                const feather = layer.chromaKey.feather * tolerance;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    const distance = Math.sqrt(
                        Math.pow(r - keyR, 2) +
                        Math.pow(g - keyG, 2) +
                        Math.pow(b - keyB, 2)
                    );
                    
                    let alpha = 255;
                    if (distance < tolerance) {
                        if (feather > 0 && feather < tolerance) {
                            alpha = Math.floor(Math.min(255, (distance - (tolerance - feather)) / feather * 255));
                        } else {
                            alpha = 0;
                        }
                    }
                    
                    data[i + 3] = layer.chromaKey.invert ? 255 - alpha : alpha;
                }

                ctx.putImageData(imageData, 0, 0);
                setProcessedSrc(canvas.toDataURL());
            } catch (e) {
                console.error("Chroma key failed, likely due to CORS policy. Fallback to original image.", e);
                setProcessedSrc(layer.src);
            }
        };
        
        image.onerror = () => {
            console.error("Failed to load image for chroma keying.");
            setProcessedSrc(layer.src);
        }

    }, [layer.src, layer.chromaKey]);

    const cropStyle: React.CSSProperties = {
        clipPath: `inset(${layer.crop.top}% ${layer.crop.right}% ${layer.crop.bottom}% ${layer.crop.left}%)`,
    }

    const shadowStyle: React.CSSProperties = {
        filter: layer.shadow ? `drop-shadow(${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${layer.shadow.color})` : 'none',
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', ...shadowStyle }}>
            <div style={{width: '100%', height: '100%', ...cropStyle}}>
                <img
                    src={processedSrc}
                    alt={layer.name}
                    style={{ 
                        width: '100%', 
                        height: '100%',
                        objectFit: layer.fit, 
                        objectPosition: `${layer.pan.x}% ${layer.pan.y}%` 
                    }}
                    className="pointer-events-none"
                    draggable={false}
                />
            </div>
            {isCropping && (
                <div className="absolute inset-0 bg-black/30 pointer-events-none" />
            )}
        </div>
    );
}
