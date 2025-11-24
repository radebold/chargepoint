'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios');

class Chargepoint extends utils.Adapter {

    constructor(options) {
        super({
            ...options,
            name: 'chargepoint',
        });

        this.pollTimer = null;
        this.stations = [];

        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        try {
            this.log.info('ChargePoint adapter starting...');

            const cfg = this.config || {};
            this.stations = Array.isArray(cfg.stations) ? cfg.stations.filter(s => s && s.id) : [];
            const pollIntervalMin = Number(cfg.pollInterval || 5);
            this.debugEnabled = !!cfg.debug;

            if (!this.stations.length) {
                this.log.warn('No stations configured. Open the adapter settings and add at least one station.');
                return;
            }

            this.log.info('Configured stations: ' + this.stations.map(s => `${s.id} (${s.name || 'no name'})`).join(', '));
            this.log.info('Polling interval: ' + pollIntervalMin + ' minute(s)');

            await this.updateAllStations();

            this.pollTimer = this.setInterval(
                () => this.updateAllStations().catch(err => this.log.error('updateAllStations error: ' + err)),
                pollIntervalMin * 60 * 1000
            );
        } catch (err) {
            this.log.error('onReady error: ' + err);
        }
    }

    onUnload(callback) {
        try {
            if (this.pollTimer) {
                this.clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
            callback();
        } catch (e) {
            callback();
        }
    }

    async updateAllStations() {
        if (!this.stations || !this.stations.length) return;

        for (const station of this.stations) {
            try {
                await this.updateStation(station);
            } catch (err) {
                this.log.error(`Error updating station ${station.id} (${station.name || ''}): ${err}`);
            }
        }
    }

    async updateStation(station) {
        const id = station.id;
        const name = station.name || id;
        const url = `https://mc.chargepoint.com/map-prod/v3/station/info?deviceId=${encodeURIComponent(id)}`;

        if (this.debugEnabled) {
            this.log.debug(`Requesting ChargePoint API: ${url}`);
        }

        const res = await axios.get(url, { timeout: 15000 });
        const data = res.data;

        const base = id.toString();

        await this.setObjectNotExistsAsync(base, {
            type: 'channel',
            common: { name },
            native: {}
        });

        await this.setObjectNotExistsAsync(`${base}.raw`, {
            type: 'state',
            common: {
                name: `${name} raw JSON`,
                type: 'string',
                role: 'json',
                read: true,
                write: false
            },
            native: {}
        });
        await this.setStateAsync(`${base}.raw`, { val: JSON.stringify(data), ack: true });

        const status = data.status || data.stationStatus || 'unknown';
        const stationName = data.stationName || name;

        const address = data.address || {};
        const addressStr = address.address1 || address.street || '';
        const city = address.city || '';
        const country = address.country || '';

        const lat = data.latitude != null ? Number(data.latitude) : (data.location && data.location.lat != null ? Number(data.location.lat) : null);
        const lon = data.longitude != null ? Number(data.longitude) : (data.location && data.location.lng != null ? Number(data.location.lng) : null);

        const ports = Array.isArray(data.ports) ? data.ports : (Array.isArray(data.port) ? data.port : []);

        await this.ensureState(`${base}.info.name`, `${stationName}`, 'string', 'text');
        await this.setStateAck(`${base}.info.name`, stationName);

        await this.ensureState(`${base}.info.status`, `${stationName} status`, 'string', 'value');
        await this.setStateAck(`${base}.info.status`, status);

        await this.ensureState(`${base}.info.address`, `${stationName} address`, 'string', 'text');
        const addrFull = `${addressStr}, ${city}, ${country}`.replace(/^[,\s]+|[,\s]+$/g, '');
        await this.setStateAck(`${base}.info.address`, addrFull);

        await this.ensureState(`${base}.location.latitude`, `${stationName} latitude`, 'number', 'value.gps.latitude');
        if (lat != null && !Number.isNaN(lat)) {
            await this.setStateAck(`${base}.location.latitude`, lat);
        }

        await this.ensureState(`${base}.location.longitude`, `${stationName} longitude`, 'number', 'value.gps.longitude');
        if (lon != null && !Number.isNaN(lon)) {
            await this.setStateAck(`${base}.location.longitude`, lon);
        }

        if (ports.length) {
            for (let i = 0; i < ports.length; i++) {
                const p = ports[i];
                const idx = i + 1;
                const pBase = `${base}.ports.${idx}`;

                const pStatus = p.status || p.portStatus || 'unknown';
                const pName = p.name || p.portName || `Port ${idx}`;

                await this.ensureState(`${pBase}.name`, `${stationName} port ${idx} name`, 'string', 'text');
                await this.setStateAck(`${pBase}.name`, pName);

                await this.ensureState(`${pBase}.status`, `${stationName} port ${idx} status`, 'string', 'value');
                await this.setStateAck(`${pBase}.status`, pStatus);
            }

            await this.ensureState(`${base}.info.portCount`, `${stationName} port count`, 'number', 'value');
            await this.setStateAck(`${base}.info.portCount`, ports.length);
        }

        await this.ensureState(`${base}.info.lastUpdate`, `${stationName} last update`, 'string', 'date');
        await this.setStateAck(`${base}.info.lastUpdate`, new Date().toISOString());

        this.log.info(`Updated ChargePoint station ${id} (${stationName}) – status: ${status}`);
    }

    async ensureState(id, name, type, role) {
        await this.setObjectNotExistsAsync(id, {
            type: 'state',
            common: {
                name,
                type,
                role,
                read: true,
                write: false
            },
            native: {}
        });
    }

    async setStateAck(id, val) {
        await this.setStateAsync(id, { val, ack: true });
    }
}

if (module.parent) {
    module.exports = (options) => new Chargepoint(options);
} else {
    new Chargepoint();
}