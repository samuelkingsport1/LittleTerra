/**
 * UIManager - Manages all UI interactions and updates
 */
class UIManager {
    constructor(simulationEngine, renderer, toolManager) {
        this.engine = simulationEngine;
        this.renderer = renderer;
        this.toolManager = toolManager;
        
        // UI elements
        this.elements = {
            simYear: document.getElementById('sim-year'),
            speedDisplay: document.getElementById('speed-display'),
            btnPause: document.getElementById('btn-pause'),
            btnSlower: document.getElementById('btn-slower'),
            btnFaster: document.getElementById('btn-faster'),
            btnReset: document.getElementById('btn-reset'),
            btnUndo: document.getElementById('btn-undo'),
            btnRedo: document.getElementById('btn-redo'),
            overlaySelect: document.getElementById('overlay-select'),
            inspectorContent: document.getElementById('inspector-content'),
            toolInfo: document.getElementById('tool-info'),
            canvas: document.getElementById('main-canvas')
        };
        
        // State
        this.selectedTile = null;
        this.hoveredTile = null;
        this.isMouseDown = false;
        
        this.setupEventListeners();
        this.updateUI();
    }
    
    setupEventListeners() {
        // Control buttons
        this.elements.btnPause.addEventListener('click', () => {
            this.engine.togglePause();
            this.elements.btnPause.textContent = this.engine.isPaused ? '▶️' : '⏸️';
        });
        
        this.elements.btnSlower.addEventListener('click', () => {
            this.engine.setSpeed(this.engine.speedMultiplier * 0.5);
            this.updateSpeedDisplay();
        });
        
        this.elements.btnFaster.addEventListener('click', () => {
            this.engine.setSpeed(this.engine.speedMultiplier * 2);
            this.updateSpeedDisplay();
        });
        
        this.elements.btnReset.addEventListener('click', () => {
            if (confirm('Reset simulation to initial state?')) {
                this.engine.reset();
                this.selectedTile = null;
                this.updateInspector();
            }
        });
        
        this.elements.btnUndo.addEventListener('click', () => {
            if (this.engine.tileData.undo()) {
                this.updateUndoRedoButtons();
            }
        });
        
        this.elements.btnRedo.addEventListener('click', () => {
            if (this.engine.tileData.redo()) {
                this.updateUndoRedoButtons();
            }
        });
        
        // Overlay selection
        this.elements.overlaySelect.addEventListener('change', (e) => {
            this.renderer.setOverlayMode(e.target.value);
        });
        
        // Tool buttons
        document.querySelectorAll('.tool-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.target.dataset.tool;
                if (tool) {
                    // Remove active class from all buttons
                    document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
                    // Add active class to clicked button
                    e.target.classList.add('active');
                    
                    this.toolManager.setTool(tool);
                    this.updateToolInfo();
                }
            });
        });
        
        // Canvas interactions
        this.elements.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.elements.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.elements.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.elements.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        
        // Touch support
        this.elements.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.elements.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.elements.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Window resize
        window.addEventListener('resize', () => {
            this.renderer.updateDimensions();
        });
    }
    
    handleMouseDown(e) {
        this.isMouseDown = true;
        this.handleCanvasInteraction(e.offsetX, e.offsetY, true);
    }
    
    handleMouseMove(e) {
        this.hoveredTile = this.renderer.getTileAtPixel(e.offsetX, e.offsetY);
        if (this.isMouseDown) {
            this.handleCanvasInteraction(e.offsetX, e.offsetY, false);
        }
    }
    
    handleMouseUp(e) {
        this.isMouseDown = false;
    }
    
    handleMouseLeave(e) {
        this.isMouseDown = false;
        this.hoveredTile = null;
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.elements.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.isMouseDown = true;
        this.handleCanvasInteraction(x, y, true);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.elements.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.hoveredTile = this.renderer.getTileAtPixel(x, y);
        if (this.isMouseDown) {
            this.handleCanvasInteraction(x, y, false);
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.isMouseDown = false;
        this.hoveredTile = null;
    }
    
    handleCanvasInteraction(x, y, isClick) {
        const tile = this.renderer.getTileAtPixel(x, y);
        if (!tile) return;
        
        // If a tool is selected, apply it
        if (this.toolManager.currentTool) {
            this.toolManager.applyTool(tile.x, tile.y);
            this.updateUndoRedoButtons();
            if (this.selectedTile && this.selectedTile.index === tile.index) {
                this.updateInspector();
            }
        } else if (isClick) {
            // Otherwise, select the tile for inspection
            this.selectedTile = tile;
            this.updateInspector();
        }
    }
    
    updateUI() {
        // Update time display
        this.elements.simYear.textContent = this.engine.currentTime.toFixed(2);
        
        // Update speed display
        this.updateSpeedDisplay();
        
        // Update inspector if tile is selected
        if (this.selectedTile) {
            this.updateInspector();
        }
    }
    
    updateSpeedDisplay() {
        this.elements.speedDisplay.textContent = `${this.engine.speedMultiplier}x`;
    }
    
    updateToolInfo() {
        const tool = this.toolManager.getCurrentTool();
        if (tool) {
            this.elements.toolInfo.textContent = `Active: ${tool.name}`;
        } else {
            this.elements.toolInfo.textContent = 'Select a tool';
        }
    }
    
    updateInspector() {
        if (!this.selectedTile) {
            this.elements.inspectorContent.innerHTML = '<div class="inspector-hint">Click a tile to inspect</div>';
            return;
        }
        
        const data = this.engine.tileData;
        const i = this.selectedTile.index;
        
        const formatValue = (value, decimals = 3) => value.toFixed(decimals);
        
        const html = `
            <div class="inspector-section">
                <strong>Position: (${this.selectedTile.x}, ${this.selectedTile.y})</strong>
            </div>
            
            <div class="inspector-section">
                <strong>Climate</strong>
                ${this.inspectorRow('Temperature', formatValue(data.temperature[i], 1) + '°C')}
                ${this.inspectorRow('Cloudiness', formatValue(data.cloudiness[i]))}
                ${this.inspectorRow('Latitude', formatValue(data.latitude[i], 1) + '°')}
            </div>
            
            <div class="inspector-section">
                <strong>Soil</strong>
                ${this.inspectorRow('Water', formatValue(data.soilWater[i]))}
                ${this.inspectorRow('Nutrients', formatValue(data.nutrients[i]))}
                ${this.inspectorRow('Detritus', formatValue(data.detritus[i]))}
            </div>
            
            <div class="inspector-section">
                <strong>Atmosphere</strong>
                ${this.inspectorRow('CO₂', formatValue(data.co2[i], 4))}
                ${this.inspectorRow('O₂', formatValue(data.o2[i]))}
                ${this.inspectorRow('H₂O Vapor', formatValue(data.waterVapor[i], 4))}
                ${this.inspectorRow('Inert', formatValue(data.inertGases[i]))}
            </div>
            
            <div class="inspector-section">
                <strong>Biosphere</strong>
                ${this.inspectorRow('Plants', formatValue(data.plants[i]))}
                ${this.inspectorRow('Herbivores', formatValue(data.herbivores[i]))}
                ${this.inspectorRow('Predators', formatValue(data.predators[i]))}
                ${this.inspectorRow('Decomposers', formatValue(data.decomposers[i]))}
            </div>
        `;
        
        this.elements.inspectorContent.innerHTML = html;
    }
    
    inspectorRow(label, value) {
        return `
            <div class="inspector-row">
                <span class="inspector-label">${label}:</span>
                <span class="inspector-value">${value}</span>
            </div>
        `;
    }
    
    updateUndoRedoButtons() {
        const data = this.engine.tileData;
        this.elements.btnUndo.disabled = data.historyIndex <= 0;
        this.elements.btnRedo.disabled = data.historyIndex >= data.history.length - 1;
    }
}
