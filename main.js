const utils = require('@iobroker/adapter-core');
const axios = require('axios');

class Chargepoint extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'chargepoint' });
        this.pollInterval = null;
    }

    async onReady() {
        this.log.info('ChargePoint Adapter 0.0.8 gestartet');
        const interval = Number(this.config.interval) || 10;
        await this.setStateAsync('info.connection', { val: false, ack: true });
        await this.poll();
        this.pollInterval = setInterval(() => this.poll(), interval * 60000);
    }

    async poll() {
        const stations = Array.isArray(this.config.stationsList) ? this.config.stationsList : [];
        if (!stations.length) {
            this.log.warn('Keine Stationen konfiguriert.');
            return;
        }
        let any = false;
        for (const s of stations) {
            if (!s.active) continue;
            try {
                const url = `https://mc.chargepoint.com/map-prod/v3/station/info?deviceId=${s.id}`;
                const res = await axios.get(url);
                const base = `stations.${s.id}`;
                await this.setObjectNotExistsAsync(base, {type:"channel",common:{name:s.name},native:{}});
                await this.setObjectNotExistsAsync(`${base}.raw`, {
                    type:"state",
                    common:{type:"string",role:"json",read:true,write:false},
                    native:{}
                });
                await this.setStateAsync(`${base}.raw`, {val: JSON.stringify(res.data), ack:true});
                any = true;
            } catch(e) {
                this.log.error("Fehler: " + e);
            }
        }
        await this.setStateAsync('info.connection', { val: any, ack: true });
    }

    onUnload(cb) {
        if (this.pollInterval) clearInterval(this.pollInterval);
        cb();
    }
}

module.exports = o => new Chargepoint(o);
