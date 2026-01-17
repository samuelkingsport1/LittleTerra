/**
 * ToolManager - Handles player tools for modifying the simulation
 */
class ToolManager {
    constructor(tileData) {
        this.tileData = tileData;
        this.currentTool = null;
        this.toolRadius = 2; // Tiles
        this.toolStrength = 0.1;
        
        // Tool definitions
        this.tools = {
            'add-plants': {
                name: 'Add Plants',
                apply: (index) => this.addBiomass(index, 'plants'),
                color: '#00ff00'
            },
            'add-herbivores': {
                name: 'Add Herbivores',
                apply: (index) => this.addBiomass(index, 'herbivores'),
                color: '#ffaa00'
            },
            'add-predators': {
                name: 'Add Predators',
                apply: (index) => this.addBiomass(index, 'predators'),
                color: '#ff0000'
            },
            'remove-biomass': {
                name: 'Remove Biomass',
                apply: (index) => this.removeBiomass(index),
                color: '#ff00ff'
            },
            'rain': {
                name: 'Add Rain',
                apply: (index) => this.addRain(index),
                color: '#00aaff'
            },
            'fertilize': {
                name: 'Add Nutrients',
                apply: (index) => this.addNutrients(index),
                color: '#aa00ff'
            }
        };
    }
    
    setTool(toolName) {
        if (this.tools[toolName]) {
            this.currentTool = toolName;
            return true;
        }
        return false;
    }
    
    getCurrentTool() {
        return this.tools[this.currentTool];
    }
    
    applyTool(x, y) {
        if (!this.currentTool) return;
        
        const data = this.tileData;
        const centerIndex = data.getIndex(x, y);
        if (centerIndex < 0) return;
        
        // Save state for undo before applying tool
        data.saveState();
        
        // Apply tool in radius
        for (let dy = -this.toolRadius; dy <= this.toolRadius; dy++) {
            for (let dx = -this.toolRadius; dx <= this.toolRadius; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= this.toolRadius) {
                    const index = data.getIndex(x + dx, y + dy);
                    if (index >= 0) {
                        // Apply with falloff based on distance
                        const falloff = 1 - (dist / this.toolRadius);
                        this.tools[this.currentTool].apply(index, falloff);
                    }
                }
            }
        }
        
        return true;
    }
    
    addBiomass(index, type) {
        const data = this.tileData;
        const amount = this.toolStrength;
        
        switch (type) {
            case 'plants':
                data.plants[index] = Math.min(1.0, data.plants[index] + amount);
                // Plants consume CO2 and produce O2
                data.co2[index] -= amount * 0.001;
                data.o2[index] += amount * 0.001;
                break;
            case 'herbivores':
                data.herbivores[index] = Math.min(1.0, data.herbivores[index] + amount * 0.5);
                break;
            case 'predators':
                data.predators[index] = Math.min(1.0, data.predators[index] + amount * 0.5);
                break;
        }
        
        data.normalizeAtmosphere(index);
    }
    
    removeBiomass(index) {
        const data = this.tileData;
        const amount = this.toolStrength;
        
        data.plants[index] = Math.max(0, data.plants[index] - amount);
        data.herbivores[index] = Math.max(0, data.herbivores[index] - amount * 0.5);
        data.predators[index] = Math.max(0, data.predators[index] - amount * 0.5);
        
        // Dead biomass becomes detritus
        data.detritus[index] += amount * 0.5;
    }
    
    addRain(index) {
        const data = this.tileData;
        const amount = this.toolStrength;
        
        // Add water to soil
        data.soilWater[index] = Math.min(1.0, data.soilWater[index] + amount);
        
        // Increase water vapor in atmosphere
        data.waterVapor[index] += amount * 0.01;
        data.normalizeAtmosphere(index);
    }
    
    addNutrients(index) {
        const data = this.tileData;
        const amount = this.toolStrength;
        
        data.nutrients[index] = Math.min(1.0, data.nutrients[index] + amount);
    }
    
    getToolColor() {
        if (this.currentTool && this.tools[this.currentTool]) {
            return this.tools[this.currentTool].color;
        }
        return '#ffffff';
    }
}
