// ============================================================
//  VEXCHESS · Academia — Motor LLM en el navegador (opcional)
//  Carga perezosa de WebLLM (modelo compilado a WebAssembly/WebGPU).
//  Multiidioma: un modelo pequeño multilingüe (Qwen2.5-0.5B).
//  Si no hay WebGPU o falla la descarga, el chat usa el cerebro
//  determinista. Nada de esto bloquea la carga de la Academia.
// ============================================================

// Modelo pequeño y multilingüe. Cambiar aquí si se quiere otro.
export const LLM_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
export const LLM_MODEL_NAME = 'Qwen2.5 0.5B (local)';

let _engine = null;
let _loading = null;

// ¿El navegador puede correr el modelo? WebGPU es imprescindible.
export function llmSupported() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

// Carga (una sola vez) el motor. onProgress recibe {progress, text}.
export function loadLLM(onProgress) {
  if (_engine) return Promise.resolve(_engine);
  if (_loading) return _loading;
  if (!llmSupported()) return Promise.reject(new Error('no-webgpu'));
  _loading = (async () => {
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    const engine = await webllm.CreateMLCEngine(LLM_MODEL, {
      initProgressCallback: (r) => { try { onProgress && onProgress(r); } catch (e) {} },
    });
    _engine = engine;
    return engine;
  })();
  _loading.catch(() => { _loading = null; });
  return _loading;
}

export function llmReady() { return !!_engine; }

// Una respuesta del modelo a partir de una lista de mensajes {role,content}.
export async function llmChat(messages, opts = {}) {
  if (!_engine) throw new Error('not-loaded');
  const res = await _engine.chat.completions.create({
    messages,
    temperature: opts.temperature != null ? opts.temperature : 0.6,
    max_tokens: opts.max_tokens != null ? opts.max_tokens : 300,
  });
  return (res && res.choices && res.choices[0] && res.choices[0].message.content || '').trim();
}
