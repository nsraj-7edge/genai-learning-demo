/**
 * Module 8 — Session Storage & Memory
 *
 * Topics:
 *  1. Why LLMs have no memory by default — the stateless API problem
 *  2. The four memory patterns (context window, external buffer, summary, vector)
 *  3. Short-term vs long-term memory (AWS Bedrock AgentCore Memory)
 *  4. Session management in Bedrock — sessionId, how it works
 *  5. Full LLM concept visualisation — end-to-end picture
 *  6. Live demo — manual conversation history (context-window memory)
 */
import { useState, useRef, useCallback } from 'react';
import {
  MemoryStick, Database, Brain, Clock, Layers,
  RefreshCw, Send, User, Bot, Info, AlertTriangle,
  Zap, Search, ArrowRight, HardDrive, Cpu,
  BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { generate } from '../api/client';
import TheoryCard from '../components/TheoryCard';
import Callout from '../components/Callout';

const GLOSSARY_M8 = [
  { term: 'Stateless API', color: 'var(--rose)', simple: 'Each API call is completely independent. The model has zero memory of previous calls — every request starts from scratch.', technical: 'No server-side session state between InvokeModel calls. Conversation history must be explicitly included in the request body on every turn. By design — enables horizontal scaling.' },
  { term: 'Context Window Memory', color: 'var(--blue)', simple: 'The simplest memory approach — include all previous messages in every API call so the model can see the full conversation.', technical: 'Append entire message history to the messages array on each request. Cost scales O(n²) — each turn re-sends all previous turns. Practical limit: ~20–30 turns before cost becomes significant.' },
  { term: 'External Buffer', color: 'var(--teal)', simple: 'Store conversation history in a database. Inject only the most recent N turns into each API call instead of everything.', technical: 'Sliding window approach: persist all messages to DB, inject last N into context on each request. O(N) cost per call. Requires pagination logic and DB read latency.' },
  { term: 'Summarisation Memory', color: 'var(--amber)', simple: 'Periodically compress old conversation turns into a summary, then keep only that summary going forward.', technical: 'Periodically run a summarisation call on older turns, replace them with a condensed summary in context. Lossy — fine detail lost. Good when exact history is not needed long-term.' },
  { term: 'Vector Memory', color: 'var(--purple)', simple: 'Embed all memories as vectors. At each turn, retrieve only the memories most semantically relevant to the current message.', technical: 'Store conversation turns as embeddings in vector DB. On each request, embed current message, retrieve top-K relevant memories by cosine similarity, inject into context. Most scalable but complex.' },
  { term: 'sessionId', color: 'var(--teal)', simple: 'A unique identifier you pass with each API call to group messages into a conversation. Bedrock uses it to manage history automatically.', technical: 'UUID per conversation passed as sessionId in InvokeAgent API. Bedrock groups all events with the same sessionId. Retrieve with ListEvents. End with EndSession to trigger TTL and long-term extraction.' },
  { term: 'Short-term Memory', color: 'var(--teal)', simple: 'Memory that lasts only within a single conversation session. Gone when the session ends.', technical: 'Session-scoped memory in AWS Bedrock AgentCore. Raw event history stored per sessionId. Automatically loaded on subsequent InvokeAgent calls with same sessionId. Governed by TTL.' },
  { term: 'Long-term Memory', color: 'var(--purple)', simple: 'Memory that persists across multiple sessions. The agent remembers facts and preferences from weeks-old conversations.', technical: 'AWS Bedrock AgentCore Memory. Automatically extracts key insights, user preferences, and important facts from session history. Stored persistently with namespace scoping. Retrieved on new sessions.' },
  { term: 'AgentCore Memory', color: 'var(--purple)', simple: 'AWS\'s managed memory service for agents. Handles both short-term session history and long-term persistent knowledge extraction automatically.', technical: 'AWS Bedrock AgentCore Memory. Two types: short-term (raw session events via CreateEvent/ListEvents) and long-term (automatic insight extraction via memory strategies). Managed storage, no infrastructure.' },
  { term: 'Sliding Window', color: 'var(--blue)', simple: 'Only send the last N messages with each call instead of all of them. When the window is full, the oldest message drops off.', technical: 'Fixed-size context injection: messages.slice(-N). Keeps cost constant at O(N) per call. This demo uses last 8 messages. Trade-off: very old context is lost without summarisation.' },
  { term: 'Context Cost Growth', color: 'var(--rose)', simple: 'Every turn adds more tokens to the history being sent. The longer the conversation, the more you pay per message.', technical: 'Input token count grows with each turn in context-window memory. Turn 10 sends ~10× more input tokens than turn 1. Cost = Σ(tokens per turn) × input_rate — grows quadratically without windowing.' },
];

function GlossaryPanelM8() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 104, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10 }}>
        <BookOpen size={14} color="var(--purple)" />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--purple)' }}>Key Terms</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{GLOSSARY_M8.length} terms</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {GLOSSARY_M8.map(g => {
          const isOpen = expanded === g.term;
          return (
            <div key={g.term} style={{ background: isOpen ? `color-mix(in srgb, ${g.color} 8%, rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.025)', border: `1px solid ${isOpen ? `color-mix(in srgb, ${g.color} 30%, transparent)` : 'rgba(255,255,255,0.07)'}`, borderRadius: 9, overflow: 'hidden', transition: 'all 0.2s ease' }}>
              <button onClick={() => setExpanded(isOpen ? null : g.term)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: g.color, boxShadow: isOpen ? `0 0 8px ${g.color}` : 'none' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isOpen ? g.color : 'var(--text-primary)', flex: 1, lineHeight: 1.3 }}>{g.term}</span>
                {isOpen ? <ChevronUp size={11} color="var(--text-muted)" /> : <ChevronDown size={11} color="var(--text-muted)" />}
              </button>
              {isOpen && (
                <div style={{ padding: '0 12px 12px', animation: 'fadeUp 0.18s ease' }}>
                  <div style={{ padding: '8px 10px', marginBottom: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 7 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Plain English</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{g.simple}</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: `color-mix(in srgb, ${g.color} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${g.color} 18%, transparent)`, borderRadius: 7 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: g.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Technical</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{g.technical}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, padding: '8px 10px', fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center' }}>Click any term to expand</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Visuals
// ─────────────────────────────────────────────────────────────────────────────

function StatelessDiagram() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { turn: 'Turn 1', msg: '"My name is Priya"',     reply: '"Hello Priya!"',                 remembers: true  },
        { turn: 'Turn 2', msg: '"What is my name?"',    reply: '"I don\'t know your name."',      remembers: false },
        { turn: 'Turn 3', msg: '"My name is Priya. What is my name?"', reply: '"Your name is Priya!"', remembers: true },
      ].map(t => (
        <div key={t.turn} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', width: 38, flexShrink: 0, paddingTop: 5 }}>{t.turn}</div>
          <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, padding: '3px 8px', color: 'rgba(59,130,246,0.9)' }}>{t.msg}</span>
            <ArrowRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 5 }} />
            <span style={{ fontSize: 11, background: t.remembers ? 'rgba(20,184,166,0.12)' : 'rgba(244,63,94,0.12)', border: `1px solid ${t.remembers ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.25)'}`, borderRadius: 6, padding: '3px 8px', color: t.remembers ? 'rgba(20,184,166,0.9)' : 'rgba(244,63,94,0.9)' }}>
              {t.reply}
            </span>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>Turn 2 fails because each API call is stateless — the model never sees Turn 1 again.</div>
    </div>
  );
}

function ContextWindowMemoryDiagram() {
  const msgs = [
    { role: 'user',      text: 'My name is Priya',    tokens: 6  },
    { role: 'assistant', text: 'Hello Priya!',         tokens: 5  },
    { role: 'user',      text: 'What is my name?',     tokens: 7  },
    { role: 'assistant', text: '(about to generate…)', tokens: 0  },
  ];
  const total = msgs.reduce((a, m) => a + m.tokens, 0);
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Every previous message is re-sent on each call
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 58, fontSize: 10, fontWeight: 700, color: m.role === 'user' ? 'var(--blue)' : 'var(--purple)', textAlign: 'right', flexShrink: 0 }}>{m.role}</div>
            <div style={{ flex: 1, padding: '4px 8px', background: m.role === 'user' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)', borderRadius: 5, fontSize: 11, color: 'var(--text-secondary)', borderLeft: `2px solid ${m.role === 'user' ? 'var(--blue)' : 'var(--purple)'}` }}>
              {m.text}
            </div>
            {m.tokens > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{m.tokens}t</span>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--amber)' }}>Total sent: {total} tokens — cost grows with every turn</div>
    </div>
  );
}

