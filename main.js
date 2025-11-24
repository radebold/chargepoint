'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios');

class Chargepoint extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'chargepoint' });
        this.pollInterval = null;

        // Extra safety logs
        this.log.silly('Chargepoint constructor aufgerufen.');
        process.on('uncaughtException', err => {
            this.log.error('UNCAUGHT EXCEPTION: ' + err.stack);
        });
        process.on('unhandledRejection', reason => {
            this.log.error('UNHANDLED PROMISE REJECTION: ' + reason);
        });
    }

    async onReady() {
        this.log.info('ChargePoint Adapter 0.0.6 → onReady() gestartet');

        try {
            this.log.silly('Config (this.config): ' + JSON.stringify(this.config));

            const intervalMinutes = Number(this.config.interval) || 10;
            const intervalMs = intervalMinutes * 60 * 1000;

            this.log.info(`Abrufintervall: ${intervalMinutes} Minuten (${intervalMs} ms)`);

            await this.setStateAsync('info.connection', { val: false, ack: true });

            await this.poll();

            this.pollInterval = setInterval(() => {
                this.poll().catch(e => this.log.error('Fehler im Poll-Intervall: ' + e));
            }, intervalMs);

            this.log.info('Adapterbereit, Poll-Intervall aktiv.');
        } catch (e) {
            this.log.error('Fehler in onReady(): ' + (e.stack || e));
        }
    }

    async poll() {
        this.log.silly('poll() gestartet');

        const stations = Array.isArray(this.config.stationsList) ? this.config.stationsList : [];
        if (!stations.length) {
            this.log.warn('Keine Stationen in der Config hinterlegt oder Liste leer.');
            return;
        }

        this.log.debug('Stationsliste: ' + JSON.stringify(stations));

        let anySuccess = false;

        for (const s of stations) {
            if (!s || !s.active) {
                this.log.silly('Station übersprungen (inaktiv oder null).');
                continue;
            }
            if (!s.id) {
                this.log.warn('Station ohne ID übersprungen: ' + JSON.stringify(s));
                continue;
            }

            const url = `https://mc.chargepoint.com/map-prod/v3/station/info?deviceId=${encodeURIComponent(s.id)}`;
            this.log.info(`Abfrage Station ${s.name || s.id}: ${url}`);

            try {
                const res = await axios.get(url, { timeout: 15000 });
                const data = res.data;
                const base = `stations.${s.id}`;

                await this.setObjectNotExistsAsync(base, {
                    type: 'channel',
                    common: { name: s.name || s.id },
                    native: {}
                });

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

                // Optionale einfache Felder
                const body = data && data.body ? data.body : {};

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

                await this.setObjectNotExistsAsync(`${base}.levelName`, {
                    type: 'state',
                    common: {
                        name: 'Level Name',
                        type: 'string',
                        role: 'value',
                        read: true,
                        write: false
                    },
                    native: {}
                });
                await this.setStateAsync(`${base}.levelName`, { val: body.levelName || '', ack: true });

                anySuccess = true;
                this.log.info(`Station ${s.name || s.id} erfolgreich aktualisiert.`);
            } catch (e) {
                this.log.error(`Fehler bei Station ${s.id}: ` + (e.stack || e));
            }
        }

        await this.setStateAsync('info.connection', { val: anySuccess, ack: true });
        this.log.silly('poll() beendet, anySuccess=' + anySuccess);
    }

    onUnload(callback) {
        this.log.info('ChargePoint Adapter wird beendet...');
        try {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
                this.log.silly('Poll-Intervall gelöscht.');
            }
            callback();
        } catch (e) {
            this.log.error('Fehler in onUnload(): ' + (e.stack || e));
            callback();
        }
    }
}

module.exports = options => new Chargepoint(options);
