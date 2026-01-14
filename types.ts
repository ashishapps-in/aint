
export type Tool = 
  | 'pencil' | 'brush' | 'eraser' | 'fill' | 'text' | 'picker' | 'zoom'
  | 'rectangle' | 'circle' | 'line' | 'triangle' | 'star' | 'heart' | 'select'
  | 'hexagon' | 'pentagon' | 'diamond' | 'polygon' | 'rounded-rect' | 'ai-gen' | 'ai-edit' | 'ai-analyze';

export type BrushType = 
  | 'normal' | 'watercolor' | 'oil' | 'crayon' | 'sketch' 
  | 'color-pencil' | 'drawing-pencil' | 'marker' | 'water-pencil';

export type BlendingMode = 
  | 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light';

export type AIProvider = 
  | 'gemini' 
  | 'openai' 
  | 'anthropic' 
  | 'grok' 
  | 'deepseek' 
  | 'leonardo' 
  | 'firefly' 
  | 'copilot';

export type ImageSize = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';

export interface BrushSettings {
  hardness: number;
  spacing: number;
  jitter: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  dataUrl: string;
  locked: boolean;
  blendMode: BlendingMode;
  opacity: number;
}

export interface ProjectData {
  version: string;
  canvasData: string;
  layers: Layer[];
  brushSettings: BrushSettings;
  brushType: BrushType;
  color: string;
  color2: string;
  brushSize: number;
  canvasWidth: number;
  canvasHeight: number;
  history: string[];
  historyIndex: number;
}

export interface CanvasRef {
  getCanvas: () => HTMLCanvasElement | null;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  loadFromDataUrl: (url: string) => void;
  rotate: (angle: number) => void;
  flip: (horizontal: boolean) => void;
  crop: () => void;
  resize: (width: number, height: number) => void;
  getCompositeDataUrl: (mimeType?: string) => string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
}

export interface Point {
  x: number;
  y: number;
}
