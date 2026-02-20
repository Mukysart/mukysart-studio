// Base Layer
export type Transform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  blur?: number;
};

export interface BaseLayer {
  id: string;
  name: string;
  type: 'text' | 'image' | 'shape';
  groupId?: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  transform: Transform;
}

// Color Type
export type ColorStop = {
  id: string;
  color: string; // hex
  position: number; // 0-100
};

export type SolidColor = {
  type: 'solid';
  mode: 'mapped' | 'custom';
  value: string;
};

export type LinearGradient = {
  type: 'linear';
  angle: number;
  stops: ColorStop[];
};

export type RadialGradient = {
  type: 'radial';
  shape: 'circle' | 'ellipse';
  stops: ColorStop[];
};

export type Color = SolidColor | LinearGradient | RadialGradient;

// Text Layer
export interface TextLayer extends BaseLayer {
  type: 'text';
  content: string;
  padding?: number;
  font: {
    family: string;
    size: number;
    weight: number;
    lineHeight: number;
    letterSpacing: number;
    align: 'left' | 'center' | 'right';
    style: 'normal' | 'italic';
    decoration: 'none' | 'underline' | 'line-through';
    shadow: {
      color: string;
      blur: number;
      offsetX: number;
      offsetY: number;
    } | null;
    outline: {
      color: string;
      width: number;
    } | null;
    curve: {
      amount: number;
    } | null;
  };
  color: Color;
}

// Image Layer
export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  originalWidth?: number;
  originalHeight?: number;
  fit: 'cover' | 'contain';
  pan: {
    x: number; // 0-100 percentage
    y: number; // 0-100 percentage
  };
  crop: {
    top: number; // 0-100 percentage inset
    right: number; // 0-100 percentage inset
    bottom: number; // 0-100 percentage inset
    left: number; // 0-100 percentage inset
  };
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    exposure: number;
    grayscale: boolean;
  };
  chromaKey: {
    enabled: boolean;
    color: string;
    tolerance: number;
    feather: number;
    invert: boolean;
  };
  shadow: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  } | null;
}

// Shape Layer
export type PointType = 'corner' | 'curve';

export type PointHandle = {
  x: number;
  y: number;
};

export type Point = {
  id: string;
  x: number;
  y: number;
  type: PointType;
  handles: {
    in: PointHandle;
    out: PointHandle;
  };
};

export type ShapePrimitive = 'rect' | 'circle' | 'pentagon' | 'heart' | 'star' | 'line' | 'dashed-line';

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shape: {
    primitive: ShapePrimitive | 'path';
    points?: Point[];
    isClosed?: boolean;
    fill: Color;
    stroke: {
      color: Color;
      width: number;
      dash?: string;
    } | null;
    shadow: {
      color: string;
      blur: number;
      offsetX: number;
      offsetY: number;
    } | null;
    borderRadius?: number | { tl: number; tr: number; br: number; bl: number; };
    fillImage?: {
      src: string;
      originalWidth?: number;
      originalHeight?: number;
      fit: 'cover' | 'contain';
      pan: { x: number; y: number; };
      scale?: number;
    } | null;
  };
}

export type Layer = TextLayer | ImageLayer | ShapeLayer;

// Group
export type Group = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  layerIds: string[];
};

// Tool
export type Tool = 'select' | 'text' | 'image' | 'shape' | 'node';

export type Guide = {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
};

// Action for canvas interactions
export type Action = {
  type: 'move' | 'resize' | 'rotate' | 'move-node' | 'move-handle' | 'pan-image' | 'move-guide';
  startX: number;
  startY: number;
  initialLayerData?: Map<string, { transform: Transform, initialFontSize?: number, pan?: { x: number; y: number }, crop?: { top: number, right: number, bottom: number, left: number } }>;
  handle?: 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br';
  shiftKey: boolean;
  // For node editing
  layerId?: string;
  pointId?: string;
  handleType?: 'in' | 'out';
  initialPoints?: Point[];
  // For guide editing
  guideId?: string;
  initialGuidePosition?: number;
};

// Project State
export type ProjectState = {
  meta: {
    id: string;
    name: string;
    description: string;
    category: string;
    createdAt: string;
    updatedAt: string;
    thumbnail?: string;
  };
  canvas: {
    width: number;
    height: number;
    background: string;
    guides: {
      enabled: boolean;
      snap: boolean;
      items: Guide[];
    };
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  groups: Group[];
  layers: Layer[];
  selectedLayers: string[];
  activeTool: Tool;
  activeShapeType?: ShapePrimitive;
  zoom: number;
  croppingLayerId?: string | null;
  zoomAction?: 'fit' | null;
};
