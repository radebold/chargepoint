# ioBroker.chargepoint

Custom adapter to read status information from ChargePoint charging stations via their public map API.

## Configuration

The adapter uses a JSON config UI:

- **Charging stations**: table with columns:
  - `Device ID` – the ChargePoint `deviceId` (e.g. `1009327405`)
  - `Name` – friendly name (e.g. `Buenzwangen Sporthalle`)

- **Polling interval (minutes)**: how often the adapter polls the API.
- **Enable debug logging**: if enabled, request URLs and some details are logged on debug level.

## States

For each configured deviceId `<id>` the adapter creates:

- `<id>.raw` – raw JSON from API as string
- `<id>.info.name`
- `<id>.info.status`
- `<id>.info.address`
- `<id>.info.portCount`
- `<id>.info.lastUpdate`
- `<id>.location.latitude`
- `<id>.location.longitude`
- `<id>.ports.<n>.name`
- `<id>.ports.<n>.status`