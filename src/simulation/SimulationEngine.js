/**
 * SimulationEngine - Handles all simulation calculations and state transitions
 */
class SimulationEngine {
    constructor(tileData) {
        this.tileData = tileData;
        this.timeStep = 0.01; // Years per step
        this.currentTime = 0;
        this.isPaused = false;
        this.speedMultiplier = 1;
        
        // Forgiveness and stability parameters
        this.params = {
            // Damping factors
            diffusionDamping: 0.95,
            biomassDecay: 0.99,
            
            // Resilience knobs
            minPlants: 0.001,
            minHerbivores: 0.0001,
            minPredators: 0.0001,
            
            // Rate constants
            evaporationRate: 0.02,
            precipitationRate: 0.1,
            cloudFormationRate: 0.05,
            diffusionRate: 0.05,
            photosynthesisRate: 0.1,
            herbivoryRate: 0.05,
            predationRate: 0.03,
            decompositionRate: 0.08,
            
            // Stability controls
            maxTemp: 50,
            minTemp: -40,
            maxBiomass: 1.0,
            maxWater: 1.0,
            maxNutrients: 1.0
        };
    }
    
    update(deltaTime) {
        if (this.isPaused) return;
        
        const steps = Math.ceil(deltaTime * this.speedMultiplier / this.timeStep);
        for (let s = 0; s < steps; s++) {
            this.simulateStep();
            this.currentTime += this.timeStep;
        }
    }
    
