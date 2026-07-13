/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * VehicleChaincode - Smart contract for Universal Digital Identity Framework
 * Manages vehicle digital twins and telemetry data
 */
class VehicleChaincode extends Contract {

    /**
     * Constructor - Define contract namespace
     */
    constructor() {
        super('VehicleContract');
    }

    /**
     * Initialize the ledger
     * Called when chaincode is instantiated/upgraded
     */
    async initLedger(ctx) {
        console.info('START : Initialize Ledger');
        console.info('Chaincode: VehicleChaincode');
        console.info('Version: 1.0.0');
        console.info('END : Initialize Ledger');
        
        return JSON.stringify({ 
            success: true, 
            message: 'Vehicle chaincode initialized successfully' 
        });
    }

    /**
     * Store telemetry data from IoT devices
     * @param {Context} ctx - Transaction context
     * @param {string} telemetryJSON - JSON string of telemetry data
     * @returns {string} JSON result with success status and key
     */
    async storeTelemetry(ctx, telemetryJSON) {
        try {
            // Validate input exists
            if (!telemetryJSON) {
                throw new Error('Telemetry data is required');
            }

            // Validate JSON size (prevent DOS attacks)
            if (telemetryJSON.length > 1000000) { // 1MB limit
                throw new Error('Telemetry data exceeds maximum size of 1MB');
            }

            // Parse JSON with error handling
            let telemetry;
            try {
                telemetry = JSON.parse(telemetryJSON);
            } catch (parseError) {
                throw new Error(`Invalid JSON format: ${parseError.message}`);
            }

            // Validate required fields
            if (!telemetry.vin || typeof telemetry.vin !== 'string') {
                throw new Error('Valid VIN is required');
            }

            if (!telemetry.timestamp) {
                throw new Error('Timestamp is required');
            }

            // Validate timestamp format
            const timestamp = new Date(telemetry.timestamp);
            if (isNaN(timestamp.getTime())) {
                throw new Error('Invalid timestamp format');
            }

            // Validate timestamp is reasonable (not in future, not too old)
            const now = Date.now();
            const timestampMs = timestamp.getTime();
            
            if (timestampMs > now + 60000) { // More than 1 minute in future
                throw new Error('Timestamp cannot be in the future');
            }

            const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
            if (timestampMs < oneYearAgo) {
                throw new Error('Timestamp is too old (more than 1 year)');
            }

            // Add metadata
            telemetry.storedAt = new Date().toISOString();
            telemetry.txId = ctx.stub.getTxID();
            telemetry.submitter = ctx.clientIdentity.getID();

            // Create composite key for efficient querying
            const key = ctx.stub.createCompositeKey('telemetry', 
                [telemetry.vin, telemetry.timestamp]);

            // Check if key already exists (prevent duplicates)
            const existingData = await ctx.stub.getState(key);
            if (existingData && existingData.length > 0) {
                console.warn(`Telemetry already exists for VIN ${telemetry.vin} at ${telemetry.timestamp}`);
                return JSON.stringify({ 
                    success: false, 
                    message: 'Telemetry data already exists',
                    key: key 
                });
            }

            // Store in ledger
            const telemetryBuffer = Buffer.from(JSON.stringify(telemetry));
            await ctx.stub.putState(key, telemetryBuffer);

            // Also store as latest for quick retrieval
            const latestKey = `latest_${telemetry.vin}`;
            await ctx.stub.putState(latestKey, telemetryBuffer);

            // Emit event for external listeners
            ctx.stub.setEvent('TelemetryStored', telemetryBuffer);

            console.info(`Stored telemetry for VIN: ${telemetry.vin} at ${telemetry.timestamp}`);

            return JSON.stringify({ 
                success: true, 
                key: key,
                vin: telemetry.vin,
                timestamp: telemetry.timestamp,
                txId: telemetry.txId
            });

        } catch (error) {
            console.error(`Error storing telemetry: ${error.message}`);
            throw new Error(`Failed to store telemetry: ${error.message}`);
        }
    }

