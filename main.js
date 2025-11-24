const utils = require('@iobroker/adapter-core');
const axios = require('axios');

class Chargepoint extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'chargepoint' });
        this.pollInterval = null;
    }

    async onReady() {
        const intervalMs = (this.config.interval || 10) * 60 * 1000;
        this.log.info(`Intervall: ${intervalMs/60000} Minuten`);
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), intervalMs);
    }

    async poll() {
        const stations = this.config.stationsList || [];
        for (const s of stations) {
            if (!s.active) continue;
            const url = `https://mc.chargepoint.com/map-prod/v3/station/info?deviceId=${s.id}`;
            try {
                const response = await axios.get(url);
                const data = response.data;
                const base = `stations.${s.id}`;

                await this.setObjectNotExistsAsync(base, { type:'channel', common:{name:s.name}, native:{} });
                await this.setStateAsync(`${base}.raw`, { val: JSON.stringify(data), ack: true });

                const body = data?.body || {};
                await this.setStateAsync(`${base}.status`, { val: body.status || "", ack: true });
                await this.setStateAsync(`${base}.levelName`, { val: body.levelName || "", ack: true });

            } catch (e) {
                this.log.error(`Fehler bei ${s.id}: ${e}`);
            }
        }
    }

    onUnload(cb) { try { if (this.pollInterval) clearInterval(this.pollInterval); cb(); } catch(e){ cb(); } }
}

module.exports = (o) => new Chargepoint(o);
