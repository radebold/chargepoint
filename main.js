'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios');

class Chargepoint extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'chargepoint' });
        this.pollInterval = null;
    }

    async onReady() {
        try {
            const intervalMinutes = this.config.interval || 10;
            const intervalMs = intervalMinutes * 60 * 1000;

            this.log.info(`ChargePoint Adapter gestartet – Intervall: ${intervalMinutes} Minuten`);

            // Initialer Poll
            await this.poll();

            // Wiederkehrender Poll
            this.pollInterval = setInterval(() => {
                this.poll().catch(err => this.log.error(`Poll Fehler: ${err}`));
            }, intervalMs);

            // Verbindung auf "verbunden" setzen, wenn mindestens eine Station konfiguriert ist
            const stations = this.config.stationsList || [];
            const anyActive = stations.some(s => s && s.active);
            await this.setStateAsync('info.connection', { val: anyActive, ack: true });

        } catch (err) {
            this.log.error(`onReady Fehler: ${err}`);
        }
    }

    async poll() {
        const stations = this.config.stationsList || [];

        if (!Array.isArray(stations) || stations.length === 0) {
            this.log.warn('Keine Stationen konfiguriert');
            await this.setStateAsync('info.connection', { val: false, ack: true });
            return;
        }

        let anySuccess = false;

        for (const s of stations) {
            if (!s || !s.active) continue;
            if (!s.id) {
                this.log.warn(`Station ohne ID übersprungen (Name: ${s.name || 'unbekannt'})`);
                continue;
            }

            const url = `https://mc.chargepoint.com/map-prod/v3/station/info?deviceId=${encodeURIComponent(s.id)}`;

            try {
                this.log.debug(`Rufe Station ${s.id} (${s.name || ''}) ab: ${url}`);
                const response = await axios.get(url, { timeout: 15000 });
                const data = response.data;
                const base = `stations.${s.id}`;

                await this.setObjectNotExistsAsync(base, {
                    type: 'channel',
                    common: { name: s.name || s.id },
                    native: {}
                });

                // Rohdaten
                await this.setObjectNotExistsAsync(`${base}.raw`, {
                    type: 'state',
                    common: {
                        name: 'Rohdaten',
                        type: 'string',
                        role: 'json',
                        read: true,
                        write: false
                    },
                    native: {}
                });
                await this.setStateAsync(`${base}.raw`, { val: JSON.stringify(data), ack: true });

                const body = data && data.body ? data.body : {};

                // Status
                await this.setObjectNotExistsAsync(`${base}.status`, {
                    type: 'state',
                    common: {
                        name: 'Status',
                        type: 'string',
                        role: 'value',
                        read: true,
                        write: false
                    },
                    native: {}
                });
                await this.setStateAsync(`${base}.status`, { val: body.status || '', ack: true });

                // Level Name
                await this.setObjectNotExistsAsync(`${base}.levelName`, {
                    type: 'state',
                    common: {
                        name: 'Level name',
                        type: 'string',
                        role: 'value',
                        read: true,
                        write: false
                    },
                    native: {}
                });
                await this.setStateAsync(`${base}.levelName`, { val: body.levelName || '', ack: true });

                anySuccess = True;
                this.log.info(`Station ${s.id} (${s.name || ''}) erfolgreich abgefragt`);
            } catch (err) {
                this.log.error(`Fehler bei Station ${s && s.id ? s.id : 'unbekannt'}: ${err}`);
            }
        }

        await this.setStateAsync('info.connection', { val: anySuccess, ack: true });
    }

    onUnload(callback) {
        try {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
            this.log.info('ChargePoint Adapter gestoppt');
            callback();
        } catch (e) {
            callback();
        }
    }
}

module.exports = (options) => new Chargepoint(options);
