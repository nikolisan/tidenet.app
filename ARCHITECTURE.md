# System Architecture

Below is a high-level view of the stack, data paths, and where caching and static tide assets sit.

```mermaid
flowchart TD
    U[User Browser] -->|HTTPS| F["Frontend container<br/>Nginx serving Vite build"]
    F -->|REST /api| B["Backend container<br/>FastAPI + SQLAlchemy"]
    B -->|Async queries| DB[(PostgreSQL / RDS)]
    B -->|Cache lookups| R[(Redis 7.2)]
    B -->|Reads tidal coefficients & tables| T[("tide-data JSON files<br/>in app/tide-data/")]
    Scripts[["Ingestion scripts<br/>(fetch_historical.py, fetch_latest.py, etc.)"]] -->|Load tide gauge readings| DB
    EA["Environment Agency<br/>Real-time Data API"] --> Scripts
    CB["Certbot container"] -.-> F

    classDef external fill:#f2f2f2,stroke:#999,stroke-width:1px,color:#333;
    classDef data fill:#e7f0ff,stroke:#4a78c2,stroke-width:1px,color:#1d3e7a;
    classDef cache fill:#fff3e0,stroke:#d9822b,stroke-width:1px,color:#8a4b00;
    classDef service fill:#ecfdf3,stroke:#34a853,stroke-width:1px,color:#1b5e20;

    class U external;
    class EA external;
    class F service;
    class B service;
    class DB data;
    class T data;
    class R cache;
    class Scripts service;
    class CB external;
```

## Notes
- Frontend builds with Vite and is served by Nginx in the `frontend` container; dev mode uses the Vite dev server (see `docker-compose.dev.yml`).
- Backend is FastAPI with async SQLAlchemy. DB connection string comes from `DATABASE_URL_SQLALCHEMY` (often an external Postgres/RDS instance). 
- Redis provides caching for station lists and per-station readings; TTL is controlled via `CACHE_TIME_LIMIT`.
- Static tidal assets (coefficients and tables) live under `app/tide-data/` and are read at request time.
- Ingestion scripts under `scripts/` pull Environment Agency tide gauge data and write into Postgres.
- Certbot sidecar shares volumes with the frontend container to manage TLS certificates for Nginx.
