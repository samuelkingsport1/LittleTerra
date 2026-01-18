/**
 * TileData - Manages the grid-based map system with state variables stored in typed arrays
 */
class TileData {
    constructor(gridWidth, gridHeight, tileSize = 10) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.tileSize = tileSize; // km per tile (adjustable 2-20km)
        this.numTiles = gridWidth * gridHeight;
        
        // Initialize all state variables using Float32Array for efficiency
        this.initializeStateArrays();
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
    }
    
    initializeStateArrays() {
        // Soil/Surface variables
        this.soilWater = new Float32Array(this.numTiles);      // W: Soil water level
        this.nutrients = new Float32Array(this.numTiles);      // N: Nutrients
        this.detritus = new Float32Array(this.numTiles);       // D: Detritus
        
        // Atmosphere variables (normalized: C+O+H+I=1)
        this.co2 = new Float32Array(this.numTiles);            // C: CO2 fraction
        this.o2 = new Float32Array(this.numTiles);             // O: O2 fraction
        this.waterVapor = new Float32Array(this.numTiles);     // H: Water vapor fraction
        this.inertGases = new Float32Array(this.numTiles);     // I: Inert gases (N2, etc.)
        
        // Climate variables
        this.temperature = new Float32Array(this.numTiles);    // T: Temperature (Celsius)
        this.cloudiness = new Float32Array(this.numTiles);     // Cl: Cloudiness (0-1)
        
        // Biosphere variables
        this.plants = new Float32Array(this.numTiles);         // P: Plant biomass density
        this.herbivores = new Float32Array(this.numTiles);     // B: Herbivore biomass density
        this.predators = new Float32Array(this.numTiles);      // R: Predator biomass density
        this.decomposers = new Float32Array(this.numTiles);    // M: Decomposer activity
        
        // Helper arrays for simulation
        this.latitude = new Float32Array(this.numTiles);       // Latitude for temperature calculation
        
        // Initialize with default values
        this.initializeDefaultState();
    }
    
    initializeDefaultState() {
        for (let i = 0; i < this.numTiles; i++) {
            // Soil defaults
            this.soilWater[i] = 0.5;
            this.nutrients[i] = 0.5;
            this.detritus[i] = 0.1;
            
            // Atmosphere defaults (normalized)
            this.co2[i] = 0.04;
            this.o2[i] = 0.21;
            this.waterVapor[i] = 0.01;
            this.inertGases[i] = 0.74;
            
            // Climate defaults
            const y = Math.floor(i / this.gridWidth);
            const lat = (y / this.gridHeight) * 180 - 90; // -90 to 90 degrees
            this.latitude[i] = lat;
            this.temperature[i] = 15 - Math.abs(lat) * 0.5; // Temperature varies with latitude
            this.cloudiness[i] = 0.3;
            
            // Biosphere defaults
            this.plants[i] = 0.2;
            this.herbivores[i] = 0.05;
            this.predators[i] = 0.01;
            this.decomposers[i] = 0.1;
        }
    }
    
    getIndex(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
            return -1;
        }
        return y * this.gridWidth + x;
    }
    
    getCoords(index) {
        return {
            x: index % this.gridWidth,
            y: Math.floor(index / this.gridWidth)
        };
    }
    
    normalizeAtmosphere(index) {
        // Ensure C+O+H+I = 1
        const sum = this.co2[index] + this.o2[index] + this.waterVapor[index] + this.inertGases[index];
        if (sum > 0.001) {
            this.co2[index] /= sum;
            this.o2[index] /= sum;
            this.waterVapor[index] /= sum;
            this.inertGases[index] /= sum;
        }
    }
    
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    softSaturation(value, target, strength = 0.1) {
        // Soft saturation towards target value for stability
        return value + (target - value) * strength;
    }
    
    saveState() {
        // Save current state for undo
        if (this.historyIndex < this.maxHistory - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        } else {
            this.history.shift();
            this.historyIndex--;
        }
        
        const state = {
            soilWater: new Float32Array(this.soilWater),
            nutrients: new Float32Array(this.nutrients),
            detritus: new Float32Array(this.detritus),
            co2: new Float32Array(this.co2),
            o2: new Float32Array(this.o2),
            waterVapor: new Float32Array(this.waterVapor),
            inertGases: new Float32Array(this.inertGases),
            temperature: new Float32Array(this.temperature),
            cloudiness: new Float32Array(this.cloudiness),
            plants: new Float32Array(this.plants),
            herbivores: new Float32Array(this.herbivores),
            predators: new Float32Array(this.predators),
            decomposers: new Float32Array(this.decomposers)
        };
        
        this.history.push(state);
        this.historyIndex++;
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }
    
    restoreState(state) {
        this.soilWater.set(state.soilWater);
        this.nutrients.set(state.nutrients);
        this.detritus.set(state.detritus);
        this.co2.set(state.co2);
        this.o2.set(state.o2);
        this.waterVapor.set(state.waterVapor);
        this.inertGases.set(state.inertGases);
        this.temperature.set(state.temperature);
        this.cloudiness.set(state.cloudiness);
        this.plants.set(state.plants);
        this.herbivores.set(state.herbivores);
        this.predators.set(state.predators);
        this.decomposers.set(state.decomposers);
    }
    
    reset() {
        this.initializeDefaultState();
        this.history = [];
        this.historyIndex = -1;
    }
}
