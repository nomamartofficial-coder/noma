import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createCorrelationContext,
  parseTraceContextCarrier,
  startServerObservability,
  toSafeTelemetryError,
  type ServerObservability,
} from '../src/server.js';

const runtimes: ServerObservability[] = [];
afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.shutdown()));
});

describe('server observability', () => {
  it('requires explicit bounded OTLP sampling', async () => {
    await expect(startServerObservability({
      serviceName: 'noma-api', environment: 'test', mode: 'otlp', endpoint: 'http://127.0.0.1:4318',
    })).rejects.toThrow(/sample ratio/i);
    await expect(startServerObservability({
      serviceName: 'noma-api', environment: 'test', mode: 'otlp', endpoint: 'http://127.0.0.1:4318', traceSampleRatio: 2,
    })).rejects.toThrow(/sample ratio/i);
  });
  it('creates bounded correlation identities and rejects malformed trace context', () => {
    expect(createCorrelationContext({ 'x-request-id': 'request_123', 'x-correlation-id': 'correlation_456' })).toEqual({
      requestId: 'request_123',
      correlationId: 'correlation_456',
    });
    expect(parseTraceContextCarrier({ traceparent: '00-00000000000000000000000000000000-0000000000000000-01' })).toBeUndefined();
    expect(parseTraceContextCarrier({ traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' })).toEqual({
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    });
  });

  it('redacts nested secrets, credential URLs, authorization, and unsafe errors', async () => {
    const lines: string[] = [];
    const runtime = await startServerObservability({
      serviceName: 'noma-api', environment: 'test', mode: 'disabled', writeLog: (line) => lines.push(line),
      now: () => new Date('2026-08-09T12:00:00.000Z'),
    });
    runtimes.push(runtime);
    runtime.logger.error('test.failure', 'failed', new Error('postgresql://user:password@db/noma token=abc'), {
      authorization: 'Bearer private',
      nested: { password: 'private', note: 'redis://default:private@redis:6379' },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('password@db');
    expect(lines[0]).not.toContain('Bearer private');
    expect(lines[0]).not.toContain('default:private');
    expect(lines[0]).not.toContain('"password":"private"');
    expect(lines[0]).toContain('[REDACTED]');
  });

  it('records connected in-memory spans and low-cardinality metrics', async () => {
    const runtime = await startServerObservability({
      serviceName: 'noma-worker', environment: 'test', mode: 'in-memory', writeLog: () => undefined,
      exportIntervalMilliseconds: 5_000,
    });
    runtimes.push(runtime);
    let carrier;
    await runtime.withSpan('noma.synthetic.request', { 'noma.runtime': 'worker' }, async () => {
      carrier = runtime.currentTraceContext();
      runtime.metrics.record({
        name: 'noma.queue.retry.total', value: 1, attributes: { queue: 'maintenance', outcome: 'failed' },
      });
    });
    expect(carrier).toMatchObject({ traceparent: expect.stringMatching(/^00-/) });
    await runtime.forceFlush();
    expect(runtime.snapshot().spans.map((span) => span.name)).toContain('noma.synthetic.request');
    expect(runtime.snapshot().metrics.length).toBeGreaterThan(0);
    expect(() => runtime.metrics.record({
      name: 'noma.queue.retry.total', value: 1, attributes: { eventId: 'dynamic-id' },
    })).toThrow(/not approved/);
  });

  it('sets response correlation headers and emits a completion record', async () => {
    const lines: string[] = [];
    const runtime = await startServerObservability({
      serviceName: 'noma-api', environment: 'test', mode: 'disabled', writeLog: (line) => lines.push(line),
    });
    runtimes.push(runtime);
    const response = new EventEmitter() as EventEmitter & {
      statusCode: number;
      headers: Record<string, string>;
      setHeader(name: string, value: string): void;
    };
    response.statusCode = 200;
    response.headers = {};
    response.setHeader = (name, value) => { response.headers[name] = value; };
    runtime.httpMiddleware(
      { method: 'GET', url: '/health/live?unsafe=ignored', headers: { 'x-correlation-id': 'correlation_123' } },
      response,
      () => response.emit('finish'),
    );
    expect(response.headers['X-Correlation-Id']).toBe('correlation_123');
    expect(response.headers['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(lines.at(-1) ?? '{}')).toMatchObject({
      event: 'http.request.completed', correlationId: 'correlation_123', route: '/health/live', statusCode: 200,
    });
  });

  it('classifies errors without stack traces', () => {
    const safe = toSafeTelemetryError(new Error('Redis connection timeout token=private'));
    expect(safe).toMatchObject({ category: 'timeout', code: 'ERROR' });
    expect(JSON.stringify(safe)).not.toContain('private');
    expect(JSON.stringify(safe)).not.toContain('at ');
  });
});
