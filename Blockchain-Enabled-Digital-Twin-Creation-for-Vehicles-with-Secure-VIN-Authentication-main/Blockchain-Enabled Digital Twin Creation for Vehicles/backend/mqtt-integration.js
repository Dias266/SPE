// mqtt-integration.js - MQTT Protocol Integration for IoT Telemetry

const mqtt = require('mqtt');
const EventEmitter = require('events');

/**
 * MQTTIntegration - Handles MQTT communication for IoT device telemetry
 * Supports publish/subscribe pattern for vehicle sensors, pet trackers, and IoT devices
 */
class MQTTIntegration extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.client = null;
        this.connected = false;
        this.subscribers = new Map(); // topic -> array of handlers
        this.messageQueue = []; // Queue messages when disconnected
        
        // Configuration
        this.config = {
            reconnectPeriod: options.reconnectPeriod || 5000,
            connectTimeout: options.connectTimeout || 30000,
            keepalive: options.keepalive || 60,
            clean: options.clean !== undefined ? options.clean : true,
            qos: options.qos || 1, // 0: At most once, 1: At least once, 2: Exactly once
            retain: options.retain || false
        };
        
        // Statistics
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnections: 0,
            errors: 0,
            startTime: Date.now()
        };
    }

    /**
     * Connect to MQTT broker
     * @param {string} brokerUrl - MQTT broker URL (e.g., mqtt://localhost:1883)
     * @param {object} options - Additional MQTT options
     */
    connect(brokerUrl = 'mqtt://localhost:1883', options = {}) {
        console.log(`🔌 Connecting to MQTT broker: ${brokerUrl}`);
        
        try {
            this.client = mqtt.connect(brokerUrl, {
                ...this.config,
                ...options
            });

            // Connection established
            this.client.on('connect', () => {
                this.connected = true;
                console.log('MQTT Connected successfully');
                this.emit('connected');
                
                // Resubscribe to all topics after reconnection
                if (this.subscribers.size > 0) {
                    console.log(`Resubscribing to ${this.subscribers.size} topics...`);
                    for (const topic of this.subscribers.keys()) {
                        this.client.subscribe(topic, { qos: this.config.qos });
                    }
                }
                
                // Send queued messages
                this.processMessageQueue();
            });

            // Connection error
            this.client.on('error', (error) => {
                this.stats.errors++;
                console.error('MQTT Connection Error:', error.message);
                this.emit('error', error);
            });

            // Reconnection attempt
            this.client.on('reconnect', () => {
                this.stats.reconnections++;
                console.log('MQTT Reconnecting...');
                this.emit('reconnecting');
            });

            // Connection closed
            this.client.on('close', () => {
                this.connected = false;
                console.log('MQTT Connection closed');
                this.emit('disconnected');
            });

            // Offline
            this.client.on('offline', () => {
                this.connected = false;
                console.log('MQTT Client offline');
                this.emit('offline');
            });

            // Message received
            this.client.on('message', (topic, message) => {
                this.stats.messagesReceived++;
                this.handleMessage(topic, message);
            });

            return this.client;

        } catch (error) {
            this.stats.errors++;
            console.error('Failed to connect to MQTT broker:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Handle incoming MQTT message
     * @param {string} topic - MQTT topic
     * @param {Buffer} message - Message payload
     */
    handleMessage(topic, message) {
        try {
            const messageStr = message.toString();
            console.log(`📨 Received message on topic '${topic}':`, messageStr);

            // Parse JSON if possible
            let parsedMessage;
            try {
                parsedMessage = JSON.parse(messageStr);
            } catch (e) {
                parsedMessage = messageStr; // Keep as string if not JSON
            }

            // Call all handlers for this topic
            const handlers = this.subscribers.get(topic) || [];
            handlers.forEach(handler => {
                try {
                    handler(parsedMessage, topic);
                } catch (error) {
                    console.error(`Error in message handler for topic '${topic}':`, error);
                }
            });

            // Also emit event for listeners
            this.emit('message', topic, parsedMessage);

        } catch (error) {
            this.stats.errors++;
            console.error('Error handling MQTT message:', error);
            this.emit('error', error);
        }
    }

    /**
     * Subscribe to MQTT topic
     * @param {string} topic - MQTT topic (supports wildcards: +, #)
     * @param {function} handler - Callback function (message, topic) => void
     * @param {object} options - Subscribe options
     */
    subscribe(topic, handler, options = {}) {
        if (!topic) {
            throw new Error('Topic is required for subscription');
        }

        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }

        // Add handler to subscribers map
        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, []);
        }
        this.subscribers.get(topic).push(handler);

        // Subscribe to topic if connected
        if (this.connected && this.client) {
            this.client.subscribe(topic, { 
                qos: options.qos || this.config.qos 
            }, (err) => {
                if (err) {
                    console.error(`Failed to subscribe to topic '${topic}':`, err);
                    this.emit('error', err);
                } else {
                    console.log(`Subscribed to topic: ${topic}`);
                }
            });
        }

        return this;
    }

    /**
     * Unsubscribe from MQTT topic
     * @param {string} topic - MQTT topic
     * @param {function} handler - Optional specific handler to remove
     */
    unsubscribe(topic, handler = null) {
        if (handler) {
            // Remove specific handler
            const handlers = this.subscribers.get(topic);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
                if (handlers.length === 0) {
                    this.subscribers.delete(topic);
                }
            }
        } else {
            // Remove all handlers for this topic
            this.subscribers.delete(topic);
        }

        // Unsubscribe from broker if no handlers remain
        if (!this.subscribers.has(topic) && this.connected && this.client) {
            this.client.unsubscribe(topic, (err) => {
                if (err) {
                    console.error(`Failed to unsubscribe from topic '${topic}':`, err);
                } else {
                    console.log(`Unsubscribed from topic: ${topic}`);
                }
            });
        }

        return this;
    }

    /**
     * Publish message to MQTT topic
     * @param {string} topic - MQTT topic
     * @param {any} message - Message to publish (will be stringified if object)
     * @param {object} options - Publish options
     */
    publish(topic, message, options = {}) {
        if (!topic) {
            throw new Error('Topic is required for publishing');
        }

        // Convert message to string if it's an object
        const messageStr = typeof message === 'object' ? JSON.stringify(message) : String(message);

        const publishOptions = {
            qos: options.qos || this.config.qos,
            retain: options.retain !== undefined ? options.retain : this.config.retain
        };

        if (this.connected && this.client) {
            this.client.publish(topic, messageStr, publishOptions, (err) => {
                if (err) {
                    console.error(`Failed to publish to topic '${topic}':`, err);
                    this.emit('error', err);
                } else {
                    this.stats.messagesSent++;
                    console.log(`Published to topic '${topic}':`, messageStr);
                    this.emit('published', topic, message);
                }
            });
        } else {
            // Queue message for later if not connected
            console.log(`Queuing message for topic '${topic}' (not connected)`);
            this.messageQueue.push({ topic, message: messageStr, options: publishOptions });
        }

        return this;
    }

    /**
     * Process queued messages after reconnection
     */
    processMessageQueue() {
        if (this.messageQueue.length === 0) return;

        console.log(`Processing ${this.messageQueue.length} queued messages...`);
        
        while (this.messageQueue.length > 0) {
            const { topic, message, options } = this.messageQueue.shift();
            this.client.publish(topic, message, options, (err) => {
                if (err) {
                    console.error(`Failed to send queued message to '${topic}':`, err);
                } else {
                    this.stats.messagesSent++;
                    console.log(`Sent queued message to '${topic}'`);
                }
            });
        }
    }

    /**
     * Disconnect from MQTT broker
     * @param {boolean} force - Force disconnect without waiting for in-flight messages
     */
    disconnect(force = false) {
        if (this.client) {
            console.log('Disconnecting from MQTT broker...');
            this.client.end(force, () => {
                this.connected = false;
                console.log('MQTT Disconnected');
                this.emit('disconnected');
            });
        }
    }

    /**
     * Get connection status
     * @returns {boolean} True if connected
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get statistics
     * @returns {object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            connected: this.connected,
            activeSubscriptions: this.subscribers.size,
            queuedMessages: this.messageQueue.length,
            uptime: Date.now() - this.stats.startTime
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnections: 0,
            errors: 0,
            startTime: Date.now()
        };
    }
}

// Export singleton instance
module.exports = MQTTIntegration;
