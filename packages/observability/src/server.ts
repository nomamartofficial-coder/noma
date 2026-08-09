import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  context,
  metrics,
  propagation,
  trace,
  type Attributes,
  type Context,
  type Span,
} from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
  type ResourceMetrics,
} from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BatchSpanProcessor,
  InMemorySpanExporter,
  ParentBasedSampler,
  SimpleSpanProcessor,
  TraceIdRatioBasedSampler,
  type ReadableSpan,
} from '@opentelemetry/sdk-trace-base';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

export const serverObservabilityBoundary = 'server-only' as const;

export const TELEMETRY_MODES = ['disabled', 'in-memory', 'otlp'] as const;
export type TelemetryMode = (typeof TELEMETRY_MODES)[number];
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogOutcome = 'started' | 'succeeded' | 'failed' | 'unavailable' | 'skipped';

export interface TelemetryRuntimeOptions {
  readonly serviceName: 'noma-api' | 'noma-worker';
  readonly environment: string;
  readonly releaseSha?: string;
  readonly instanceId?: string;
  readonly mode: TelemetryMode;
  readonly endpoint?: string;
  readonly authorization?: string;
  readonly traceSampleRatio?: number;
  readonly exportIntervalMilliseconds?: number;
  readonly exportTimeoutMilliseconds?: number;
  readonly shutdownTimeoutMilliseconds?: number;
  readonly writeLog?: (line: string) => void;
  readonly now?: () => Date;
}

export interface CorrelationContext {
  readonly requestId: string;
  readonly correlationId: string;
}

export interface TraceContextCarrier {
  readonly traceparent: string;
  readonly tracestate?: string;
}

export interface SafeTelemetryError {
  readonly category: 'configuration' | 'dependency' | 'validation' | 'timeout' | 'internal';
  readonly code: string;
  readonly message: string;
}

export interface StructuredLogRecord {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly service: string;
  readonly environment: string;
  readonly event: string;
  readonly outcome: LogOutcome;
  readonly releaseSha?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly [key: string]: unknown;
}

export interface StructuredLogger {
  debug(event: string, outcome: LogOutcome, fields?: Readonly<Record<string, unknown>>): void;
  info(event: string, outcome: LogOutcome, fields?: Readonly<Record<string, unknown>>): void;
  warn(event: string, outcome: LogOutcome, fields?: Readonly<Record<string, unknown>>): void;
  error(event: string, outcome: LogOutcome, error?: unknown, fields?: Readonly<Record<string, unknown>>): void;
}

export const QUEUE_METRIC_NAMES = [
  'noma.outbox.pending',
  'noma.outbox.oldest_unpublished_seconds',
  'noma.outbox.dispatch.total',
  'noma.queue.jobs',
  'noma.queue.retry.total',
  'noma.queue.processing.duration_ms',
  'noma.queue.dead_letter.total',
  'noma.queue.dead_letter.open',
] as const;

export const RUNTIME_METRIC_NAMES = [
  'noma.http.server.request.total',
  'noma.http.server.duration_ms',
  'noma.dependency.probe.total',
  'noma.dependency.probe.duration_ms',
  'noma.telemetry.export.failure.total',
] as const;

export type QueueMetricName = (typeof QUEUE_METRIC_NAMES)[number];
export type RuntimeMetricName = (typeof RUNTIME_METRIC_NAMES)[number];
export type TelemetryMetricName = QueueMetricName | RuntimeMetricName;

export interface QueueMetricRecord {
  readonly name: QueueMetricName;
  readonly value: number;
  readonly attributes?: Readonly<Record<string, string>>;
}

export interface TelemetryMetricRecord {
  readonly name: TelemetryMetricName;
  readonly value: number;
  readonly attributes?: Readonly<Record<string, string>>;
}

export interface QueueMetricRecorder {
  record(metric: QueueMetricRecord): void;
}