function MemoryTypesDiagram() {
  const types = [
    {
      label: 'Context Window (in-context)',
      color: 'var(--blue)',
      icon: <Cpu size={13} />,
      how: 'Append all previous messages to every API call',
      limit: 'Expensive at scale; hits context limit',
      when: 'Short conversations (< 20 turns)',
    },
    {
      label: 'External Buffer',
      color: 'var(--teal)',
      icon: <HardDrive size={13} />,
      how: 'Store raw message history in DB; inject recent N turns',
      limit: 'Needs pagination logic; still grows over time',
      when: 'Chat apps with moderate history',
    },
    {
      label: 'Summarisation Memory',
      color: 'var(--amber)',
      icon: <Brain size={13} />,
      how: 'Periodically summarise old turns, keep only the summary',
      limit: 'Lossy — fine detail can be lost in summaries',
      when: 'Long conversations where exact history is not needed',
    },
    {
      label: 'Vector / Semantic Memory',
      color: 'var(--purple)',
      icon: <Search size={13} />,
      how: 'Embed all memories; retrieve the most relevant ones per query',
      limit: 'Complex to build; needs vector DB',
      when: 'Long-term agents, personalisation, cross-session recall',
    },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {types.map(t => (
        <div key={t.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: `color-mix(in srgb, ${t.color} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${t.color} 20%, transparent)`, borderRadius: 8 }}>
          <div style={{ color: t.color, flexShrink: 0, marginTop: 1 }}>{t.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: t.color, marginBottom: 3 }}>{t.label}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 3 }}>{t.how}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><strong style={{ color: 'var(--rose)' }}>Limit:</strong> {t.limit} · <strong style={{ color: t.color }}>Use when:</strong> {t.when}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShortLongTermDiagram() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {[
        {
          label: 'Short-term memory', color: 'var(--teal)', icon: <Clock size={14} />,
          scope: 'Single session / conversation',
          how: 'Raw message events stored with a sessionId. Automatically scoped to one conversation.',
          example: '"Earlier you said you prefer dark mode — applying it now."',
          bedrock: 'Bedrock Agents sessionId parameter — pass the same ID across turns',
          lifespan: 'Until session ends or TTL expires',
        },
        {
          label: 'Long-term memory', color: 'var(--purple)', icon: <MemoryStick size={14} />,
          scope: 'Across multiple sessions / users',
          how: 'Key insights, preferences, and facts extracted from conversations and stored persistently.',
          example: '"Welcome back! Last time you were working on a Python web scraper."',
          bedrock: 'AWS Bedrock AgentCore Memory — managed extraction + vector store',
          lifespan: 'Indefinite — explicitly managed by your application',
        },
      ].map(t => (
        <div key={t.label} style={{ padding: '14px 16px', background: `color-mix(in srgb, ${t.color} 8%, rgba(255,255,255,0.02))`, border: `1px solid color-mix(in srgb, ${t.color} 25%, transparent)`, borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <div style={{ color: t.color }}>{t.icon}</div>
            <span style={{ fontWeight: 700, fontSize: 13, color: t.color }}>{t.label}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 5 }}><strong style={{ color: 'var(--text-secondary)' }}>Scope:</strong> {t.scope}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 6 }}>{t.how}</div>
          <div style={{ fontSize: 11.5, fontStyle: 'italic', color: t.color, marginBottom: 8, padding: '5px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>"{t.example}"</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><strong style={{ color: t.color }}>Bedrock:</strong> {t.bedrock}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}><strong>Lifespan:</strong> {t.lifespan}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full LLM concept visualisation
// ─────────────────────────────────────────────────────────────────────────────

function FullLLMPicture() {
  const stages = [
    {
      phase: 'Training (offline — happens once)',
      color: 'rgba(59,130,246,0.15)',
      borderColor: 'rgba(59,130,246,0.3)',
      steps: [
        { label: 'Raw data (web, books, code)', sub: 'Trillions of tokens' },
        { label: 'Tokenisation', sub: 'Text → integer IDs' },
        { label: 'Transformer pre-training', sub: 'Next-token prediction at massive scale' },
        { label: 'RLHF fine-tuning', sub: 'Human feedback → helpful + safe' },
        { label: 'Foundation model weights', sub: 'Billions of float parameters (frozen)' },
      ],
    },
    {
      phase: 'Inference (runtime — every API call)',
      color: 'rgba(20,184,166,0.12)',
      borderColor: 'rgba(20,184,166,0.3)',
      steps: [
        { label: 'System prompt', sub: 'Role, tone, rules, tools available' },
        { label: 'Memory injection', sub: 'Short-term history + long-term insights' },
        { label: 'RAG retrieval (optional)', sub: 'Relevant documents fetched from vector DB' },
        { label: 'User message', sub: 'Current turn input' },
        { label: 'Tokenise → embed → attention', sub: 'Model processes all tokens simultaneously' },
        { label: 'Softmax + sampling', sub: 'Temperature / Top P / Top K applied' },
        { label: 'Autoregressive generation', sub: 'One token at a time until stop condition' },
        { label: 'Output + stop_reason', sub: 'end_turn / max_tokens / stop_sequence' },
      ],
    },
    {
      phase: 'Post-generation (optional)',
      color: 'rgba(139,92,246,0.12)',
      borderColor: 'rgba(139,92,246,0.3)',
      steps: [
        { label: 'Guardrails / safety filter', sub: 'Content policies, PII detection' },
        { label: 'Memory write-back', sub: 'Store new facts for future sessions' },
        { label: 'Tool call execution', sub: 'If model requested a tool, run it and loop' },
        { label: 'Final response to user', sub: 'Validated, filtered output' },
      ],
    },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {stages.map(stage => (
        <div key={stage.phase} style={{ padding: '14px 16px', background: stage.color, border: `1px solid ${stage.borderColor}`, borderRadius: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text-primary)', marginBottom: 10 }}>{stage.phase}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            {stage.steps.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ padding: '5px 10px', background: 'rgba(0,0,0,0.25)', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.label}</div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.sub}</div>
                </div>
                {i < stage.steps.length - 1 && <ArrowRight size={10} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live conversation demo — manual context window memory
// ─────────────────────────────────────────────────────────────────────────────

interface Message { role: 'user' | 'assistant'; content: string }

const SYSTEM_PROMPT = `You are a helpful assistant. Remember everything the user tells you in this conversation and refer back to it naturally.`;

export default function Module8Memory() {
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [tokenCount,  setTokenCount]  = useState(0);
  const [useMemory,   setUseMemory]   = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Estimate tokens: rough 1.33 tokens per word
  const estimateTokens = (msgs: Message[]) =>
    Math.round(msgs.reduce((a, m) => a + m.content.split(/\s+/).length * 1.33, 0));

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError('');

    const userMsg: Message = { role: 'user', content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);

    // Build prompt: include history if memory is ON
    const historyText = useMemory
      ? newMsgs.slice(-8).map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n')
      : text;

    const prompt = useMemory
      ? `${historyText}\nAssistant:`
      : text;

    setLoading(true);
    try {
      const res = await generate({
        prompt,
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 300,
        mode: 'single',
      });
      if (res.mode === 'single') {
        const reply = res.result.text.replace(/^Assistant:\s*/i, '').trim();
        const updated = [...newMsgs, { role: 'assistant' as const, content: reply }];
        setMessages(updated);
        setTokenCount(estimateTokens(updated));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, useMemory]);

  const clear = () => { setMessages([]); setTokenCount(0); setError(''); };

  const STARTER_PROMPTS = [
    'My name is Alex and I love hiking.',
    'I prefer concise answers under 3 sentences.',
    'What did I say my name was?',
    'What are my preferences so far?',
  ];

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 — Why LLMs have no memory
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '26px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <MemoryStick size={20} color="var(--purple)" />
          <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Session Storage &amp; Memory</h2>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20, maxWidth: 740 }}>
          Every LLM API call is <strong style={{ color: 'var(--text-primary)' }}>completely stateless</strong>. The model has no memory of previous requests — each call starts fresh from a blank slate. Building a useful application means you must manage memory yourself. There are four ways to do this, each with different tradeoffs.
        </p>
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <TheoryCard
            icon={<AlertTriangle size={15} />} accent="var(--rose)"
            title="The stateless problem"
            simple="Send a message, get a reply. Send another message — the model has forgotten everything from the first exchange. This is not a bug, it is by design: statelessness makes models scalable and parallelisable. Memory is YOUR responsibility as the developer."
            technical="Each InvokeModel API call is independent. No session state is stored server-side between calls. Conversation history must be included in the request body on every turn."
            visual={<StatelessDiagram />}
          />
          <TheoryCard
            icon={<Cpu size={15} />} accent="var(--blue)"
            title="The simplest fix: context window memory"
            simple='The most common approach: every time the user sends a message, you prepend the entire conversation history to the request. The model "remembers" because it can see all previous turns right there in the prompt. This works well up to ~20 turns, then gets expensive.'
            technical="Sending N turns of history means N×avg_tokens extra input tokens per call. With 200K context windows on Claude, you can fit roughly 400 turns of typical conversation before hitting limits."
            visual={<ContextWindowMemoryDiagram />}
          />
        </div>

        <TheoryCard
          icon={<Database size={15} />} accent="var(--teal)"
          title="Four memory patterns — from simple to sophisticated"
          simple="Each pattern trades simplicity for capability. Start with context window memory. Upgrade when you hit its limits — usually when conversations get very long, or when context must persist across separate sessions."
          visual={<MemoryTypesDiagram />}
        />
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — Short-term vs long-term (Bedrock)
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Brain size={17} color="var(--purple)" />
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>Short-term vs Long-term Memory on AWS Bedrock</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.65 }}>
          AWS Bedrock AgentCore Memory provides two managed memory tiers. You don't build the storage — AWS manages it. You just pass a <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3 }}>sessionId</code> and AWS handles the rest.
        </p>
        <ShortLongTermDiagram />

        {/* Session ID explanation */}
        <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.22)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Info size={14} color="var(--teal)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)' }}>How sessionId works in Bedrock</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { step: '1. Assign a session ID', detail: 'Generate a UUID per user conversation. Pass it as sessionId in every InvokeAgent API call for that session.' },
              { step: '2. Bedrock stores the history', detail: 'All messages with the same sessionId are automatically grouped. The agent reloads history on subsequent calls.' },
              { step: '3. End the session', detail: 'Call EndSession API when the user conversation ends. Short-term history is retained per TTL. Long-term insights persist indefinitely.' },
            ].map(s => (
              <div key={s.step}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--teal)', marginBottom: 5 }}>{s.step}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <Callout variant="info">
          <strong>AWS Bedrock Sessions API</strong> (docs.aws.amazon.com/bedrock/latest/userguide/sessions.html) lets you store and retrieve conversation history using standard CRUD operations. Pair it with <strong>AgentCore Memory</strong> for automatic long-term insight extraction across sessions.
        </Callout>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 — Complete LLM concept visualisation
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Layers size={17} color="var(--blue)" />
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>The complete LLM picture — from training to response</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.65 }}>
          Every concept from all 8 modules appears in this single end-to-end diagram. Tokens, temperature, stop sequences, penalties, memory, RAG, guardrails — this is where they all fit together.
        </p>
        <FullLLMPicture />
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: 'Modules 1–2', topic: 'Tokenisation, temperature, Top P/K — how the model samples tokens', color: 'var(--blue)' },
            { label: 'Module 3',    topic: 'max_tokens + stop sequences — when generation stops', color: 'var(--teal)' },
            { label: 'Modules 4',   topic: 'Frequency / presence penalties — shaping the vocabulary', color: 'var(--amber)' },
            { label: 'Module 5',    topic: 'Model selection — which foundation model to use', color: 'var(--pink)' },
            { label: 'Module 6',    topic: 'Failure modes — hallucination, cost spikes, unsafe output', color: 'var(--rose)' },
            { label: 'Module 7',    topic: 'Guardrails — safety filters, PII, denied topics', color: 'var(--green)' },
            { label: 'Module 8',    topic: 'Session memory — short-term buffer, long-term AgentCore', color: 'var(--purple)' },
            { label: 'RAG layer',   topic: 'Retrieval — inject relevant documents before generation', color: 'var(--blue)' },
          ].map(m => (
            <div key={m.label} style={{ padding: '8px 10px', background: `color-mix(in srgb, ${m.color} 7%, rgba(255,255,255,0.02))`, border: `1px solid color-mix(in srgb, ${m.color} 22%, transparent)`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: m.color, marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{m.topic}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4 — Live memory demo
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={17} color="var(--teal)" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Live Demo — Context Window Memory</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Memory toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', background: useMemory ? 'rgba(20,184,166,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${useMemory ? 'rgba(20,184,166,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: useMemory ? 'var(--teal)' : 'var(--text-muted)', fontWeight: 600 }}>Memory {useMemory ? 'ON' : 'OFF'}</span>
              <button onClick={() => setUseMemory(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: useMemory ? 'var(--teal)' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: useMemory ? 17 : 2 }} />
              </button>
            </div>
            <button className="btn btn-ghost" onClick={clear} style={{ fontSize: 11.5 }}>
              <RefreshCw size={11} /> Clear
            </button>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.65 }}>
          Toggle memory OFF and ask something that requires context — the model forgets everything. Toggle ON — all previous turns are re-sent with each message.
        </p>

        {!useMemory && (
          <div style={{ marginBottom: 12 }}>
            <Callout variant="warning">Memory is OFF — each message is sent without history. Try asking "What is my name?" after telling the model your name.</Callout>
          </div>
        )}

        {/* Starter prompts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {STARTER_PROMPTS.map(p => (
            <button key={p} onClick={() => setInput(p)} className="btn btn-ghost" style={{ fontSize: 11.5 }}>
              {p.length > 35 ? p.slice(0, 35) + '…' : p}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{ minHeight: 160, maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 12 }}>
          {messages.length === 0 && (
            <div style={{ color: 'var(--text-subtle)', fontStyle: 'italic', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
              Send a message to start. Tell the model your name, then ask it to recall it.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(20,184,166,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Bot size={12} color="var(--teal)" />
                </div>
              )}
              <div style={{
                maxWidth: '78%', padding: '9px 13px', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                background: m.role === 'user' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                border: m.role === 'user' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
                fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-primary)',
              }}>
                {m.content}
              </div>
              {m.role === 'user' && (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <User size={12} color="var(--blue)" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(20,184,166,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={12} color="var(--teal)" />
              </div>
              <div style={{ padding: '9px 13px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', animation: `bounce 0.8s ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <div style={{ marginBottom: 10 }}><Callout variant="danger">{error}</Callout></div>}

        {/* Token counter */}
        {messages.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Est. context tokens: <strong style={{ color: useMemory && tokenCount > 1000 ? 'var(--amber)' : 'var(--teal)', fontFamily: 'var(--font-mono)' }}>{tokenCount}</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>Turns: <strong style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{Math.floor(messages.length / 2)}</strong></span>
            {useMemory && <span style={{ color: 'var(--text-muted)' }}>Each message resends entire history — cost grows linearly</span>}
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea ref={inputRef} className="glass-input" rows={2} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={loading}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            style={{ flex: 1, resize: 'none' }} />
          <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()} style={{ alignSelf: 'flex-end', padding: '10px 18px' }}>
            <Send size={13} /> Send
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          Memory mode: last 8 messages are re-sent with each call (sliding window approach).
        </div>
      </section>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
      </div>
      <GlossaryPanelM8 />
    </div>
  );
}
