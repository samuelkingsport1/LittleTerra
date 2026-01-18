/**
 * TerrainGenerator - Creates randomized landscapes with water sources, elevation, and varied terrain
 */
class TerrainGenerator {
    constructor(gridWidth, gridHeight, seed = null) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.seed = seed || Date.now();
        
        // Terrain types
        this.TERRAIN_TYPES = {
            OCEAN: 0,
            LAKE: 1,
            RIVER: 2,
            WETLAND: 3,
            PLAINS: 4,
            FOREST: 5,
            HILLS: 6,
            MOUNTAINS: 7,
            DESERT: 8
        };
    }
    
    // Simple seeded random number generator
    random() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    
    // Perlin-like noise for smooth terrain generation
    noise2D(x, y, scale = 1) {
        const X = Math.floor(x / scale);
        const Y = Math.floor(y / scale);
        const xFrac = (x / scale) - X;
        const yFrac = (y / scale) - Y;
        
        // Hash function for pseudo-random gradients
        const hash = (ix, iy) => {
            let h = (ix * 374761393 + iy * 668265263 + this.seed) % 1000000;
            return (h / 1000000) * 2 - 1;
        };
        
        const g00 = hash(X, Y);
        const g10 = hash(X + 1, Y);
        const g01 = hash(X, Y + 1);
        const g11 = hash(X + 1, Y + 1);
        
        // Smooth interpolation
        const sx = xFrac * xFrac * (3 - 2 * xFrac);
        const sy = yFrac * yFrac * (3 - 2 * yFrac);
        
        const n0 = g00 * (1 - sx) + g10 * sx;
        const n1 = g01 * (1 - sx) + g11 * sx;
        
        return n0 * (1 - sy) + n1 * sy;
    }
    
    generateTerrain(tileData) {
        const w = this.gridWidth;
        const h = this.gridHeight;
        
        // Generate elevation map
        const elevation = new Float32Array(tileData.numTiles);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = tileData.getIndex(x, y);
                
                // Multi-octave noise for realistic terrain
                let elev = 0;
                elev += this.noise2D(x, y, 8) * 0.5;      // Large features
                elev += this.noise2D(x, y, 4) * 0.25;     // Medium features
                elev += this.noise2D(x, y, 2) * 0.125;    // Small features
                elev += this.noise2D(x, y, 1) * 0.0625;   // Fine details
                
                elevation[i] = Math.max(-1, Math.min(1, elev));
            }
        }
        
        // Generate major rivers
        this.generateRivers(tileData, elevation);
        
        // Generate lakes in low-lying areas
        this.generateLakes(tileData, elevation);
        
        // Set initial conditions based on terrain
        for (let i = 0; i < tileData.numTiles; i++) {
            const coords = tileData.getCoords(i);
            const elev = elevation[i];
            const lat = tileData.latitude[i];
            
            // Base temperature on latitude and elevation
            const baseTemp = 25 - Math.abs(lat) * 0.6 - elev * 15;
            tileData.temperature[i] = baseTemp;
            
            // Water distribution
            if (elev < -0.3) {
                // Ocean/deep water
                tileData.soilWater[i] = 1.0;
                tileData.plants[i] = 0.0;
                tileData.herbivores[i] = 0.0;
                tileData.predators[i] = 0.0;
            } else if (elev < -0.1) {
                // Lake
                tileData.soilWater[i] = 1.0;
                tileData.nutrients[i] = 0.6;
                tileData.plants[i] = 0.1;
                tileData.herbivores[i] = 0.02;
                tileData.predators[i] = 0.005;
            } else if (elev < 0.1) {
                // Plains/Wetlands
                tileData.soilWater[i] = 0.6 + this.random() * 0.3;
                tileData.nutrients[i] = 0.7;
                tileData.plants[i] = 0.3 + this.random() * 0.2;
                tileData.herbivores[i] = 0.08;
                tileData.predators[i] = 0.015;
            } else if (elev < 0.4) {
                // Hills/Forest
                tileData.soilWater[i] = 0.4 + this.random() * 0.2;
                tileData.nutrients[i] = 0.6;
                tileData.plants[i] = 0.4 + this.random() * 0.3;
                tileData.herbivores[i] = 0.06;
                tileData.predators[i] = 0.02;
            } else if (elev < 0.7) {
                // Mountains
                tileData.soilWater[i] = 0.3;
                tileData.nutrients[i] = 0.3;
                tileData.plants[i] = 0.1;
                tileData.herbivores[i] = 0.02;
                tileData.predators[i] = 0.01;
            } else {
                // High mountains/Desert
                tileData.soilWater[i] = 0.1;
                tileData.nutrients[i] = 0.2;
                tileData.plants[i] = 0.02;
                tileData.herbivores[i] = 0.005;
                tileData.predators[i] = 0.002;
            }
            
            // Cloudiness based on elevation and moisture
            tileData.cloudiness[i] = Math.min(0.8, tileData.soilWater[i] * 0.5 + elev * 0.3);
        }
        
        return elevation;
    }
    
    generateRivers(tileData, elevation) {
        const w = this.gridWidth;
        const h = this.gridHeight;
        const numRivers = 3 + Math.floor(this.random() * 4);
        
        for (let r = 0; r < numRivers; r++) {
            // Start from a random high point
            let x = Math.floor(this.random() * w);
            let y = Math.floor(this.random() * h);
            let currentElev = elevation[tileData.getIndex(x, y)];
            
            // Flow downhill
            for (let step = 0; step < 100; step++) {
                const i = tileData.getIndex(x, y);
                if (i === -1) break;
                
                // Mark as river
                tileData.soilWater[i] = Math.min(1.0, tileData.soilWater[i] + 0.5);
                tileData.nutrients[i] = Math.min(1.0, tileData.nutrients[i] + 0.3);
                
                // Find lowest neighbor
                let lowestX = x;
                let lowestY = y;
                let lowestElev = currentElev;
                
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        const ni = tileData.getIndex(nx, ny);
                        if (ni === -1) continue;
                        
                        if (elevation[ni] < lowestElev) {
                            lowestX = nx;
                            lowestY = ny;
                            lowestElev = elevation[ni];
                        }
                    }
                }
                
                // If we can't go lower, stop
                if (lowestX === x && lowestY === y) break;
                
                x = lowestX;
                y = lowestY;
                currentElev = lowestElev;
                
                // Stop if we reach very low elevation (ocean/lake)
                if (currentElev < -0.2) break;
            }
        }
    }
    
    generateLakes(tileData, elevation) {
        const w = this.gridWidth;
        const h = this.gridHeight;
        const numLakes = 2 + Math.floor(this.random() * 3);
        
        for (let l = 0; l < numLakes; l++) {
            // Find a low-lying area
            let x = Math.floor(this.random() * w);
            let y = Math.floor(this.random() * h);
            const i = tileData.getIndex(x, y);
            
            if (elevation[i] > -0.1 && elevation[i] < 0.2) {
                // Create lake
                const radius = 2 + Math.floor(this.random() * 4);
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= radius) {
                            const ni = tileData.getIndex(x + dx, y + dy);
                            if (ni !== -1) {
                                const falloff = 1 - (dist / radius);
                                tileData.soilWater[ni] = Math.min(1.0, tileData.soilWater[ni] + 0.7 * falloff);
                                tileData.nutrients[ni] = Math.min(1.0, tileData.nutrients[ni] + 0.4 * falloff);
                            }
                        }
                    }
                }
            }
        }
    }
}