export interface TelemetryMetricRecorder extends QueueMetricRecorder {
  record(metric: TelemetryMetricRecord): void;
}

export interface InMemoryTelemetrySnapshot {
  readonly spans: readonly ReadableSpan[];
  readonly metrics: readonly ResourceMetrics[];
}

export interface HttpRequestLike {
  readonly method?: string | undefined;
  readonly url?: string | undefined;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

export interface HttpResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  once(event: 'finish' | 'close', listener: () => void): unknown;
}

export interface ServerObservability {
  readonly mode: TelemetryMode;
  readonly logger: StructuredLogger;
  readonly metrics: TelemetryMetricRecorder;
  readonly nestLogger: Readonly<Record<'log' | 'error' | 'warn' | 'debug' | 'verbose', (...values: unknown[]) => void>>;
  currentCorrelation(): CorrelationContext | undefined;
  currentTraceContext(): TraceContextCarrier | undefined;
  httpMiddleware(request: HttpRequestLike, response: HttpResponseLike, next: () => void): void;
  withSpan<T>(
    name: string,
    attributes: Readonly<Record<string, string | number | boolean>>,
    operation: (span: Span) => Promise<T> | T,
    parent?: TraceContextCarrier,
  ): Promise<T>;
  withTraceContext<T>(carrier: TraceContextCarrier | undefined, operation: () => Promise<T> | T): Promise<T>;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
  snapshot(): InMemoryTelemetrySnapshot;
}

const SECRET_KEY_PATTERN = /(?:password|secret|token|authorization|cookie|session|credential|private.?key|api.?key|bank|account.?number|otp|evidence|message.?body|database.?url|redis.?url)/i;
const CREDENTIAL_URL_PATTERN = /\b(?:redis|rediss|postgres|postgresql|https?):\/\/[^\s/@:]+(?::[^\s/@]*)?@[^\s]+/gi;
const BEARER_PATTERN = /\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.:-]+/gi;
const TRACEPARENT_PATTERN = /^[0-9a-f]{2}-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const SAFE_EVENT_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const METRIC_ATTRIBUTE_KEYS = new Set([
  'dependency', 'job', 'method', 'outcome', 'owner', 'queue', 'route', 'runtime', 'state', 'status_class',
]);
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

function safeString(value: string, maximumLength = 500): string {
  return value
    .replace(CREDENTIAL_URL_PATTERN, '[REDACTED_URL]')
    .replace(BEARER_PATTERN, '[REDACTED_AUTHORIZATION]')
    .replace(/\b(password|secret|token|authorization|cookie|session|credential|api[_-]?key)\b\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/[\r\n\u2028\u2029]/g, ' ')
    .slice(0, maximumLength);
}

function sanitizeValue(value: unknown, key = '', depth = 0): unknown {
  if (SECRET_KEY_PATTERN.test(key)) return '[REDACTED]';
  if (depth > 6) return '[TRUNCATED]';
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : '[NON_FINITE]';
  if (typeof value === 'string') return safeString(value);
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return toSafeTelemetryError(value);
  if (Array.isArray(value)) return value.slice(0, 25).map((entry) => sanitizeValue(entry, '', depth + 1));
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value).slice(0, 50)) {
      result[entryKey] = sanitizeValue(entryValue, entryKey, depth + 1);
    }
    return result;
  }
  return String(value).slice(0, 100);
}

function stableErrorCode(error: Error): string {
  const candidate = 'code' in error && typeof error.code === 'string' ? error.code : error.name;
  const normalized = candidate.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase().slice(0, 80);
  return normalized || 'INTERNAL_ERROR';
}

