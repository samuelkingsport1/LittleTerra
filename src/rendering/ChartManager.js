/**
 * ChartManager - Manages trend charts for visualizing simulation data over time
 */
class ChartManager {
    constructor(tileData, maxDataPoints = 100) {
        this.tileData = tileData;
        this.maxDataPoints = maxDataPoints;
        
        // Chart canvases
        this.charts = {
            biomass: document.getElementById('chart-biomass'),
            temperature: document.getElementById('chart-temperature'),
            water: document.getElementById('chart-water'),
            atmosphere: document.getElementById('chart-atmosphere')
        };
        
        // Data history
        this.history = {
            plants: [],
            herbivores: [],
            predators: [],
            temperature: [],
            water: [],
            co2: [],
            o2: []
        };
        
        // Update interval (every N frames)
        this.updateCounter = 0;
        this.updateInterval = 30; // Update charts every 30 frames
        
        // Initialize chart contexts
        this.contexts = {};
        for (const [key, canvas] of Object.entries(this.charts)) {
            if (canvas) {
                this.contexts[key] = canvas.getContext('2d');
            }
        }
        
        // Resize canvases
        this.resizeCanvases();
    }
    
    resizeCanvases() {
        for (const [key, canvas] of Object.entries(this.charts)) {
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            }
        }
    }
    
    update() {
        this.updateCounter++;
        if (this.updateCounter < this.updateInterval) return;
        this.updateCounter = 0;
        
        // Calculate averages
        const data = this.tileData;
        let totalPlants = 0;
        let totalHerbivores = 0;
        let totalPredators = 0;
        let totalTemp = 0;
        let totalWater = 0;
        let totalCO2 = 0;
        let totalO2 = 0;
        
        for (let i = 0; i < data.numTiles; i++) {
            totalPlants += data.plants[i];
            totalHerbivores += data.herbivores[i];
            totalPredators += data.predators[i];
            totalTemp += data.temperature[i];
            totalWater += data.soilWater[i];
            totalCO2 += data.co2[i];
            totalO2 += data.o2[i];
        }
        
        const n = data.numTiles;
        
        // Add to history
        this.addDataPoint('plants', totalPlants / n);
        this.addDataPoint('herbivores', totalHerbivores / n);
        this.addDataPoint('predators', totalPredators / n);
        this.addDataPoint('temperature', totalTemp / n);
        this.addDataPoint('water', totalWater / n);
        this.addDataPoint('co2', totalCO2 / n);
        this.addDataPoint('o2', totalO2 / n);
        
        // Render charts
        this.renderCharts();
    }
    
    addDataPoint(key, value) {
        this.history[key].push(value);
        if (this.history[key].length > this.maxDataPoints) {
            this.history[key].shift();
        }
    }
    
    renderCharts() {
        this.renderBiomassChart();
        this.renderTemperatureChart();
        this.renderWaterChart();
        this.renderAtmosphereChart();
    }
    
    renderBiomassChart() {
        const ctx = this.contexts.biomass;
        if (!ctx) return;
        
        const canvas = this.charts.biomass;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.clearRect(0, 0, width, height);
        
        // Draw lines
        this.drawLine(ctx, this.history.plants, '#48bb78', width, height, 0, 1);
        this.drawLine(ctx, this.history.herbivores, '#ed8936', width, height, 0, 1);
        this.drawLine(ctx, this.history.predators, '#f56565', width, height, 0, 1);
        
        // Draw legend
        this.drawLegend(ctx, [
            { color: '#48bb78', label: 'Plants' },
            { color: '#ed8936', label: 'Herbivores' },
            { color: '#f56565', label: 'Predators' }
        ], width, 10);
    }
    
    renderTemperatureChart() {
        const ctx = this.contexts.temperature;
        if (!ctx) return;
        
        const canvas = this.charts.temperature;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.clearRect(0, 0, width, height);
        
        // Draw line
        this.drawLine(ctx, this.history.temperature, '#667eea', width, height, -20, 40);
        
        // Draw legend
        this.drawLegend(ctx, [
            { color: '#667eea', label: 'Avg Temp (°C)' }
        ], width, 10);
    }
    
    renderWaterChart() {
        const ctx = this.contexts.water;
        if (!ctx) return;
        
        const canvas = this.charts.water;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.clearRect(0, 0, width, height);
        
        // Draw line
        this.drawLine(ctx, this.history.water, '#4299e1', width, height, 0, 1);
        
        // Draw legend
        this.drawLegend(ctx, [
            { color: '#4299e1', label: 'Soil Water' }
        ], width, 10);
    }
    
    renderAtmosphereChart() {
        const ctx = this.contexts.atmosphere;
        if (!ctx) return;
        
        const canvas = this.charts.atmosphere;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.clearRect(0, 0, width, height);
        
        // Draw lines
        this.drawLine(ctx, this.history.co2, '#f56565', width, height, 0, 0.05);
        this.drawLine(ctx, this.history.o2, '#48bb78', width, height, 0, 0.3);
        
        // Draw legend
        this.drawLegend(ctx, [
            { color: '#f56565', label: 'CO₂' },
            { color: '#48bb78', label: 'O₂' }
        ], width, 10);
    }
    
    drawLine(ctx, data, color, width, height, minVal, maxVal) {
        if (data.length < 2) return;
        
        const padding = 10;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2 - 20; // Extra space for legend
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < data.length; i++) {
            const x = padding + (i / (this.maxDataPoints - 1)) * chartWidth;
            const normalized = (data[i] - minVal) / (maxVal - minVal);
            const y = padding + chartHeight - (normalized * chartHeight);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }
    
    drawLegend(ctx, items, width, y) {
        ctx.font = '10px sans-serif';
        let x = 10;
        
        for (const item of items) {
            // Draw color box
            ctx.fillStyle = item.color;
            ctx.fillRect(x, y, 8, 8);
            
            // Draw label
            ctx.fillStyle = '#2d3748';
            ctx.fillText(item.label, x + 12, y + 8);
            
            x += ctx.measureText(item.label).width + 30;
        }
    }
    
    reset() {
        // Clear all history
        for (const key in this.history) {
            this.history[key] = [];
        }
        this.renderCharts();
    }
}
