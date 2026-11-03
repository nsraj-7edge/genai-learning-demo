# GenAI & LLM Fundamentals — Interactive Demo

An interactive learning app that teaches the core concepts behind large language models — token generation, sampling parameters, model selection, guardrails, memory, and more — through live demos powered by **AWS Bedrock**.

---

## Prerequisites

| Tool | Min version | Notes |
|------|-------------|-------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Comes with Node |
| AWS CLI | v2 | [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) |
| AWS account | — | With Bedrock model access enabled |

---

## AWS Setup

The server authenticates to AWS Bedrock using a **named profile** (no hardcoded keys needed).

### 1. Configure your AWS profile

```bash
aws configure --profile <your-profile-name>
```

Enter your AWS Access Key ID, Secret Access Key, and default region (`us-east-1` recommended — required for cross-region inference profiles).

### 2. Enable Bedrock model access

In the [AWS Console → Bedrock → Model access](https://console.aws.amazon.com/bedrock/home#/modelaccess), request access for:

- **Anthropic Claude 3.5 Sonnet** (`us.anthropic.claude-sonnet-4-5-20250929-v1:0`)
- **Anthropic Claude Haiku** (`us.anthropic.claude-haiku-4-5-20251001-v1:0`)

Model access can take a few minutes to become active.

---

## Installation & Running

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd GenAI_Demo
```

### 2. Configure environment variables

The `.env` file is already committed with safe defaults. Open it and set your AWS profile name:

```bash
# .env
AWS_PROFILE=your-profile-name   # must match the profile you created above
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
BEDROCK_MODEL_ID_FAST=us.anthropic.claude-haiku-4-5-20251001-v1:0
PORT=3001
NODE_ENV=development
```

### 3. Install root dependencies (server)

```bash
npm install
```

### 4. Install client dependencies

```bash
cd client && npm install && cd ..
```

### 5. Run the app

```bash
npm run dev
```

This starts both the Express server and the Vite dev server concurrently:

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:3001 |

### 6. Verify the server is up

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{ "status": "ok", "region": "us-east-1", "profile": "your-profile-name", "model": "us.anthropic.claude-sonnet-4-5-20250929-v1:0" }
```

---

## Project Structure

```
GenAI_Demo/
├── .env                    # Public config (no secrets)
├── package.json            # Root — server deps + dev scripts
├── server/
│   ├── index.ts            # Express app entry point
│   ├── lib/
│   │   ├── bedrockClient.ts  # AWS Bedrock SDK wrapper
│   │   └── modelConfig.ts    # Model catalogue
│   └── routes/
│       ├── generate.ts     # POST /api/generate
│       ├── stream.ts       # POST /api/stream (SSE)
│       ├── models.ts       # GET  /api/models
│       └── cohere.ts       # Cohere-specific route
└── client/
    ├── index.html
    ├── package.json        # Client deps (React, Vite)
    └── src/
        ├── App.tsx
        ├── LandingPage.tsx
        ├── modules/        # One file per learning module
        │   ├── Module1_TokenGen.tsx
        │   ├── Module2_TempTopP.tsx
        │   ├── Module3_MaxLength.tsx
        │   ├── Module4_Penalties.tsx
        │   ├── Module5_Models.tsx
        │   ├── Module6_Failures.tsx
        │   ├── Module7_Guardrails.tsx
        │   └── Module8_Memory.tsx
        ├── components/     # Shared UI components
        └── styles/
```

---

## Learning Modules

| # | Module | What you learn |
|---|--------|----------------|
| 1 | Token Generation | How LLMs predict the next token |
| 2 | Temperature & Top-P | Controlling randomness and diversity |
| 3 | Max Output Length | Token budgets and truncation |
| 4 | Frequency & Presence Penalties | Reducing repetition |
| 5 | Model Selection | Comparing models by cost, speed, and capability |
| 6 | Failure Modes | Hallucinations, prompt injection, refusals |
| 7 | Guardrails | Input/output filtering and safety controls |
| 8 | Memory | Context windows, short-term vs long-term memory |

---

## Troubleshooting

**`ExpiredTokenException` or `UnrecognizedClientException`**
Your AWS credentials have expired or the profile name doesn't match. Re-run `aws configure --profile <name>` and make sure `AWS_PROFILE` in `.env` matches exactly.

**`ResourceNotFoundException` on model IDs**
Cross-region inference profiles require the `us.` prefix and model access to be enabled in your account. Double-check the Bedrock console.

**Vite proxy errors / CORS**
Make sure the Express server is running on port `3001` before starting the client, or run both together with `npm run dev`.

**Port already in use**
Change `PORT=3001` in `.env` to a free port, and update the `cors` origin in `server/index.ts` and the API base URL in `client/src/api/client.ts` accordingly.
