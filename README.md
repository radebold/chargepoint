# ioBroker.chargepoint

Ein ioBroker-Adapter zum Abfragen von ChargePoint-Ladestationen.

## Features
- Konfiguration mehrerer Ladestationen (Name, ID, Aktiv)
- Abrufintervall einstellbar (Standard: 10 Minuten)
- Speichert Rohdaten sowie ausgewählte Datenpunkte (Status, LevelName)
- JSON-Config im Admin

## Installation über ZIP
1. Diese ZIP-Datei herunterladen.
2. Im ioBroker Admin unter **Adapter → Eigene Adapter → ... (drei Punkte) → aus Datei installieren** auswählen.
3. Die ZIP-Datei hochladen und installieren.
4. Eine Instanz von `chargepoint` anlegen und konfigurieren.

## Konfiguration
### Ladestationen
Du kannst eine Liste anlegen mit:
- `Name`
- `ID` (deviceId aus der ChargePoint-URL)
- `Aktiv` (abhaken, wenn diese Station abgefragt werden soll)

### Abrufintervall
Zeit in Minuten zwischen den API-Abfragen (Standard: 10).

## API
Die Abfragen erfolgen über:
```text
https://mc.chargepoint.com/map-prod/v3/station/info?deviceId=STATION_ID
```
