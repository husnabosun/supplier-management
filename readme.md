# Supplier Management

A supplier onboarding application built with SAP CAP, SAPUI5, and an approuter. Suppliers can register, submit and track an application, and reapply after a rejection. Users with the approver role can review applications, request revisions, and analyze certificates with Gemini AI.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/supplier-portal/` | Supplier-facing SAPUI5 application |
| `app/supplier-approvals/` | Approver-facing SAPUI5 application |
| `app/appconfig/` | Fiori launchpad sandbox configuration |
| `approuter/` | Application routes and approuter startup |
| `db/schema.cds` | Supplier and user persistence model |
| `srv/service.cds` | OData service contract |
| `srv/service.js` | CAP handler registration |
| `srv/lib/` | Backend constants and action handlers |

## Requirements

- Node.js and npm
- Dependencies installed in the repository root and in `approuter/`
- For hybrid operation: the configured XSUAA and destination services, including the `cap-backend` and `GEMINI_AI` destinations

## Install dependencies

From the project root:

```sh
npm install
npm install --prefix approuter
```

## Run locally

Start the CAP server from the project root:

```sh
npx cds watch
```

This uses the default SQLite configuration (`db.sqlite`) for persistence. The CAP service is available under `/odata/v4/supplier/` on the local CAP server (normally `http://localhost:4004`).

To run with the hybrid profile instead:

```sh
npx cds watch --profile hybrid
```

The hybrid profile expects the XSUAA and destination services and the configured Gemini destination to be available through the local environment.

In a second terminal, start the approuter:

```sh
npm start --prefix approuter
```

The approuter listens on port `5000` by default. Its routes expect the `cap-backend` destination and XSUAA configuration. Provide those through your local approuter environment or the platform bindings; do not commit credentials or service keys.

The launchpad entry point is `/`. The supplier and approver applications are served at `/supplier-portal/` and `/supplier-approvals/` respectively. The approver route requires the `Approval` scope.

## Service operations

The OData service is `SupplierService`, mounted at `/odata/v4/supplier/`.

| Operation | Type | Purpose |
| --- | --- | --- |
| `register` | Action | Create a supplier login |
| `login` | Action | Validate supplier credentials |
| `myApplicationStatus` | Function | Read the current user's application status |
| `myApplicationDetails` | Function | Read details needed to reapply |
| `submitApplication` | Action | Submit a new application with a PDF certificate |
| `reapplyApplication` | Action | Resubmit an application previously rejected |
| `decideApplication` | Action | Approve or reject an application; requires the `Approval` role |
| `analyzeApplication` | Action | Analyze a certificate using Gemini AI; requires the `Approval` role |

Certificates are sent as base64-encoded PDF content. The backend enforces a 10 MB certificate-size limit. On rejection, the approver must provide a comment and select at least one field for revision.

## Configuration notes

- `package.json` contains the CAP dependencies and the hybrid profile configuration.
- `approuter/xs-app.json` defines the routes, destinations, and access requirements.
- `approuter/default-env.json` is intended for local approuter environment configuration. Keep credentials and service keys out of source control.
- Both UI5 applications use SAPUI5 and support English and Turkish.

## Tests

There is currently no automated test suite configured: the root `npm test` command is a placeholder. After backend or UI changes, run the app and manually verify the affected supplier and approver flows.

## Learn more

- [SAP CAP documentation](https://cap.cloud.sap/docs/)
- [SAPUI5 documentation](https://ui5.sap.com/)
- [SAP Application Router documentation](https://www.npmjs.com/package/@sap/approuter)
