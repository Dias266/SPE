const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors());

const AGENT_URLS = [
    'http://192.168.178.34:3272/agent-mind/vehicle_agent1/latest',
    'http://192.168.178.34:3272/agent-mind/vehicle_agent2/latest',
    'http://192.168.178.34:3272/agent-mind/vehicle_agent3/latest',
    'http://192.168.178.34:3272/agent-mind/service_center_agent/latest',
    'http://192.168.178.34:3272/agent-mind/fleet_coordinator_agent/latest'
];

app.get('/api/fleet', async (req, res) => {
    try {
        const responses = await Promise.all(AGENT_URLS.map(url => axios.get(url).catch(() => ({ data: '' }))));
        const parsedData = responses.map((r, i) => {
            const html = r.data || '';
            const extract = (pattern) => html.match(pattern)?.[1] || 'N/A';
            


            // Inside your parsedData map:
            // Replace your Fleet Coordinator logic (i === 4) with this:
            if (i === 4) { // Fleet Coordinator Logic
                const html = r.data || '';
                
                // Count anomalies
                const oilAlerts = (html.match(/anomaly_detected\(vehicle_agent\d+,oil_pressure/g) || []).length;
                const brakeAlerts = (html.match(/anomaly_detected\(vehicle_agent\d+,brake_wear/g) || []).length;
                
                // Attempt to match 'fleet_size(X)' or a generic fallback
                const fleetMatch = html.match(/fleet_size\((\d+)/);
                const fleetSize = fleetMatch ? fleetMatch[1] : '8'; // Default to 8 if not found
                
                return {
                    agent: "Fleet Coordinator",
                    oilAnomalies: oilAlerts,
                    brakeAnomalies: brakeAlerts,
                    totalRegistered: (html.match(/vehicle_registered/g) || []).length,
                    fleetSize: fleetSize
                };
            }
            // Replace your Service Center parsing logic (i === 3) with this:
            if (i === 3) {
                // Helper to strip <i> or <span> tags and get the inner value
                const clean = (val) => val ? val.replace(/<[^>]*>/g, '').trim() : '0';

                return {
                    agent: "Service Center",
                    // This regex looks for the pattern and captures the content inside the parentheses
                    // It accounts for potential tags like <i>
                    records: clean(html.match(/record_counter\((.*?)\)/)?.[1]),
                    oil: clean(html.match(/parts_inventory\(oil_filter,(.*?)\)/)?.[1]),
                    brake: clean(html.match(/parts_inventory\(brake_pad,(.*?)\)/)?.[1]),
                    overloaded: extract(/is_overloaded\((.*?)\)/)
                };
            }
            // Vehicle Logic
            return {
                agent: `Vehicle ${i + 1}`,
                vin: extract(/vin\(<span style="color: rgb\(0, 0, 250\)">"(.*?)"<\/span>\)/),
                mileage: extract(/mileage\((.*?)\)/).replace(/<i>|<\/i>/g, ''),
                temp: extract(/current_temperature\((.*?)\)/).replace(/<i>|<\/i>/g, ''),
                status: extract(/engine_status\((.*?)\)/),
                urgency: extract(/urgency_level\((.*?)\)/).toUpperCase()
            };
        });
        res.json(parsedData);
    } catch (e) { res.status(500).send(e.message); }
});

app.listen(3000, () => console.log('Proxy active on port 3000'));