# ioBroker.chargepoint

Ein ioBroker-Adapter zum Abfragen von ChargePoint-Ladestationen.

## Features
- Konfiguration mehrerer Ladestationen (Name, ID, Aktiv)
- Abrufintervall einstellbar (Standard: 10 Minuten)
- Speichert Rohdaten sowie ausgewählte Datenpunkte
- Vollständig JSON-Config-kompatibel

## Installation
Lade die ZIP-Datei des Adapters herunter und installiere ihn im ioBroker Admin unter:
**Adapter → Eigene → ZIP hochladen**

## Konfiguration
In der Adapter-Instanz kannst du festlegen:

### Ladestationen
| Name | ID | Aktiv |
|------|----|-------|

### Abrufintervall
Zeit in Minuten zwischen den API‑Abfragen.

## API
Die Abfragen erfolgen über:
```
https://mc.chargepoint.com/map-prod/v3/station/info?deviceId=STATION_ID
```
