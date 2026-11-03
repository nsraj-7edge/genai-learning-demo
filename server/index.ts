import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import generateRouter from './routes/generate';
import streamRouter from './routes/stream';
import modelsRouter from './routes/models';
import cohereRouter from './routes/cohere';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/generate', generateRouter);
app.use('/api/stream', streamRouter);
app.use('/api/models', modelsRouter);
app.use('/api/cohere', cohereRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    region: process.env.AWS_REGION,
    profile: process.env.AWS_PROFILE,
    model: process.env.BEDROCK_MODEL_ID,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 GenAI Demo server running on http://localhost:${PORT}`);
  console.log(`   AWS Region  : ${process.env.AWS_REGION}`);
  console.log(`   AWS Profile : ${process.env.AWS_PROFILE}`);
  console.log(`   Model       : ${process.env.BEDROCK_MODEL_ID}\n`);
});
