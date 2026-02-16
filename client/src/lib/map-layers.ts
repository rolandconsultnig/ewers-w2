/**
 * Satellite and basemap layer configurations for the Nigeria Crisis Map.
 * Includes Landsat (via Esri), NASA, and other satellite imagery systems.
 */

export interface MapLayerConfig {
  id: string;
  name: string;
  type: "streets" | "satellite" | "topo" | "hybrid";
  url: string;
  attribution: string;
  maxZoom?: number;
  minZoom?: number;
  subdomains?: string;
}

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: "osm",
    name: "OpenStreetMap",
    type: "streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abc",
  },
  {
    id: "esri-imagery",
    name: "Esri World Imagery (Satellite)",
    type: "satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
  {
    id: "esri-landsat",
    name: "Landsat / Esri Imagery (Clarity)",
    type: "satellite",
    url: "https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_WM/MapServer/tile/{z}/{y}/{x}",
    attribution: "Landsat, Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  {
    id: "esri-streets",
    name: "Esri World Street Map",
    type: "streets",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
  {
    id: "esri-topo",
    name: "Esri World Topographic",
    type: "topo",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
  {
    id: "opentopo",
    name: "OpenTopoMap",
    type: "topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
    subdomains: "abc",
  },
  {
    id: "carto-dark",
    name: "CartoDB Dark Matter",
    type: "streets",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
];

export const DEFAULT_LAYER_ID = "osm";