export function toSafeTelemetryError(error: unknown): SafeTelemetryError {
  const candidate = error instanceof Error ? error : new Error('Unknown failure');
  const code = stableErrorCode(candidate);
  const lower = `${candidate.name} ${candidate.message}`.toLowerCase();
  const category = /config|environment/.test(lower)
    ? 'configuration'
    : /timeout|deadline|abort/.test(lower)
      ? 'timeout'
      : /invalid|validation|parse|schema/.test(lower)
        ? 'validation'
        : /redis|database|postgres|queue|dependency|connect/.test(lower)
          ? 'dependency'
          : 'internal';
  const safeMessage = safeString(candidate.message || candidate.name, 300);
  return Object.freeze({ category, code, message: safeMessage });
}

function headerValue(headers: HttpRequestLike['headers'], name: string): string | undefined {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
  return Array.isArray(entry) ? entry[0] : entry;
}

function normalizeIdentifier(candidate: string | undefined): string | undefined {
  const value = candidate?.trim();
  return value && SAFE_ID_PATTERN.test(value) ? value : undefined;
}

export function createCorrelationContext(headers: HttpRequestLike['headers'] = {}): CorrelationContext {
  const requestId = normalizeIdentifier(headerValue(headers, 'x-request-id')) ?? randomUUID();
  const correlationId = normalizeIdentifier(headerValue(headers, 'x-correlation-id')) ?? requestId;
  return Object.freeze({ requestId, correlationId });
}

export function parseTraceContextCarrier(value: unknown): TraceContextCarrier | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.traceparent !== 'string') return undefined;
  const traceparent = record.traceparent.toLowerCase();
  const match = TRACEPARENT_PATTERN.exec(traceparent);
  if (!match || /^0+$/.test(match[1] ?? '') || /^0+$/.test(match[2] ?? '')) return undefined;
  const tracestate = typeof record.tracestate === 'string' && record.tracestate.length <= 512 && !/[\r\n]/.test(record.tracestate)
    ? record.tracestate
    : undefined;
  return Object.freeze({ traceparent, ...(tracestate ? { tracestate } : {}) });
}

function activeTraceFields(): Readonly<Record<string, string>> {
  const span = trace.getActiveSpan();
  if (!span) return {};
  const spanContext = span.spanContext();
  return spanContext.isRemote || spanContext.traceId
    ? Object.freeze({ traceId: spanContext.traceId, spanId: spanContext.spanId })
    : {};
}

function createLogger(options: TelemetryRuntimeOptions): StructuredLogger {
  const write = options.writeLog ?? ((line: string) => process.stdout.write(`${line}\n`));
  const now = options.now ?? (() => new Date());
  const emit = (
    level: LogLevel,
    event: string,
    outcome: LogOutcome,
    fields: Readonly<Record<string, unknown>> = {},
    error?: unknown,
  ): void => {
    if (!SAFE_EVENT_PATTERN.test(event) || event.length > 120) throw new Error('log event must be a stable lowercase name');
    const correlation = correlationStorage.getStore();
    const record: StructuredLogRecord = {
      timestamp: now().toISOString(),
      level,
      service: options.serviceName,
      environment: options.environment,
      event,
      outcome,
      ...(options.releaseSha ? { releaseSha: options.releaseSha } : {}),
      ...(correlation ?? {}),
      ...activeTraceFields(),
      ...(sanitizeValue(fields) as Record<string, unknown>),
      ...(error === undefined ? {} : { error: toSafeTelemetryError(error) }),
    };
    write(JSON.stringify(record));
  };
  const logger: StructuredLogger = {
    debug: (event: string, outcome: LogOutcome, fields?: Readonly<Record<string, unknown>>) => emit('debug', event, outcome, fields),
    info: (event: string, outcome: LogOutcome, fields?: Readonly<Record<string, unknown>>) => emit('info', event, outcome, fields),
    warn: (event: string, outcome: LogOutcome, fields?: Readonly<Record<string, unknown>>) => emit('warn', event, outcome, fields),
    error: (event: string, outcome: LogOutcome, error?: unknown, fields?: Readonly<Record<string, unknown>>) => emit('error', event, outcome, fields, error),
  };
  return Object.freeze(logger);
}

