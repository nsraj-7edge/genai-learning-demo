// Official documentation links per module — all URLs verified live
// Anthropic docs domain: platform.claude.com/docs (docs.anthropic.com redirects here)

export interface Resource {
  label: string;
  url: string;
  type: 'aws' | 'anthropic' | 'openai' | 'guide' | 'owasp' | 'azure';
  description: string;
}

export const MODULE_RESOURCES: Record<number, Resource[]> = {

  // ── Module 1: How LLMs Generate Text ─────────────────────────────────
  1: [
    {
      label: 'AWS Bedrock — What is Amazon Bedrock?',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html',
      type: 'aws',
      description: 'Official AWS overview of Bedrock architecture, supported models, and how to make your first API call.',
    },
    {
      label: 'Anthropic — Token counting (with code examples)',
      url: 'https://platform.claude.com/docs/en/build-with-claude/token-counting',
      type: 'anthropic',
      description: 'How to count tokens before sending a request — includes rate limits, pricing context, and code samples.',
    },
    {
      label: 'OpenAI Tokenizer (interactive tool)',
      url: 'https://platform.openai.com/tokenizer',
      type: 'openai',
      description: 'Paste any text to see exactly how it breaks into tokens. Essential for understanding token cost.',
    },
    {
      label: 'Prompt Engineering Guide — Basics of Prompting',
      url: 'https://www.promptingguide.ai/introduction/basics',
      type: 'guide',
      description: 'Community-standard guide explaining how LLMs respond to input, including zero-shot and few-shot prompting.',
    },
  ],

  // ── Module 2: Temperature & Top P ────────────────────────────────────
  2: [
    {
      label: 'AWS Bedrock — Inference parameters (Temperature, Top P)',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/inference-parameters.html',
      type: 'aws',
      description: 'Official AWS reference for temperature, Top P, Top K, and max tokens across all Bedrock models, with worked examples.',
    },
    {
      label: 'Anthropic Messages API — Full parameter reference',
      url: 'https://platform.claude.com/docs/en/api/messages',
      type: 'anthropic',
      description: 'Full Claude Messages API spec covering temperature, top_p, top_k, max_tokens, stop_sequences, and system prompts.',
    },
    {
      label: 'Prompt Engineering Guide — LLM Settings',
      url: 'https://www.promptingguide.ai/introduction/settings',
      type: 'guide',
      description: 'Plain-English explanation of temperature, Top P, frequency penalty, presence penalty with practical guidance on when to use each.',
    },
  ],

  // ── Module 3: Max Tokens & Stop Sequences ────────────────────────────
  3: [
    {
      label: 'AWS Bedrock — Inference parameters (max_tokens, stop_sequences)',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/inference-parameters.html',
      type: 'aws',
      description: 'Detailed reference for response length parameters and stop sequences across all Bedrock foundation models.',
    },
    {
      label: 'Anthropic Messages API — stop_sequences & max_tokens',
      url: 'https://platform.claude.com/docs/en/api/messages',
      type: 'anthropic',
      description: 'Anthropic API reference showing exact stop_sequences format, max_tokens limits per model, and stop_reason values.',
    },
    {
      label: 'AWS Cost Management — AWS Budgets',
      url: 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html',
      type: 'aws',
      description: 'How to create budget alerts that notify you before API costs exceed your threshold — critical for production deployments.',
    },
  ],

  // ── Module 4: Frequency & Presence Penalties ─────────────────────────
  4: [
    {
      label: 'OpenAI API reference — frequency_penalty & presence_penalty',
      url: 'https://platform.openai.com/docs/api-reference/chat/create',
      type: 'openai',
      description: 'Official OpenAI definition with exact formulas for frequency_penalty and presence_penalty parameters.',
    },
    {
      label: 'Azure OpenAI Service REST API reference',
      url: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/reference',
      type: 'azure',
      description: 'Microsoft docs covering all Azure OpenAI sampling and penalty parameters with code examples.',
    },
    {
      label: 'Anthropic — Reduce hallucinations & repetition',
      url: 'https://platform.claude.com/docs/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations',
      type: 'anthropic',
      description: 'Anthropic guidance on grounding responses, avoiding repetitive loops, and improving output quality.',
    },
    {
      label: 'Prompt Engineering Guide — Frequency & Presence Penalties',
      url: 'https://www.promptingguide.ai/introduction/settings',
      type: 'guide',
      description: 'Clear comparison of frequency vs presence penalty with practical recommendations on which to use and when.',
    },
  ],

  // ── Module 5: Model Selection & Architecture ──────────────────────────
  5: [
    {
      label: 'AWS Bedrock — Supported foundation models',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html',
      type: 'aws',
      description: 'Complete list of all models on Bedrock — capabilities, Region availability, model IDs, and supported APIs.',
    },
    {
      label: 'Anthropic — Models overview (Haiku, Sonnet, Opus)',
      url: 'https://platform.claude.com/docs/en/docs/about-claude/models/overview',
      type: 'anthropic',
      description: 'Full Claude model lineup with context windows, pricing per 1M tokens, and capability comparisons across tiers.',
    },
    {
      label: 'AWS Bedrock Knowledge Bases — RAG architecture',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html',
      type: 'aws',
      description: 'How to build RAG pipelines in Bedrock — managed and customer-managed knowledge bases with vector search.',
    },
    {
      label: 'AWS Bedrock Agents — multi-step agentic workflows',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html',
      type: 'aws',
      description: 'Build autonomous agents with session memory, knowledge base integration, tool use, and automated task orchestration.',
    },
    {
      label: 'Amazon Nova models — documentation',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova.html',
      type: 'aws',
      description: "Amazon's own Nova model family parameters, context windows, and pricing — including Nova Pro (300K context).",
    },
  ],

  // ── Module 6: Failure Classification ─────────────────────────────────
  6: [
    {
      label: 'AWS Bedrock Guardrails — content filtering',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html',
      type: 'aws',
      description: 'Configure content filters, denied topics, word filters, PII detection, and contextual grounding checks in Bedrock.',
    },
    {
      label: 'Anthropic — Reduce hallucinations',
      url: 'https://platform.claude.com/docs/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations',
      type: 'anthropic',
      description: 'Concrete techniques including citation checking, chain-of-thought verification, and external knowledge restriction.',
    },
    {
      label: 'OWASP Top 10 for LLM Applications',
      url: 'https://genai.owasp.org/llm-top-10/',
      type: 'owasp',
      description: 'Industry-standard risk taxonomy used by security teams — covers prompt injection, hallucination, insecure output handling, and more.',
    },
  ],

  // ── Module 7: Responsible AI & Guardrails ────────────────────────────
  7: [
    {
      label: 'AWS Bedrock Guardrails — full configuration guide',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html',
      type: 'aws',
      description: 'Step-by-step guide to creating, testing, and deploying guardrails with all filter types and code samples.',
    },
    {
      label: 'AWS Responsible AI policy',
      url: 'https://aws.amazon.com/machine-learning/responsible-ai/',
      type: 'aws',
      description: "AWS's responsible AI framework, governance principles, safety research programmes, and standards compliance.",
    },
    {
      label: 'Anthropic — Mitigate jailbreaks & prompt injection',
      url: 'https://platform.claude.com/docs/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks',
      type: 'anthropic',
      description: 'Enterprise-grade patterns to harden system prompts against direct and indirect prompt injection with code examples.',
    },
    {
      label: 'OWASP Top 10 for LLM Applications',
      url: 'https://genai.owasp.org/llm-top-10/',
      type: 'owasp',
      description: 'Comprehensive GenAI security risk taxonomy — the industry reference for LLM application security reviews.',
    },
  ],
  // ── Module 8: Session Storage & Memory ───────────────────────────────
  8: [
    {
      label: 'AWS Bedrock — Session management API',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html',
      type: 'aws',
      description: 'Store and retrieve conversation history using the Bedrock Sessions API — sessionId, CRUD operations, TTL configuration.',
    },
    {
      label: 'AWS Bedrock Agents — memory retention across sessions',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/agents-memory.html',
      type: 'aws',
      description: 'How Bedrock Agents retain conversational context using sessionId — short-term memory configuration and session lifecycle.',
    },
    {
      label: 'AWS AgentCore Memory — short-term and long-term',
      url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-types.html',
      type: 'aws',
      description: 'Complete reference for AgentCore Memory types: session-scoped short-term and persistent cross-session long-term memory.',
    },
    {
      label: 'AgentCore Memory — getting started guide',
      url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-get-started.html',
      type: 'aws',
      description: 'Step-by-step tutorial implementing both short-term and long-term memory features using the AgentCore SDK.',
    },
    {
      label: 'Anthropic — Multi-turn conversations',
      url: 'https://platform.claude.com/docs/en/build-with-claude/conversations',
      type: 'anthropic',
      description: 'How to structure multi-turn conversations with the Claude Messages API — managing history in the messages array.',
    },
  ],
};
