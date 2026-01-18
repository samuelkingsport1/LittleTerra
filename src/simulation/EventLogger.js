/**
 * EventLogger - Tracks and logs major simulation events for troubleshooting
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
                this.logEvent('DIE_OFF', `Plant die-off: ${(plantChange * 100).toFixed(1)}% decline`, {
                    simYear,
                    previous: this.lastCheck.plants.toFixed(4),
                    current: avgPlants.toFixed(4),
                    avgTemp: avgTemp.toFixed(2),
                    avgWater: avgWater.toFixed(4)
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
                this.logEvent('DIE_OFF', `Herbivore die-off: ${(herbChange * 100).toFixed(1)}% decline`, {
                    simYear,
                    previous: this.lastCheck.herbivores.toFixed(4),
                    current: avgHerbivores.toFixed(4),
                    plantAvail: avgPlants.toFixed(4)
                });
            }
        }
        
        if (this.lastCheck.predators > 0) {
            const predChange = (avgPredators - this.lastCheck.predators) / this.lastCheck.predators;
            if (predChange < -0.3) {
                this.logEvent('DIE_OFF', `Predator die-off: ${(predChange * 100).toFixed(1)}% decline`, {
                    simYear,
                    previous: this.lastCheck.predators.toFixed(4),
                    current: avgPredators.toFixed(4),
                    preyAvail: avgHerbivores.toFixed(4)
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
        let text = '=== LittleTerra Event Log ===\n\n';
        this.events.forEach(event => {
            const dataStr = Object.entries(event.data)
                .filter(([key]) => key !== 'simYear')
                .map(([key, val]) => `${key}=${val}`)
                .join(', ');
            text += `[Year ${event.simYear.toFixed(2)}] ${event.type}: ${event.message}`;
            if (dataStr) {
                text += ` (${dataStr})`;
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
