import type { Model3dFormat } from "@/lib/flexGridLayout";

/** 3D-model picker: only STL and OBJ files are supported by the viewer. */
export const PROJECT_MODEL3D_ACCEPT = [".stl", ".obj", "model/stl", "model/obj"].join(",");

const MODEL3D_EXT = new Set<Model3dFormat>(["stl", "obj"]);

export function model3dFormatFromFile(file: File): Model3dFormat | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MODEL3D_EXT.has(ext as Model3dFormat) ? (ext as Model3dFormat) : null;
}

export function isModel3dFile(file: File): boolean {
  return model3dFormatFromFile(file) !== null;
}