    /**
     * Get the latest telemetry record for a vehicle (optimized)
     * @param {Context} ctx - Transaction context
     * @param {string} vin - Vehicle Identification Number
     * @returns {string} JSON string of latest telemetry data
     */
    async getLatestTelemetry(ctx, vin) {
        try {
            // Validate input
            if (!vin || typeof vin !== 'string') {
                throw new Error('Valid VIN is required');
            }

            // Try to get from optimized latest key first
            const latestKey = `latest_${vin}`;
            const latestData = await ctx.stub.getState(latestKey);

            if (latestData && latestData.length > 0) {
                const telemetry = JSON.parse(latestData.toString());
                console.info(`Retrieved latest telemetry for VIN: ${vin}`);
                
                return JSON.stringify({
                    success: true,
                    data: telemetry
                });
            }

            // Fallback: Search through all records (slower)
            console.warn(`Latest key not found for VIN: ${vin}, searching all records...`);
            
            const iterator = await ctx.stub.getStateByPartialCompositeKey(
                'telemetry', [vin]
            );

            let latest = null;
            
            try {
                let result = await iterator.next();

                while (!result.done) {
                    try {
                        const telemetry = JSON.parse(result.value.value.toString());
                        
                        if (!latest || new Date(telemetry.timestamp) > new Date(latest.timestamp)) {
                            latest = telemetry;
                        }
                    } catch (parseError) {
                        console.error(`Error parsing telemetry record: ${parseError.message}`);
                    }
                    
                    result = await iterator.next();
                }

                if (latest) {
                    // Cache it for future queries
                    await ctx.stub.putState(latestKey, Buffer.from(JSON.stringify(latest)));
                }

            } finally {
                await iterator.close();
            }

            console.info(`Retrieved latest telemetry for VIN: ${vin} (${latest ? 'found' : 'not found'})`);

            return JSON.stringify({
                success: true,
                data: latest || null,
                message: latest ? 'Latest telemetry found' : 'No telemetry data found for this VIN'
            });

        } catch (error) {
            console.error(`Error getting latest telemetry: ${error.message}`);
            throw new Error(`Failed to get latest telemetry: ${error.message}`);
        }
    }

    /**
     * Get telemetry history for a vehicle with pagination
     * @param {Context} ctx - Transaction context
     * @param {string} vin - Vehicle Identification Number
     * @param {string} limitStr - Maximum number of records to return (default: 100, max: 1000)
     * @returns {string} JSON array of telemetry records
     */
    async getTelemetryHistory(ctx, vin, limitStr = '100') {
        try {
            // Validate VIN
            if (!vin || typeof vin !== 'string') {
                throw new Error('Valid VIN is required');
            }

            // Validate and parse limit
            const limit = parseInt(limitStr);
            if (isNaN(limit) || limit < 1) {
                throw new Error('Limit must be a positive number');
            }

            const maxLimit = 1000;
            if (limit > maxLimit) {
                throw new Error(`Limit cannot exceed ${maxLimit} records`);
            }

            const iterator = await ctx.stub.getStateByPartialCompositeKey(
                'telemetry', [vin]
            );

            const history = [];

            try {
                let result = await iterator.next();

                while (!result.done && history.length < limit) {
                    try {
                        const telemetry = JSON.parse(result.value.value.toString());
                        history.push(telemetry);
                    } catch (parseError) {
                        console.error(`Error parsing telemetry record: ${parseError.message}`);
                    }
                    
                    result = await iterator.next();
                }

            } finally {
                await iterator.close();
            }

            // Sort by timestamp descending (newest first)
            history.sort((a, b) => {
                return new Date(b.timestamp) - new Date(a.timestamp);
            });

            console.info(`Retrieved ${history.length} telemetry records for VIN: ${vin}`);

            return JSON.stringify({
                success: true,
                data: history,
                count: history.length,
                vin: vin,
                limit: limit
            });

        } catch (error) {
            console.error(`Error getting telemetry history: ${error.message}`);
            throw new Error(`Failed to get telemetry history: ${error.message}`);
        }
    }

    /**
     * Get all telemetry data (with hard limit to prevent memory issues)
     * Use with caution - for exports and batch processing only
     * @param {Context} ctx - Transaction context
     * @param {string} limitStr - Maximum number of records (default: 1000, max: 10000)
     * @returns {string} JSON array of all telemetry records
     */
    async getAllTelemetry(ctx, limitStr = '1000') {
        try {
            // Validate and parse limit
            const limit = parseInt(limitStr);
            if (isNaN(limit) || limit < 1) {
                throw new Error('Limit must be a positive number');
            }

            const maxLimit = 10000; // Hard cap to prevent memory issues
            const actualLimit = Math.min(limit, maxLimit);

            if (limit > maxLimit) {
                console.warn(`Requested limit ${limit} exceeds maximum ${maxLimit}, using ${maxLimit}`);
            }

            const iterator = await ctx.stub.getStateByPartialCompositeKey(
                'telemetry', []
            );

            const all = [];

            try {
                let result = await iterator.next();

                while (!result.done && all.length < actualLimit) {
                    try {
                        const telemetry = JSON.parse(result.value.value.toString());
                        all.push(telemetry);
                    } catch (parseError) {
                        console.error(`Error parsing telemetry record: ${parseError.message}`);
                    }
                    
                    result = await iterator.next();
                }

                // Check if there are more records
                const hasMore = !result.done;

            } finally {
                await iterator.close();
            }

            console.info(`Retrieved ${all.length} telemetry records (limit: ${actualLimit})`);

            return JSON.stringify({
                success: true,
                data: all,
                count: all.length,
                limit: actualLimit,
                note: all.length === actualLimit ? 'Result may be truncated. Use pagination for complete data.' : null
            });

        } catch (error) {
            console.error(`Error getting all telemetry: ${error.message}`);
            throw new Error(`Failed to get all telemetry: ${error.message}`);
        }
    }