function normalizeMetricAttributes(attributes: Readonly<Record<string, string>> | undefined): Attributes {
  const normalized: Attributes = {};
  for (const [key, rawValue] of Object.entries(attributes ?? {})) {
    if (!METRIC_ATTRIBUTE_KEYS.has(key)) throw new Error(`metric attribute ${key} is not approved`);
    const value = safeString(rawValue, 80);
    if (!/^[a-zA-Z0-9_./:-]{1,80}$/.test(value)) throw new Error(`metric attribute ${key} is not bounded`);
    normalized[key] = value;
  }
  return normalized;
}

export function createNoopQueueMetricRecorder(): QueueMetricRecorder {
  return Object.freeze({ record: () => undefined });
}

export function createInMemoryQueueMetricRecorder(): QueueMetricRecorder & {
  readonly snapshot: () => readonly QueueMetricRecord[];
} {
  const records: QueueMetricRecord[] = [];
  return Object.freeze({
    record(metric: QueueMetricRecord): void {
      if (!QUEUE_METRIC_NAMES.includes(metric.name) || !Number.isFinite(metric.value)) {
        throw new Error('queue metric must use an approved name and finite value');
      }
      normalizeMetricAttributes(metric.attributes);
      records.push(Object.freeze({
        ...metric,
        ...(metric.attributes ? { attributes: Object.freeze({ ...metric.attributes }) } : {}),
      }));
    },
    snapshot: () => Object.freeze([...records]),
  });
}

function routeTemplate(url: string | undefined): string {
  const path = (url ?? '/').split('?')[0] ?? '/';
  return path === '/health/live' || path === '/health/ready' ? path : '/unmatched';
}

function statusClass(statusCode: number): string {
  return `${Math.floor(statusCode / 100)}xx`;
}

function contextFromCarrier(carrier: TraceContextCarrier | undefined): Context {
  return carrier
    ? propagation.extract(ROOT_CONTEXT, carrier, {
        keys: (value) => Object.keys(value),
        get: (value, key) => value[key as keyof TraceContextCarrier],
      })
    : context.active();
}

function currentCarrier(): TraceContextCarrier | undefined {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier, { set: (target, key, value) => { target[key] = value; } });
  return parseTraceContextCarrier(carrier);
}

async function withinDeadline<T>(operation: Promise<T>, timeoutMilliseconds: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMilliseconds);
    timer.unref();
  });
  return Promise.race([operation, timeout]).finally(() => { if (timer) clearTimeout(timer); });
}

