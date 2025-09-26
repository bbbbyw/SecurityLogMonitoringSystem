Security Log Monitoring System (GCP)

This project is a minimal SaaS-style security log ingestion and monitoring system on GCP:
- Ingest logs via Cloud Run API.
- Queue with Pub/Sub.
- Persist to BigQuery.
- Detect suspicious activity and alert via email/SMS.
- Visualize with Looker Studio.

See `deploy/README.md` for setup and deployment.

Project Structure

```
/security-log-monitoring
  ├── ingest-api/               # Cloud Run service (Node.js + Express)
  ├── functions/
  │    ├── pubsubToBigQuery/    # Cloud Function: writes logs to BigQuery
  │    └── checkAndAlert/       # Cloud Function: detection + alert
  ├── bigquery/
  │    └── schema.json          # Schema for logs table
  ├── generator/
  │    └── generator.py         # Fake login events
  └── deploy/                   # Setup & deployment
```

Local Smoke Test

1) Start API locally:
   - In one terminal: `cd ingest-api && npm install && npm run dev`
2) Send test events:
   - In another terminal: `python generator/generator.py` (set `API_URL` if needed)

Deploy on GCP

Follow `deploy/README.md` and run `./deploy/setup.sh <region>`.


