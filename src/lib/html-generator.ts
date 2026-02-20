import type { ProjectState, Layer, TextLayer, ShapeLayer, ImageLayer, Color, LinearGradient, RadialGradient } from './types';
import { getPrimitivePathD } from './shape-utils';
import { getGoogleFontUrl, localFonts } from './fonts';

function resolveColor(color: Color, colors: ProjectState['colors']): string {
    if (color.type === 'solid') {
        if (color.mode === 'custom') {
            return color.value;
        }
        return colors[color.value as keyof typeof colors] || '#000000';
    }
    return 'transparent';
};

function getGradientCss(color: Color): string {
    if (color.type === 'linear') {
      return `linear-gradient(${color.angle}deg, ${color.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`;
    }
    if (color.type === 'radial') {
      return `radial-gradient(${color.shape}, ${color.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`;
    }
    return 'none';
}

function layerToHtml(layer: Layer, project: ProjectState): string {
    const s = (css: React.CSSProperties) => Object.entries(css).map(([k, v]) => v === undefined || v === null ? '' : `${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}:${v};`).join('');

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${layer.transform.x}px`,
        top: `${layer.transform.y}px`,
        width: `${layer.transform.width}px`,
        height: `${layer.transform.height}px`,
        transform: `rotate(${layer.transform.rotation}deg)`,
        opacity: layer.transform.opacity,
        visibility: layer.visible ? 'visible' : 'hidden',
        zIndex: layer.zIndex,
        filter: layer.transform.blur ? `blur(${layer.transform.blur}px)` : undefined,
    };
    
    const nameAttr = `data-name="${layer.name.replace(/"/g, '&quot;')}"`;
    const sanitizedNameClass = `layer-name--${layer.name.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '')}`;


    if (layer.type === 'text') {
        const textLayer = layer as TextLayer;
        const font = textLayer.font;
        const style: React.CSSProperties = { ...baseStyle };
        
        const justify = font.align === 'left' ? 'flex-start' : font.align === 'right' ? 'flex-end' : 'center';

        style.display = 'flex';
        style.alignItems = 'center';
        style.justifyContent = justify;
        style.padding = textLayer.padding ? `${textLayer.padding}px` : undefined;
        style.fontSize = `${font.size}px`;
        style.fontWeight = font.weight;
        style.fontFamily = `'${font.family}', sans-serif`;
        style.lineHeight = font.lineHeight;
        style.letterSpacing = `${font.letterSpacing}px`;
        style.textAlign = font.align;
        style.fontStyle = font.style;
        style.textDecoration = font.decoration;
        style.textShadow = font.shadow ? `${font.shadow.offsetX}px ${font.shadow.offsetY}px ${font.shadow.blur}px ${font.shadow.color}` : 'none';
        
        let customClasses = '';
        let layerSpecificStyles = '';

        if (font.outline) {
            style.WebkitTextStroke = `${font.outline.width}px ${font.outline.color}`;
        }

        if (textLayer.color.type !== 'solid') {
            customClasses += ' gradient-text';
            layerSpecificStyles += `.layer-${layer.id} { background: ${getGradientCss(textLayer.color)}; }`;
            style.color = 'transparent';
        } else {
            style.color = resolveColor(textLayer.color, project.colors);
        }

        const content = textLayer.content.replace(/\n/g, '<br />');

        // Curved text is complex and best handled by SVG, which is not what the user asked for text layers.
        // This export will render curved text as straight text.
        return `<div ${nameAttr} class="layer layer-text ${sanitizedNameClass} layer-${layer.id} ${customClasses}" style="${s(style)}">${content}</div><style>${layerSpecificStyles}</style>`;
    }

    if (layer.type === 'image') {
        const imageLayer = layer as ImageLayer;
        const wrapperStyle: React.CSSProperties = {
            ...baseStyle,
            overflow: 'hidden',
            filter: imageLayer.shadow ? `drop-shadow(${imageLayer.shadow.offsetX}px ${imageLayer.shadow.offsetY}px ${imageLayer.shadow.blur}px ${imageLayer.shadow.color})` : 'none',
        };
        const imageStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            objectFit: imageLayer.fit,
            objectPosition: `${imageLayer.pan.x}% ${imageLayer.pan.y}%`,
            clipPath: `inset(${imageLayer.crop.top}% ${imageLayer.crop.right}% ${imageLayer.crop.bottom}% ${imageLayer.crop.left}%)`,
        };
        // Chroma key is a canvas-based effect and cannot be replicated in a static HTML/CSS export.
        return `<div ${nameAttr} class="layer layer-image ${sanitizedNameClass}" style="${s(wrapperStyle)}"><img src="${imageLayer.src}" style="${s(imageStyle)}" alt="${layer.name.replace(/"/g, '&quot;')}"/></div>`;
    }

    if (layer.type === 'shape') {
        const shapeLayer = layer as ShapeLayer;
        const shape = shapeLayer.shape;
        const pathD = getPrimitivePathD(shapeLayer);
        
        const fill = shape.isClosed === false ? 'none' : (shape.fill.type === 'solid' ? resolveColor(shape.fill, project.colors) : `url(#fill-${layer.id})`);
        const stroke = shape.stroke ? (shape.stroke.color.type === 'solid' ? resolveColor(shape.stroke.color, project.colors) : `url(#stroke-${layer.id})`) : 'none';
        
        let defs = '';
        if (shape.fill.type !== 'solid' && shape.isClosed !== false) {
            const grad = shape.fill as LinearGradient | RadialGradient;
            if (grad.type === 'linear') {
                defs += `<linearGradient id="fill-${layer.id}" gradientTransform="rotate(${grad.angle}, 0.5, 0.5)">${grad.stops.map(stop => `<stop offset="${stop.position}%" stop-color="${stop.color}" />`).join('')}</linearGradient>`;
            } else {
                 defs += `<radialGradient id="fill-${layer.id}" gradientUnits="objectBoundingBox" cx="0.5" cy="0.5" r="0.5">${grad.stops.map(stop => `<stop offset="${stop.position}%" stop-color="${stop.color}" />`).join('')}</radialGradient>`;
            }
        }
        if (shape.stroke && shape.stroke.color.type !== 'solid') {
             const grad = shape.stroke.color as LinearGradient | RadialGradient;
             if (grad.type === 'linear') {
                defs += `<linearGradient id="stroke-${layer.id}" gradientTransform="rotate(${grad.angle}, 0.5, 0.5)">${grad.stops.map(stop => `<stop offset="${stop.position}%" stop-color="${stop.color}" />`).join('')}</linearGradient>`;
            } else {
                 defs += `<radialGradient id="stroke-${layer.id}" gradientUnits="objectBoundingBox" cx="0.5" cy="0.5" r="0.5">${grad.stops.map(stop => `<stop offset="${stop.position}%" stop-color="${stop.color}" />`).join('')}</radialGradient>`;
            }
        }
        if (shape.shadow) {
            defs += `<filter id="shadow-${layer.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${shape.shadow.offsetX}" dy="${shape.shadow.offsetY}" stdDeviation="${shape.shadow.blur / 2}" flood-color="${shape.shadow.color}"/></filter>`;
        }
        
        let fillImageHtml = '';
        if (shape.fillImage?.src && shape.isClosed !== false) {
             defs += `<clipPath id="clip-${layer.id}"><path d="${pathD}" /></clipPath>`;
             // Note: pan and scale for image fills inside SVG are complex and not fully supported in this export.
             fillImageHtml = `<g clip-path="url(#clip-${layer.id})"><image href="${shape.fillImage.src}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="${shape.fillImage.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}" /></g>`;
        }

        const svg = `
            <svg width="100%" height="100%" viewBox="0 0 ${shapeLayer.transform.width} ${shapeLayer.transform.height}" style="overflow:visible;">
                <defs>${defs}</defs>
                <path d="${pathD}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.stroke?.width || 0}" stroke-dasharray="${shape.stroke?.dash || 'none'}" style="${shape.shadow ? `filter:url(#shadow-${layer.id});` : ''}" />
                ${fillImageHtml}
            </svg>
        `;
        
        return `<div ${nameAttr} class="layer layer-shape ${sanitizedNameClass}" style="${s(baseStyle)}">${svg}</div>`;
    }

    return '';
}

export function projectToHtml(project: ProjectState): string {
    const { canvas, meta, colors, layers, groups } = project;
    const s = (css: React.CSSProperties) => Object.entries(css).map(([k, v]) => v === undefined || v === null ? '' : `${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}:${v};`).join('');

    const bodyStyle = {
        width: `${canvas.width}px`,
        height: `${canvas.height}px`, 
        background: canvas.background === 'transparent' ? 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACdJREFUOE9jZGBgEGHAD97/16Fft/6vUX/d+j8qO3BqLMSAFwDE+wA53Qx/XQAAAABJRU5ErkJggg==) repeat' : canvas.background, 
        position: 'relative' as 'relative', 
        margin: '0 auto', 
        overflow: 'hidden'
    };

    const sortedLayers = layers.sort((a, b) => a.zIndex - b.zIndex);
    const renderedGroupIds = new Set<string>();
    const htmlParts: string[] = [];

    for (const layer of sortedLayers) {
        if (layer.groupId) {
            if (renderedGroupIds.has(layer.groupId)) {
                continue;
            }

            const group = groups.find(g => g.id === layer.groupId);
            if (group) {
                const groupName = group.name;
                const layersInGroup = sortedLayers.filter(l => l.groupId === group.id);
                const layerHtmls = layersInGroup.map(l => layerToHtml(l, project)).join('\n');
                
                const sanitizedGroupName = groupName.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
                const groupNameAttr = `data-group-name="${groupName.replace(/"/g, '&quot;')}"`;
                
                htmlParts.push(`<div ${groupNameAttr} class="group-container group-name--${sanitizedGroupName}">\n${layerHtmls}\n</div>`);
                renderedGroupIds.add(group.id);
            } else {
                // Layer has a groupId that doesn't exist, treat as root layer
                htmlParts.push(layerToHtml(layer, project));
            }
        } else {
            // It's a root layer
            htmlParts.push(layerToHtml(layer, project));
        }
    }
    
    const layersHtml = htmlParts.join('\n');

    const fontFaceStyles = localFonts.map(font => 
        font.variants.map(variant => `
          @font-face {
            font-family: '${font.family}';
            src: url('${variant.url}') format('woff2');
            font-weight: ${variant.weight};
            font-style: ${variant.style};
            font-display: swap;
          }
        `).join('')
      ).join('').replace(/\n\s*/g, '');
    
    return `
        <!DOCTYPE html>
        <html 
            lang="en"
            data-flyer-name="${meta.name}" 
            data-flyer-category="${meta.category}" 
            data-flyer-width="${canvas.width}"
            data-flyer-height="${canvas.height}"
            data-primary-color="${colors.primary}"
            data-secondary-color="${colors.secondary}"
            data-accent-color="${colors.accent}"
        >
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${meta.name}</title>
            <style>
                body {
                    margin: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background-color: #f0f0f0;
                }
                .flyer-container {
                    box-shadow: 0 0 20px rgba(0,0,0,0.15);
                }
                .gradient-text {
                  -webkit-background-clip: text;
                  background-clip: text;
                }
                ${fontFaceStyles}
            </style>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="${getGoogleFontUrl()}" rel="stylesheet" />
        </head>
        <body>
            <div class="flyer-container" style="${s(bodyStyle)}">
                ${layersHtml}
            </div>
        </body>
        </html>
    `;
}
