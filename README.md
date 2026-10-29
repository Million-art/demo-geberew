# GreenLink agricultural marketplace

A TypeScript marketplace demo connecting farmers requesting agricultural inputs with
verified suppliers. It includes a supplier dashboard, product and regional request
matching, farmer request intake, supplier listings, and a simulated pay-per-lead flow.

## Requirements

- Node.js 20.19 or newer
- npm

## Run locally

Start the API in one terminal:

```sh
cd backend
npm install
npm run start:dev
```

Start the frontend in another terminal:

```sh
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). The frontend
proxies `/api` requests to the NestJS server at `http://localhost:3000`.

The dashboard loads matched farmer requests and supplier catalog data from the API.
Use **Add farmer request** to record a request received by phone or USSD, and
**Unlock** to simulate paying for a lead and reveal its contact details.

## Deploy both apps as one service

The NestJS server serves the built Vite frontend from the same origin, so the
frontend can call `/api` without a separate production proxy. The repository
includes a Render Blueprint in `render.yaml` for a single free web service.

1. Push the repository to a Git provider.
2. In Render, choose **New → Blueprint** and connect the repository.
3. Review the `greenlink-marketplace` service and deploy it.

The build installs and builds both apps; NestJS then serves the frontend and API
on the same Render URL. For manual setup, use the repository root as the service
root, set the build command to
`npm ci --prefix backend && npm ci --prefix frontend && npm run build --prefix frontend && npm run build --prefix backend`,
the start command to `npm run start:prod --prefix backend`, and the health check
path to `/api/health`. Free Render services can sleep when idle and use
ephemeral in-memory data, so this is suitable for a demo rather than production.

## Marketplace API

- `GET /api/marketplace/overview` — supplier profile and dashboard metrics.
- `GET /api/marketplace/requests` — open requests matched by stocked products and region.
- `GET /api/marketplace/requests?view=leads` — unlocked requests and their contact details.
- `POST /api/marketplace/requests` — record a farmer request.
- `POST /api/marketplace/requests/:id/unlock` — simulate lead payment and return farmer contact.
- `PATCH /api/marketplace/requests/:id/status` — track an unlocked request as contacted or fulfilled.
- `GET /api/marketplace/suppliers` — supplier profiles and product availability.
- `POST /api/marketplace/suppliers` — register a supplier profile for verification.
- `GET /api/health` — simple API health response.

## Backend structure

The NestJS backend follows a hexagonal layout:

- `backend/src/domain` contains marketplace types and repository ports.
- `backend/src/application` contains marketplace use cases.
- `backend/src/adapters/inbound/http` contains HTTP controllers.
- `backend/src/adapters/outbound` contains the in-memory repository adapter.
- `backend/src/app.module.ts` wires the ports, adapters, and application services.

## Demo limitations

This is a local demo, not a production payment or communications service. Data lives
in memory and resets when the backend restarts. Lead unlocks are simulated; there is
no payment provider, authentication/authorization, USSD gateway, call center,
notification delivery, or database persistence. Use synthetic contact information
only until those production integrations and access controls are in place.

## Production builds

```sh
cd backend && npm run build
cd ../frontend && npm run build
```

Or build both apps from the repository root with `npm run build`.
