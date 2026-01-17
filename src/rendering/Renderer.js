/**
 * Renderer - Handles all canvas rendering and visualization
 */
class Renderer {
    constructor(canvas, tileData) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileData = tileData;
        this.overlayMode = 'terrain';
        
        // View settings
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Calculate tile pixel size
        this.updateDimensions();
        
        // Color schemes for different overlays
        this.colorSchemes = {
            terrain: (value) => this.interpolateColor([34, 139, 34], [210, 180, 140], value),
            temperature: (value) => this.temperatureColor(value),
            water: (value) => this.interpolateColor([139, 69, 19], [30, 144, 255], value),
            plants: (value) => this.interpolateColor([100, 50, 0], [0, 255, 0], value),
            herbivores: (value) => this.interpolateColor([50, 50, 50], [255, 200, 100], value),
            predators: (value) => this.interpolateColor([50, 50, 50], [255, 50, 50], value),
            co2: (value) => this.interpolateColor([0, 0, 100], [255, 0, 0], value * 25),
            o2: (value) => this.interpolateColor([0, 0, 100], [0, 255, 255], value * 5),
            clouds: (value) => this.interpolateColor([0, 50, 100], [255, 255, 255], value)
        };
    }
    
    updateDimensions() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Calculate optimal tile size to fit the grid
        this.tilePixelWidth = this.canvas.width / this.tileData.gridWidth;
        this.tilePixelHeight = this.canvas.height / this.tileData.gridHeight;
    }
    
    setOverlayMode(mode) {
        this.overlayMode = mode;
    }
    
    render() {
        const ctx = this.ctx;
        const data = this.tileData;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render each tile
        for (let y = 0; y < data.gridHeight; y++) {
            for (let x = 0; x < data.gridWidth; x++) {
                const i = data.getIndex(x, y);
                this.renderTile(x, y, i);
            }
        }
    }
    
    renderTile(x, y, index) {
        const ctx = this.ctx;
        const data = this.tileData;
        
        // Get value based on overlay mode
        let value = 0;
        switch (this.overlayMode) {
            case 'terrain':
                // Composite view
                value = (data.plants[index] + data.soilWater[index]) / 2;
                break;
            case 'temperature':
                value = (data.temperature[index] + 40) / 90; // Normalize -40 to 50
                break;
            case 'water':
                value = data.soilWater[index];
                break;
            case 'plants':
                value = data.plants[index];
                break;
            case 'herbivores':
                value = data.herbivores[index];
                break;
            case 'predators':
                value = data.predators[index];
                break;
            case 'co2':
                value = data.co2[index];
                break;
            case 'o2':
                value = data.o2[index];
                break;
            case 'clouds':
                value = data.cloudiness[index];
                break;
        }
        
        // Get color
        const colorFunc = this.colorSchemes[this.overlayMode] || this.colorSchemes.terrain;
        const [r, g, b] = colorFunc(value);
        
        // Draw tile
        const px = x * this.tilePixelWidth;
        const py = y * this.tilePixelHeight;
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(
            Math.floor(px),
            Math.floor(py),
            Math.ceil(this.tilePixelWidth) + 1,
            Math.ceil(this.tilePixelHeight) + 1
        );
    }
    
    interpolateColor(color1, color2, t) {
        t = Math.max(0, Math.min(1, t));
        return [
            Math.round(color1[0] + (color2[0] - color1[0]) * t),
            Math.round(color1[1] + (color2[1] - color1[1]) * t),
            Math.round(color1[2] + (color2[2] - color1[2]) * t)
        ];
    }
    
    temperatureColor(temp) {
        // -40 to 50°C range
        if (temp < 0) {
            // Blue for cold
            const t = (temp + 40) / 40;
            return this.interpolateColor([0, 0, 139], [135, 206, 250], t);
        } else if (temp < 25) {
            // Green for moderate
            const t = temp / 25;
            return this.interpolateColor([135, 206, 250], [34, 139, 34], t);
        } else {
            // Red for hot
            const t = (temp - 25) / 25;
            return this.interpolateColor([34, 139, 34], [220, 20, 60], t);
        }
    }
    
    getTileAtPixel(px, py) {
        const x = Math.floor(px / this.tilePixelWidth);
        const y = Math.floor(py / this.tilePixelHeight);
        
        if (x >= 0 && x < this.tileData.gridWidth && y >= 0 && y < this.tileData.gridHeight) {
            return { x, y, index: this.tileData.getIndex(x, y) };
        }
        return null;
    }
    
    drawToolPreview(x, y, radius, color) {
        const ctx = this.ctx;
        const px = (x + 0.5) * this.tilePixelWidth;
        const py = (y + 0.5) * this.tilePixelHeight;
        const r = radius * Math.max(this.tilePixelWidth, this.tilePixelHeight);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add crosshair
        ctx.beginPath();
        ctx.moveTo(px - r, py);
        ctx.lineTo(px + r, py);
        ctx.moveTo(px, py - r);
        ctx.lineTo(px, py + r);
        ctx.stroke();
    }
}
