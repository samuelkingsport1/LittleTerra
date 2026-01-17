/**
 * Main Application - Initializes and runs the LittleTerra simulation
 */
class LittleTerraApp {
    constructor() {
        // Grid configuration - 50x30 tiles for nation-scale simulation
        // Each tile represents 10km by default (adjustable 2-20km)
        this.gridWidth = 50;
        this.gridHeight = 30;
        this.tileSize = 10; // km per tile
        
        // Initialize systems
        this.tileData = new TileData(this.gridWidth, this.gridHeight, this.tileSize);
        this.engine = new SimulationEngine(this.tileData);
        
        const canvas = document.getElementById('main-canvas');
        this.renderer = new Renderer(canvas, this.tileData);
        
        this.toolManager = new ToolManager(this.tileData);
        this.uiManager = new UIManager(this.engine, this.renderer, this.toolManager);
        
        // Animation
        this.lastTime = 0;
        this.running = true;
        
        // Start the application
        this.init();
    }
    
    init() {
        console.log('LittleTerra: Initializing nation-scale terrarium simulation');
        console.log(`Grid: ${this.gridWidth}x${this.gridHeight} tiles (${this.tileSize}km per tile)`);
        console.log(`Total area: ${this.gridWidth * this.tileSize}km x ${this.gridHeight * this.tileSize}km`);
        
        // Initial render
        this.renderer.render();
        
        // Start animation loop
        requestAnimationFrame((time) => this.animate(time));
        
        // Log initial state
        this.logSystemState();
    }
    
    animate(currentTime) {
        if (!this.running) return;
        
        // Calculate delta time in seconds
        const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
        this.lastTime = currentTime;
        
        // Update simulation (deltaTime is in seconds, converted to years in engine)
        if (deltaTime > 0 && deltaTime < 0.1) { // Sanity check
            this.engine.update(deltaTime);
        }
        
        // Update UI
        this.uiManager.updateUI();
        
        // Render
        this.renderer.render();
        
        // Draw tool preview if hovering and tool selected
        if (this.uiManager.hoveredTile && this.toolManager.currentTool) {
            this.renderer.drawToolPreview(
                this.uiManager.hoveredTile.x,
                this.uiManager.hoveredTile.y,
                this.toolManager.toolRadius,
                this.toolManager.getToolColor()
            );
        }
        
        // Continue animation
        requestAnimationFrame((time) => this.animate(time));
    }
    
    logSystemState() {
        const data = this.tileData;
        let totalPlants = 0;
        let totalHerbivores = 0;
        let totalPredators = 0;
        let totalCO2 = 0;
        let totalO2 = 0;
        let avgTemp = 0;
        
        for (let i = 0; i < data.numTiles; i++) {
            totalPlants += data.plants[i];
            totalHerbivores += data.herbivores[i];
            totalPredators += data.predators[i];
            totalCO2 += data.co2[i];
            totalO2 += data.o2[i];
            avgTemp += data.temperature[i];
        }
        
        console.log('=== System State ===');
        console.log(`Total Plants: ${totalPlants.toFixed(2)}`);
        console.log(`Total Herbivores: ${totalHerbivores.toFixed(2)}`);
        console.log(`Total Predators: ${totalPredators.toFixed(2)}`);
        console.log(`Avg CO₂: ${(totalCO2 / data.numTiles).toFixed(4)}`);
        console.log(`Avg O₂: ${(totalO2 / data.numTiles).toFixed(4)}`);
        console.log(`Avg Temperature: ${(avgTemp / data.numTiles).toFixed(2)}°C`);
    }
    
    stop() {
        this.running = false;
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new LittleTerraApp();
    });
} else {
    window.app = new LittleTerraApp();
}