    simulateStep() {
        const data = this.tileData;
        const w = data.gridWidth;
        const h = data.gridHeight;
        
        // Calculate seasonal factor based on current time
        const season = Math.sin(this.currentTime * Math.PI * 2); // -1 to 1
        
        // Process each tile
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = data.getIndex(x, y);
                
                // 1. Temperature modeling with latitude and seasonality
                this.updateTemperature(i, season);
                
                // 2. Soil evaporation and atmospheric processes
                this.updateWaterCycle(i);
                
                // 3. Biosphere processes
                this.updateBiosphere(i);
                
                // 4. Decomposition
                this.updateDecomposition(i);
                
                // 5. Normalize atmosphere
                data.normalizeAtmosphere(i);
                
                // 6. Apply forgiveness controls
                this.applyStabilityControls(i);
            }
        }
        
        // 7. Diffusion pass (separate to avoid race conditions)
        this.applyDiffusion();
    }
    
    updateTemperature(i, season) {
        const data = this.tileData;
        const lat = data.latitude[i];
        
        // Base temperature from latitude
        const baseTemp = 25 - Math.abs(lat) * 0.5;
        
        // Seasonal variation (stronger at higher latitudes)
        const seasonalVariation = season * 10 * (Math.abs(lat) / 90);
        
        // Cloud cooling effect
        const cloudCooling = data.cloudiness[i] * 5;
        
        // Plant cooling effect (transpiration)
        const plantCooling = data.plants[i] * 3;
        
        // Target temperature
        const targetTemp = baseTemp + seasonalVariation - cloudCooling - plantCooling;
        
        // Smooth temperature change
        data.temperature[i] += (targetTemp - data.temperature[i]) * 0.1;
        data.temperature[i] = data.clamp(data.temperature[i], this.params.minTemp, this.params.maxTemp);
    }
    
    updateWaterCycle(i) {
        const data = this.tileData;
        
        // Evaporation from soil (temperature dependent)
        const tempFactor = Math.max(0, (data.temperature[i] + 10) / 60);
        const evaporation = data.soilWater[i] * this.params.evaporationRate * tempFactor;
        data.soilWater[i] -= evaporation;
        
        // Add to water vapor
        data.waterVapor[i] += evaporation * 0.01;
        
        // Cloud formation from water vapor
        if (data.waterVapor[i] > 0.02) {
            const condensation = (data.waterVapor[i] - 0.02) * this.params.cloudFormationRate;
            data.waterVapor[i] -= condensation;
            data.cloudiness[i] += condensation * 10;
        }
        
        // Precipitation from clouds
        if (data.cloudiness[i] > 0.5) {
            const rainfall = (data.cloudiness[i] - 0.5) * this.params.precipitationRate;
            data.cloudiness[i] -= rainfall;
            data.soilWater[i] += rainfall;
        }
        
        // Clamp values
        data.soilWater[i] = data.clamp(data.soilWater[i], 0, this.params.maxWater);
        data.cloudiness[i] = data.clamp(data.cloudiness[i], 0, 1);
        data.waterVapor[i] = data.clamp(data.waterVapor[i], 0, 0.1);
    }
    
    updateBiosphere(i) {
        const data = this.tileData;
        
        // Photosynthesis: CO2 + Water + Light -> Plants + O2
        const lightAvailable = 1.0 - data.cloudiness[i] * 0.5;
        const tempSuitability = this.getTempSuitability(data.temperature[i]);
        const waterAvailable = Math.min(1.0, data.soilWater[i] * 2);
        const nutrientAvailable = Math.min(1.0, data.nutrients[i] * 2);
        const co2Available = Math.min(1.0, data.co2[i] * 25); // CO2 around 0.04
        
        const photosynthesis = data.plants[i] * this.params.photosynthesisRate * 
                              lightAvailable * tempSuitability * waterAvailable * 
                              nutrientAvailable * co2Available;
        
        data.plants[i] += photosynthesis;
        data.co2[i] -= photosynthesis * 0.001;
        data.o2[i] += photosynthesis * 0.001;
        data.soilWater[i] -= photosynthesis * 0.1;
        data.nutrients[i] -= photosynthesis * 0.05;
        
        // Herbivory: Plants -> Herbivores
        const herbivory = Math.min(data.plants[i], data.herbivores[i] * this.params.herbivoryRate * 
                                   data.plants[i] * tempSuitability);
        data.plants[i] -= herbivory;
        data.herbivores[i] += herbivory * 0.1; // Efficiency factor
        
        // Predation: Herbivores -> Predators
        const predation = Math.min(data.herbivores[i], data.predators[i] * this.params.predationRate * 
                                   data.herbivores[i] * tempSuitability);
        data.herbivores[i] -= predation;
        data.predators[i] += predation * 0.1; // Efficiency factor
        
        // Natural mortality and decay
        data.plants[i] *= this.params.biomassDecay;
        data.herbivores[i] *= this.params.biomassDecay;
        data.predators[i] *= this.params.biomassDecay;
        
        // Convert dead biomass to detritus
        const plantMortality = data.plants[i] * 0.01;
        const herbMortality = data.herbivores[i] * 0.02;
        const predMortality = data.predators[i] * 0.02;
        data.detritus[i] += plantMortality + herbMortality + predMortality;
        
        // Clamp biomass
        data.plants[i] = data.clamp(data.plants[i], 0, this.params.maxBiomass);
        data.herbivores[i] = data.clamp(data.herbivores[i], 0, this.params.maxBiomass);
        data.predators[i] = data.clamp(data.predators[i], 0, this.params.maxBiomass);
    }
    
    updateDecomposition(i) {
        const data = this.tileData;
        
        // Decomposer activity depends on temperature and moisture
        const tempFactor = this.getTempSuitability(data.temperature[i]);
        const moistureFactor = Math.min(1.0, data.soilWater[i] * 2);
        
        data.decomposers[i] = 0.1 * tempFactor * moistureFactor;
        
        // Decomposition: Detritus -> Nutrients + CO2
        const decomposition = data.detritus[i] * this.params.decompositionRate * data.decomposers[i];
        data.detritus[i] -= decomposition;
        data.nutrients[i] += decomposition * 0.5;
        data.co2[i] += decomposition * 0.0005;
        
        // Clamp values
        data.detritus[i] = data.clamp(data.detritus[i], 0, 1);
        data.nutrients[i] = data.clamp(data.nutrients[i], 0, this.params.maxNutrients);
    }
    
    getTempSuitability(temp) {
        // Optimal temperature around 20-25°C
        const optimal = 22;
        const range = 20;
        const diff = Math.abs(temp - optimal);
        return Math.max(0, 1 - diff / range);
    }
    
    applyStabilityControls(i) {
        const data = this.tileData;
        
        // Ensure minimum viable populations
        if (data.plants[i] < this.params.minPlants && data.plants[i] > 0) {
            data.plants[i] = this.params.minPlants;
        }
        if (data.herbivores[i] < this.params.minHerbivores && data.herbivores[i] > 0) {
            data.herbivores[i] = this.params.minHerbivores;
        }
        if (data.predators[i] < this.params.minPredators && data.predators[i] > 0) {
            data.predators[i] = this.params.minPredators;
        }
    }
    
    applyDiffusion() {
        const data = this.tileData;
        const w = data.gridWidth;
        const h = data.gridHeight;
        
        // Create temporary arrays for diffusion
        const newCO2 = new Float32Array(data.numTiles);
        const newO2 = new Float32Array(data.numTiles);
        const newWaterVapor = new Float32Array(data.numTiles);
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = data.getIndex(x, y);
                
                // Get neighbors
                const neighbors = [
                    data.getIndex(x - 1, y),
                    data.getIndex(x + 1, y),
                    data.getIndex(x, y - 1),
                    data.getIndex(x, y + 1)
                ];
                
                let co2Sum = data.co2[i];
                let o2Sum = data.o2[i];
                let wvSum = data.waterVapor[i];
                let count = 1;
                
                for (const ni of neighbors) {
                    if (ni >= 0) {
                        co2Sum += data.co2[ni];
                        o2Sum += data.o2[ni];
                        wvSum += data.waterVapor[ni];
                        count++;
                    }
                }
                
                // Apply diffusion with damping
                const rate = this.params.diffusionRate * this.params.diffusionDamping;
                newCO2[i] = data.co2[i] * (1 - rate) + (co2Sum / count) * rate;
                newO2[i] = data.o2[i] * (1 - rate) + (o2Sum / count) * rate;
                newWaterVapor[i] = data.waterVapor[i] * (1 - rate) + (wvSum / count) * rate;
            }
        }
        
        // Copy back
        data.co2.set(newCO2);
        data.o2.set(newO2);
        data.waterVapor.set(newWaterVapor);
    }
    
    pause() {
        this.isPaused = true;
    }
    
    resume() {
        this.isPaused = false;
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
    }
    
    setSpeed(multiplier) {
        this.speedMultiplier = Math.max(0.25, Math.min(8, multiplier));
    }
    
    reset() {
        this.currentTime = 0;
        this.tileData.reset();
    }
}
