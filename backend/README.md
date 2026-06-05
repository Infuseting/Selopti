# Selopti Price Tracker API (Flask + SQLite)

## Start

1. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

2. Run the API (port 3000 to match the extension config):

```bash
python backend/app.py
```

The SQLite database file is created automatically at `backend/selopti.db`.

## Data Model

- `bien`
  - `id` (TEXT, PK): property id
  - `geo_location` (TEXT)
  - `publication_date` (TEXT)
  - `source_url` (TEXT)
  - `created_at` (TEXT)
  - `updated_at` (TEXT)

- `price`
  - `id` (INTEGER, PK AUTOINCREMENT)
  - `bien_id` (TEXT, FK -> `bien.id`)
  - `price` (INTEGER)
  - `recorded_at` (TEXT)

## Main Endpoint

### `POST /api/prices/track`

Request body:

```json
{
  "propertyId": "123456789",
  "url": "https://www.seloger.com/annonces/achat/appartement/rouen-76/123456789.htm",
  "price": 199000,
  "geoLocation": "49.4432,1.0993",
  "publicationDate": "2026-06-05"
}
```

Behavior:

- Creates/updates `bien`.
- Inserts a new row in `price` only if the latest stored price differs from the incoming price.
- Returns history formatted for the chart.

Response body:

```json
{
  "propertyId": "123456789",
  "inserted": true,
  "history": [
    { "id": 1, "price": 199000, "capturedAt": "2026-06-05 12:10:00" }
  ],
  "lastChange": null
}
```

## Extra Endpoint

- `GET /api/properties/<propertyId>/prices`
  - Returns the same history format without creating a new point.