    /**
     * Delete telemetry data for a vehicle (for GDPR compliance)
     * @param {Context} ctx - Transaction context
     * @param {string} vin - Vehicle Identification Number
     * @returns {string} JSON result with deletion count
     */
    async deleteTelemetry(ctx, vin) {
        try {
            // Validate VIN
            if (!vin || typeof vin !== 'string') {
                throw new Error('Valid VIN is required');
            }

            // Get client identity for access control
            const clientID = ctx.clientIdentity.getID();
            console.info(`Client ${clientID} requesting deletion of telemetry for VIN: ${vin}`);

            const iterator = await ctx.stub.getStateByPartialCompositeKey(
                'telemetry', [vin]
            );

            let deleteCount = 0;
            const deletedKeys = [];

            try {
                let result = await iterator.next();

                while (!result.done) {
                    await ctx.stub.deleteState(result.value.key);
                    deletedKeys.push(result.value.key);
                    deleteCount++;
                    result = await iterator.next();
                }

                // Also delete the latest key
                const latestKey = `latest_${vin}`;
                await ctx.stub.deleteState(latestKey);

            } finally {
                await iterator.close();
            }

            // Emit deletion event
            const eventPayload = {
                vin: vin,
                deleteCount: deleteCount,
                deletedBy: clientID,
                deletedAt: new Date().toISOString()
            };
            ctx.stub.setEvent('TelemetryDeleted', Buffer.from(JSON.stringify(eventPayload)));

            console.info(`Deleted ${deleteCount} telemetry records for VIN: ${vin}`);

            return JSON.stringify({
                success: true,
                vin: vin,
                deletedRecords: deleteCount,
                message: `Successfully deleted ${deleteCount} telemetry records`
            });

        } catch (error) {
            console.error(`Error deleting telemetry: ${error.message}`);
            throw new Error(`Failed to delete telemetry: ${error.message}`);
        }
    }

    /**
     * Query telemetry by date range
     * @param {Context} ctx - Transaction context
     * @param {string} vin - Vehicle Identification Number
     * @param {string} startDate - Start date (ISO format)
     * @param {string} endDate - End date (ISO format)
     * @returns {string} JSON array of telemetry records in date range
     */
    async getTelemetryByDateRange(ctx, vin, startDate, endDate) {
        try {
            // Validate inputs
            if (!vin) throw new Error('VIN is required');
            if (!startDate) throw new Error('Start date is required');
            if (!endDate) throw new Error('End date is required');

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime())) throw new Error('Invalid start date');
            if (isNaN(end.getTime())) throw new Error('Invalid end date');
            if (start > end) throw new Error('Start date must be before end date');

            const iterator = await ctx.stub.getStateByPartialCompositeKey(
                'telemetry', [vin]
            );

            const results = [];

            try {
                let result = await iterator.next();

                while (!result.done) {
                    try {
                        const telemetry = JSON.parse(result.value.value.toString());
                        const telemetryDate = new Date(telemetry.timestamp);

                        if (telemetryDate >= start && telemetryDate <= end) {
                            results.push(telemetry);
                        }
                    } catch (parseError) {
                        console.error(`Error parsing telemetry: ${parseError.message}`);
                    }

                    result = await iterator.next();
                }

            } finally {
                await iterator.close();
            }

            console.info(`Found ${results.length} records for VIN: ${vin} between ${startDate} and ${endDate}`);

            return JSON.stringify({
                success: true,
                data: results,
                count: results.length,
                vin: vin,
                dateRange: { start: startDate, end: endDate }
            });

        } catch (error) {
            console.error(`Error querying by date range: ${error.message}`);
            throw new Error(`Failed to query by date range: ${error.message}`);
        }
    }
}

module.exports = VehicleChaincode;
