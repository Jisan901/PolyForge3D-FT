export interface AtlasConfig {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}

export interface AtlasItem {
  id: string;
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
  image: HTMLImageElement;
  src: string;
  erasedCells?: {col: number, row: number}[];
}
