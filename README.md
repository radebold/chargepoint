# ioBroker.chargepoint

Ein ioBroker-Adapter zum Abfragen von ChargePoint-Ladestationen.

## Features
- Konfiguration mehrerer Ladestationen (Name, ID, Aktiv)
- Abrufintervall einstellbar (Standard: 10 Minuten)
- Speichert Rohdaten sowie ausgewählte Datenpunkte (Status, LevelName)
- JSON-Config im Admin

## Installation (manuell)
1. ZIP-Datei in ein Verzeichnis entpacken
2. Repository zu GitHub pushen **oder**
3. Im ioBroker Admin unter **Adapter → Eigene → ZIP hochladen** installieren

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
