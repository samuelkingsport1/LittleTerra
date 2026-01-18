/**
 * EventLogger - Tracks and logs major simulation events with spatial analysis and cause detection
 */
class EventLogger {
    constructor(maxEvents = 50) {
        this.maxEvents = maxEvents;
        this.events = [];
        this.lastCheck = {
            plants: 0,
            herbivores: 0,
            predators: 0,
            avgTemp: 0,
            avgWater: 0
        };
        this.checkInterval = 5; // Check every 5 simulated years
        this.lastCheckTime = 0;
        
        // Spatial tracking for map-level analysis
        this.spatialData = {
            plantHotspots: [],
            dieOffZones: [],
            waterSources: [],
            temperatureExtremes: []
        };
    }
    
    logEvent(type, message, data = {}) {
        const event = {
            time: Date.now(),
            simYear: data.simYear || 0,
            type: type,
            message: message,
            data: data
        };
        
        this.events.unshift(event);
        
        // Keep only the most recent events
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(0, this.maxEvents);
        }
        
        // Log to console for debugging
        console.log(`[${type}] Year ${event.simYear.toFixed(2)}: ${message}`, data);
    }
    
    // Analyze spatial patterns to understand die-offs
    analyzeSpatialPatterns(tileData) {
        const w = tileData.gridWidth;
        const h = tileData.gridHeight;
        
        // Find hotspots and problem areas
        this.spatialData.plantHotspots = [];
        this.spatialData.dieOffZones = [];
        this.spatialData.waterSources = [];
        this.spatialData.temperatureExtremes = [];
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = tileData.getIndex(x, y);
                
                // Track plant hotspots
                if (tileData.plants[i] > 0.3) {
                    this.spatialData.plantHotspots.push({x, y, value: tileData.plants[i]});
                }
                
                // Track die-off zones (no life)
                if (tileData.plants[i] < 0.001 && tileData.herbivores[i] < 0.001 && tileData.predators[i] < 0.001) {
                    this.spatialData.dieOffZones.push({x, y});
                }
                
                // Track water sources
                if (tileData.soilWater[i] > 0.7) {
                    this.spatialData.waterSources.push({x, y, value: tileData.soilWater[i]});
                }
                
                // Track temperature extremes
                if (tileData.temperature[i] < -5 || tileData.temperature[i] > 35) {
                    this.spatialData.temperatureExtremes.push({x, y, temp: tileData.temperature[i]});
                }
            }
        }
    }
    
    // AI-powered cause analysis for die-offs
    analyzeDieOffCauses(tileData, simYear, populationType, changePercent, previous, current) {
        const causes = [];
        const mapData = [];
        
        // Analyze environmental factors
        let totalTemp = 0;
        let totalWater = 0;
        let totalNutrients = 0;
        let extremeColdTiles = 0;
        let extremeHotTiles = 0;
        let droughtTiles = 0;
        let starvationRisk = 0;
        
        for (let i = 0; i < tileData.numTiles; i++) {
            totalTemp += tileData.temperature[i];
            totalWater += tileData.soilWater[i];
            totalNutrients += tileData.nutrients[i];
            
            if (tileData.temperature[i] < -5) extremeColdTiles++;
            if (tileData.temperature[i] > 35) extremeHotTiles++;
            if (tileData.soilWater[i] < 0.1) droughtTiles++;
            
            // Check food chain issues
            if (populationType === 'Herbivore' && tileData.plants[i] < 0.01 && tileData.herbivores[i] > 0) {
                starvationRisk++;
            }
            if (populationType === 'Predator' && tileData.herbivores[i] < 0.001 && tileData.predators[i] > 0) {
                starvationRisk++;
            }
        }
        
        const avgTemp = totalTemp / tileData.numTiles;
        const avgWater = totalWater / tileData.numTiles;
        const avgNutrients = totalNutrients / tileData.numTiles;
        
        // Determine primary causes
        if (extremeColdTiles > tileData.numTiles * 0.3) {
            causes.push(`EXTREME COLD: ${((extremeColdTiles / tileData.numTiles) * 100).toFixed(0)}% of tiles below -5°C`);
            mapData.push(`Cold zones: ${extremeColdTiles} tiles`);
        }
        
        if (extremeHotTiles > tileData.numTiles * 0.2) {
            causes.push(`EXTREME HEAT: ${((extremeHotTiles / tileData.numTiles) * 100).toFixed(0)}% of tiles above 35°C`);
            mapData.push(`Hot zones: ${extremeHotTiles} tiles`);
        }
        
        if (droughtTiles > tileData.numTiles * 0.5) {
            causes.push(`SEVERE DROUGHT: ${((droughtTiles / tileData.numTiles) * 100).toFixed(0)}% of tiles with water < 0.1`);
            mapData.push(`Drought zones: ${droughtTiles} tiles`);
        }
        
        if (avgNutrients < 0.2) {
            causes.push(`NUTRIENT DEPLETION: Average nutrients at ${avgNutrients.toFixed(3)}`);
        }
        
        if (starvationRisk > tileData.numTiles * 0.3) {
            causes.push(`STARVATION: ${((starvationRisk / tileData.numTiles) * 100).toFixed(0)}% of tiles lack food sources`);
            mapData.push(`Starvation risk zones: ${starvationRisk} tiles`);
        }
        
        // Analyze spatial distribution
        this.analyzeSpatialPatterns(tileData);
        mapData.push(`Die-off zones: ${this.spatialData.dieOffZones.length} locations`);
        mapData.push(`Water sources: ${this.spatialData.waterSources.length} locations`);
        
        // Calculate distance to water for die-off zones
        if (this.spatialData.dieOffZones.length > 0 && this.spatialData.waterSources.length > 0) {
            let avgDistToWater = 0;
            for (const zone of this.spatialData.dieOffZones.slice(0, 10)) {
                let minDist = Infinity;
                for (const water of this.spatialData.waterSources.slice(0, 10)) {
                    const dist = Math.sqrt((zone.x - water.x) ** 2 + (zone.y - water.y) ** 2);
                    minDist = Math.min(minDist, dist);
                }
                avgDistToWater += minDist;
            }
            avgDistToWater /= Math.min(10, this.spatialData.dieOffZones.length);
            
            if (avgDistToWater > 10) {
                causes.push(`WATER ISOLATION: Die-off zones average ${avgDistToWater.toFixed(1)} tiles from water`);
            }
        }
        
        // Population-specific analysis
        if (populationType === 'Plant' && avgWater < 0.15) {
            causes.push(`WATER STRESS: Plants require water, avg ${(avgWater * 100).toFixed(1)}% available`);
        }
        
        if (populationType === 'Herbivore') {
            const avgPlants = Array.from(tileData.plants).reduce((a, b) => a + b, 0) / tileData.numTiles;
            if (avgPlants < 0.02) {
                causes.push(`FOOD SHORTAGE: Only ${(avgPlants * 100).toFixed(2)}% plant biomass available`);
            }
        }
        
        if (populationType === 'Predator') {
            const avgHerb = Array.from(tileData.herbivores).reduce((a, b) => a + b, 0) / tileData.numTiles;
            if (avgHerb < 0.002) {
                causes.push(`PREY COLLAPSE: Only ${(avgHerb * 100).toFixed(3)}% herbivore biomass available`);
            }
        }
        
        // If no specific cause found
        if (causes.length === 0) {
            causes.push('SYSTEM INSTABILITY: Multiple interacting factors or cascade effect');
        }
        
        return { causes, mapData, spatialData: this.spatialData };
    }
    
    checkForEvents(tileData, simYear) {
        // Only check periodically to avoid spam
        if (simYear - this.lastCheckTime < this.checkInterval) {
            return;
        }
        this.lastCheckTime = simYear;
        
        // Calculate current totals
        let totalPlants = 0;
        let totalHerbivores = 0;
        let totalPredators = 0;
        let totalTemp = 0;
        let totalWater = 0;
        let deadZones = 0;
        
        for (let i = 0; i < tileData.numTiles; i++) {
            totalPlants += tileData.plants[i];
            totalHerbivores += tileData.herbivores[i];
            totalPredators += tileData.predators[i];
            totalTemp += tileData.temperature[i];
            totalWater += tileData.soilWater[i];
            
            // Check for dead zones (no biomass)
            if (tileData.plants[i] < 0.001 && 
                tileData.herbivores[i] < 0.001 && 
                tileData.predators[i] < 0.001) {
                deadZones++;
            }
        }
        
        const n = tileData.numTiles;
        const avgPlants = totalPlants / n;
        const avgHerbivores = totalHerbivores / n;
        const avgPredators = totalPredators / n;
        const avgTemp = totalTemp / n;
        const avgWater = totalWater / n;
        
        // Detect significant population changes (>30% change)
        if (this.lastCheck.plants > 0) {
            const plantChange = (avgPlants - this.lastCheck.plants) / this.lastCheck.plants;
            if (plantChange < -0.3) {
                const analysis = this.analyzeDieOffCauses(tileData, simYear, 'Plant', plantChange, this.lastCheck.plants, avgPlants);
                this.logEvent('DIE_OFF', `Plant die-off: ${(plantChange * 100).toFixed(1)}% decline`, {
                    simYear,
                    previous: this.lastCheck.plants.toFixed(4),
                    current: avgPlants.toFixed(4),
                    avgTemp: avgTemp.toFixed(2),
                    avgWater: avgWater.toFixed(4),
                    causes: analysis.causes,
                    mapData: analysis.mapData
                });
            } else if (plantChange > 0.5) {
                this.logEvent('BLOOM', `Plant bloom: ${(plantChange * 100).toFixed(1)}% growth`, {
                    simYear,
                    previous: this.lastCheck.plants.toFixed(4),
                    current: avgPlants.toFixed(4)
                });
            }
        }
        
        if (this.lastCheck.herbivores > 0) {
            const herbChange = (avgHerbivores - this.lastCheck.herbivores) / this.lastCheck.herbivores;
            if (herbChange < -0.3) {
                const analysis = this.analyzeDieOffCauses(tileData, simYear, 'Herbivore', herbChange, this.lastCheck.herbivores, avgHerbivores);
                this.logEvent('DIE_OFF', `Herbivore die-off: ${(herbChange * 100).toFixed(1)}% decline`, {
                    simYear,
                    previous: this.lastCheck.herbivores.toFixed(4),
                    current: avgHerbivores.toFixed(4),
                    plantAvail: avgPlants.toFixed(4),
                    causes: analysis.causes,
                    mapData: analysis.mapData
                });
            }
        }
        
        if (this.lastCheck.predators > 0) {
            const predChange = (avgPredators - this.lastCheck.predators) / this.lastCheck.predators;
            if (predChange < -0.3) {
                const analysis = this.analyzeDieOffCauses(tileData, simYear, 'Predator', predChange, this.lastCheck.predators, avgPredators);
                this.logEvent('DIE_OFF', `Predator die-off: ${(predChange * 100).toFixed(1)}% decline`, {
                    simYear,
                    previous: this.lastCheck.predators.toFixed(4),
                    current: avgPredators.toFixed(4),
                    preyAvail: avgHerbivores.toFixed(4),
                    causes: analysis.causes,
                    mapData: analysis.mapData
                });
            }
        }
        
        // Check for extreme conditions
        if (avgTemp < -10) {
            this.logEvent('WARNING', `Extreme cold: ${avgTemp.toFixed(2)}°C`, {
                simYear,
                avgTemp: avgTemp.toFixed(2)
            });
        } else if (avgTemp > 35) {
            this.logEvent('WARNING', `Extreme heat: ${avgTemp.toFixed(2)}°C`, {
                simYear,
                avgTemp: avgTemp.toFixed(2)
            });
        }
        
        if (avgWater < 0.01) {
            this.logEvent('WARNING', `Severe drought: water at ${avgWater.toFixed(4)}`, {
                simYear,
                avgWater: avgWater.toFixed(4)
            });
        }
        
        // Check for ecosystem collapse (>80% dead zones)
        const deadZonePercent = (deadZones / n) * 100;
        if (deadZonePercent > 80) {
            this.logEvent('CRITICAL', `Ecosystem collapse: ${deadZonePercent.toFixed(1)}% dead zones`, {
                simYear,
                deadZones,
                totalTiles: n
            });
        }
        
        // Update last check values
        this.lastCheck = {
            plants: avgPlants,
            herbivores: avgHerbivores,
            predators: avgPredators,
            avgTemp: avgTemp,
            avgWater: avgWater
        };
    }
    
    logToolUse(toolName, position, simYear) {
        this.logEvent('TOOL', `Used ${toolName} at (${position.x}, ${position.y})`, {
            simYear,
            tool: toolName,
            position
        });
    }
    
    getRecentEvents(count = 10) {
        return this.events.slice(0, count);
    }
    
    getEventsAsText() {
        let text = '=== LittleTerra Event Log with Cause Analysis ===\n\n';
        this.events.forEach(event => {
            text += `[Year ${event.simYear.toFixed(2)}] ${event.type}: ${event.message}\n`;
            
            // Add detailed cause analysis for die-offs
            if (event.data.causes && event.data.causes.length > 0) {
                text += `  ROOT CAUSES:\n`;
                event.data.causes.forEach(cause => {
                    text += `    - ${cause}\n`;
                });
            }
            
            // Add map-level data
            if (event.data.mapData && event.data.mapData.length > 0) {
                text += `  MAP DATA:\n`;
                event.data.mapData.forEach(data => {
                    text += `    - ${data}\n`;
                });
            }
            
            // Add other relevant data (excluding causes and mapData which we already printed)
            const otherData = Object.entries(event.data)
                .filter(([key]) => key !== 'simYear' && key !== 'causes' && key !== 'mapData')
                .map(([key, val]) => `${key}=${val}`)
                .join(', ');
            
            if (otherData) {
                text += `  DATA: ${otherData}\n`;
            }
            
            text += '\n';
        });
        return text;
    }
    
    clear() {
        this.events = [];
        this.lastCheck = {
            plants: 0,
            herbivores: 0,
            predators: 0,
            avgTemp: 0,
            avgWater: 0
        };
        this.lastCheckTime = 0;
    }
}