export async function startServerObservability(options: TelemetryRuntimeOptions): Promise<ServerObservability> {
  if (!TELEMETRY_MODES.includes(options.mode)) throw new Error('unsupported telemetry mode');
  if (options.mode === 'otlp' && !options.endpoint) throw new Error('OTLP endpoint is required');
  const traceSampleRatio = options.traceSampleRatio ?? (options.mode === 'in-memory' ? 1 : 0);
  if (!Number.isFinite(traceSampleRatio) || traceSampleRatio < 0 || traceSampleRatio > 1) {
    throw new Error('trace sample ratio must be from 0 through 1');
  }
  if (options.mode === 'otlp' && options.traceSampleRatio === undefined) {
    throw new Error('OTLP trace sample ratio must be configured explicitly');
  }
  const logger = createLogger(options);
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: options.serviceName,
    [ATTR_SERVICE_NAMESPACE]: 'noma',
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: options.environment,
    ...(options.releaseSha ? { [ATTR_SERVICE_VERSION]: options.releaseSha } : {}),
    ...(options.instanceId ? { 'service.instance.id': options.instanceId } : {}),
  });
  let sdk: NodeSDK | undefined;
  let spanExporter: InMemorySpanExporter | undefined;
  let metricExporter: InMemoryMetricExporter | undefined;
  let spanProcessor: SimpleSpanProcessor | BatchSpanProcessor | undefined;
  let metricReader: PeriodicExportingMetricReader | undefined;
  const exportInterval = options.exportIntervalMilliseconds ?? 30_000;
  const exportTimeout = options.exportTimeoutMilliseconds ?? 3_000;
  const shutdownTimeout = options.shutdownTimeoutMilliseconds ?? 5_000;

  if (options.mode !== 'disabled') {
    if (options.mode === 'in-memory') {
      spanExporter = new InMemorySpanExporter();
      metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
      spanProcessor = new SimpleSpanProcessor(spanExporter);
      metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: exportInterval,
        exportTimeoutMillis: exportTimeout,
        cardinalityLimits: { default: 100 },
      });
      sdk = new NodeSDK({
        resource,
        sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(traceSampleRatio) }),
        spanProcessors: [spanProcessor],
        metricReaders: [metricReader],
      });
    } else {
      const headers = options.authorization ? { Authorization: options.authorization } : {};
      const traceExporter = new OTLPTraceExporter({
        url: `${options.endpoint}/v1/traces`, headers, timeoutMillis: exportTimeout,
      });
      const metricsExporter = new OTLPMetricExporter({
        url: `${options.endpoint}/v1/metrics`, headers, timeoutMillis: exportTimeout,
      });
      spanProcessor = new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 512,
        maxExportBatchSize: 128,
        scheduledDelayMillis: Math.min(exportInterval, 5_000),
        exportTimeoutMillis: exportTimeout,
      });
      metricReader = new PeriodicExportingMetricReader({
        exporter: metricsExporter,
        exportIntervalMillis: exportInterval,
        exportTimeoutMillis: exportTimeout,
        cardinalityLimits: { default: 100 },
      });
      sdk = new NodeSDK({
        resource,
        sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(traceSampleRatio) }),
        spanProcessors: [spanProcessor],
        metricReaders: [metricReader],
      });
    }
    sdk.start();
  }

  const tracer = trace.getTracer('@noma/observability', '1.0.0');
  const meter = metrics.getMeter('@noma/observability', '1.0.0');
  const counters = new Map<string, ReturnType<typeof meter.createCounter>>();
  const histograms = new Map<string, ReturnType<typeof meter.createHistogram>>();
  const gauges = new Map<string, ReturnType<typeof meter.createGauge>>();
  const metricRecorder: TelemetryMetricRecorder = Object.freeze({
    record(metric: TelemetryMetricRecord): void {
      if (![...QUEUE_METRIC_NAMES, ...RUNTIME_METRIC_NAMES].includes(metric.name) || !Number.isFinite(metric.value)) {
        throw new Error('telemetry metric must use an approved name and finite value');
      }
      const attributes = normalizeMetricAttributes(metric.attributes);
      if (metric.name.endsWith('.duration_ms')) {
        const instrument = histograms.get(metric.name) ?? meter.createHistogram(metric.name, { unit: 'ms' });
        histograms.set(metric.name, instrument);
        instrument.record(metric.value, attributes);
      } else if (metric.name.endsWith('.total')) {
        if (metric.value < 0) throw new Error('counter metric value must be non-negative');
        const instrument = counters.get(metric.name) ?? meter.createCounter(metric.name);
        counters.set(metric.name, instrument);
        instrument.add(metric.value, attributes);
      } else {
        const instrument = gauges.get(metric.name) ?? meter.createGauge(metric.name);
        gauges.set(metric.name, instrument);
        instrument.record(metric.value, attributes);
      }
    },
  });

  const withSpan = async <T>(
    name: string,
    attributes: Readonly<Record<string, string | number | boolean>>,
    operation: (span: Span) => Promise<T> | T,
    parent?: TraceContextCarrier,
  ): Promise<T> => tracer.startActiveSpan(
    name,
    { kind: SpanKind.INTERNAL, attributes: sanitizeValue(attributes) as Attributes },
    contextFromCarrier(parent),
    async (span) => {
      try {
        const result = await operation(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const safe = toSafeTelemetryError(error);
        span.setAttributes({ 'error.type': safe.code, 'noma.error.category': safe.category });
        span.setStatus({ code: SpanStatusCode.ERROR, message: safe.code });
        throw error;
      } finally {
        span.end();
      }
    },
  );

  let shuttingDown = false;
  const runtime: ServerObservability = {
    mode: options.mode,
    logger,
    metrics: metricRecorder,
    nestLogger: Object.freeze({
      log: (...values) => logger.info('nest.log', 'succeeded', { values }),
      error: (...values) => logger.error('nest.error', 'failed', values[0], { values: values.slice(1) }),
      warn: (...values) => logger.warn('nest.warn', 'unavailable', { values }),
      debug: (...values) => logger.debug('nest.debug', 'succeeded', { values }),
      verbose: (...values) => logger.debug('nest.verbose', 'succeeded', { values }),
    }),
    currentCorrelation: () => correlationStorage.getStore(),
    currentTraceContext: currentCarrier,
    httpMiddleware(request, response, next): void {
      const correlation = createCorrelationContext(request.headers);
      response.setHeader('X-Request-Id', correlation.requestId);
      response.setHeader('X-Correlation-Id', correlation.correlationId);
      const route = routeTemplate(request.url);
      const method = (request.method ?? 'UNKNOWN').toUpperCase().slice(0, 12);
      const incoming = parseTraceContextCarrier({
        traceparent: headerValue(request.headers, 'traceparent'),
        tracestate: headerValue(request.headers, 'tracestate'),
      });
      const started = performance.now();
      correlationStorage.run(correlation, () => {
        const parent = contextFromCarrier(incoming);
        tracer.startActiveSpan(
          `${method} ${route}`,
          { kind: SpanKind.SERVER, attributes: { 'http.request.method': method, 'http.route': route } },
          parent,
          (span) => {
            let finished = false;
            const finish = (): void => {
              if (finished) return;
              finished = true;
              const outcome = response.statusCode >= 500 ? 'failed' : 'succeeded';
              span.setAttribute('http.response.status_code', response.statusCode);
              span.setStatus({ code: response.statusCode >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK });
              metricRecorder.record({
                name: 'noma.http.server.request.total', value: 1,
                attributes: { method, route, outcome, status_class: statusClass(response.statusCode) },
              });
              metricRecorder.record({
                name: 'noma.http.server.duration_ms', value: performance.now() - started,
                attributes: { method, route, outcome },
              });
              logger.info('http.request.completed', outcome, { method, route, statusCode: response.statusCode, durationMilliseconds: performance.now() - started });
              span.end();
            };
            response.once('finish', finish);
            response.once('close', finish);
            next();
          },
        );
      });
    },
    withSpan,
    withTraceContext: async <T>(carrier: TraceContextCarrier | undefined, operation: () => Promise<T> | T): Promise<T> => {
      const parent = contextFromCarrier(carrier);
      return context.with(parent, () => Promise.resolve(operation()));
    },
    forceFlush: async (): Promise<void> => {
      if (!sdk) return;
      await withinDeadline(
        Promise.all([spanProcessor?.forceFlush(), metricReader?.forceFlush()]).then(() => undefined),
        exportTimeout,
        'telemetry flush deadline exceeded',
      );
    },
    shutdown: async (): Promise<void> => {
      if (shuttingDown) return;
      shuttingDown = true;
      if (sdk) await withinDeadline(sdk.shutdown(), shutdownTimeout, 'telemetry shutdown deadline exceeded');
    },
    snapshot: (): InMemoryTelemetrySnapshot => Object.freeze({
      spans: Object.freeze([...(spanExporter?.getFinishedSpans() ?? [])]),
      metrics: Object.freeze([...(metricExporter?.getMetrics() ?? [])]),
    }),
  };
  return Object.freeze(runtime);
}
