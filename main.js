const utils = require('@iobroker/adapter-core');
const axios = require('axios');

class Chargepoint extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'chargepoint' });
        this.pollInterval = null;

        this.log.silly('Adapter constructor ausgeführt.');

        process.on('uncaughtException', err => {
            this.log.error('UNCAUGHT EXCEPTION: ' + err.stack);
        });
        process.on('unhandledRejection', err => {
            this.log.error('UNHANDLED REJECTION: ' + err);
        });
    }

    async onReady() {
        this.log.info('ChargePoint Adapter 0.0.7 gestartet');

        const intervalMinutes = Number(this.config.interval) || 10;
        const intervalMs = intervalMinutes * 60000;

        this.log.debug('Config: ' + JSON.stringify(this.config));

        await this.setStateAsync('info.connection', { val: false, ack: true });

        await this.poll();

        this.pollInterval = setInterval(() => {
            this.poll().catch(e => this.log.error('Poll error: ' + e));
        }, intervalMs);
    }

    async poll() {
        this.log.silly('poll() gestartet');

        const stations = Array.isArray(this.config.stationsList) ? this.config.stationsList : [];
        if (!stations.length) {
            this.log.warn('Keine Stationen in der Config.');
            return;
        }

        let ok = false;

        for (const s of stations) {
            if (!s.active) continue;

            const url = `https://mc.chargepoint.com/map-prod/v3/station/info?deviceId=${encodeURIComponent(s.id)}`;
            this.log.info('Hole Daten von: ' + url);

            try {
                const res = await axios.get(url, { timeout: 15000 });
                const base = `stations.${s.id}`;

                await this.setObjectNotExistsAsync(base, { type: "channel", common: { name: s.name }, native: {} });

                await this.setObjectNotExistsAsync(`${base}.raw`, {
                    type: "state",
                    common: { type: "string", read: true, write: false, role: "json" },
                    native: {}
                });

                await this.setStateAsync(`${base}.raw`, { val: JSON.stringify(res.data), ack: true });

                ok = true;

            } catch (e) {
                this.log.error('Fehler bei Abfrage: ' + e);
            }
        }

        await this.setStateAsync('info.connection', { val: ok, ack: true });
    }

    onUnload(cb) {
        if (this.pollInterval) clearInterval(this.pollInterval);
        cb();
    }
}

module.exports = o => new Chargepoint(o);
