export interface AssetOptimizationManifest {
  sourcePath: string;
  outputPath: string;
  format: 'glb-meshopt' | 'ktx2';
  hash: string;
}

export function generateAssetId(name: string, hash: string): string {
  return `${name}.${hash.slice(0, 8)}`;
}
