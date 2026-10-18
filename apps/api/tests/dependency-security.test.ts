import 'reflect-metadata';

import { createRequire } from 'node:module';

import type { ServerRuntimeConfig } from '@noma/config/server';
import { describe, expect, test } from 'vitest';

import { AuthController } from '../dist/auth/auth.controller.js';
import type { AuthRuntimeService } from '../dist/auth/auth-runtime.service.js';

// Exercise the API adapter's installed dependency, not an unrelated root copy.
const apiRequire = createRequire(new URL('../package.json', import.meta.url));
const adapterRequire = createRequire(apiRequire.resolve('@nestjs/platform-express'));
const expressRequire = createRequire(adapterRequire.resolve('express'));
const proxyAddr = expressRequire('proxy-addr') as {
  (request: { socket: { remoteAddress: string }; headers: Record<string, string> }, trust: (address: string) => boolean): string;
  compile(subnets: string | string[]): (address: string) => boolean;
};
const express = adapterRequire('express') as () => { get(setting: string): unknown };

// This dedicated suite runs after the full API build; auth:test stays build-order independent.
describe('Group A authentication network authority', () => {
  test.each(['198.51.100.77', '::ffff:198.51.100.77', undefined])('forwarding headers cannot replace socket peer %s', async (remoteAddress) => {
    const signals: string[] = [];
    // Substitute only the application-service port; exercise the real HTTP controller mapping.
    const runtime = {
      configured: () => true,
      authentication: () => ({
        register: async ({ networkSignal }: { networkSignal: string }) => {
          signals.push(networkSignal);
          return { status: 'REQUEST_ACCEPTED' };
        },
      }),
    } as unknown as AuthRuntimeService;
    const config = {
      applicationEnvironment: 'test', publicWebOrigin: 'http://127.0.0.1:3000',
      authentication: { absoluteMilliseconds: 60_000 },
    } as ServerRuntimeConfig;
    const controller = new AuthController(runtime, config);
    const request = {
      headers: {
        origin: config.publicWebOrigin,
        'x-forwarded-for': '10.1.2.3, 192.0.2.9',
        forwarded: 'for=10.1.2.3;proto=https',
        'x-real-ip': '10.1.2.3',
      },
      ip: '10.1.2.3', ips: ['10.1.2.3'],
      ...(remoteAddress === undefined ? {} : { socket: { remoteAddress } }),
    };
    expect(await controller.register({ email: 'proxy-boundary@noma.test', password: 'Synthetic boundary passphrase', displayName: 'Synthetic User' }, request)).toEqual({ status: 'REQUEST_ACCEPTED' });
    expect(signals).toEqual([remoteAddress ?? 'unknown-network']);
  });
});

describe('Group A proxy subnet trust boundary (GHSA-jqcg-44mw-7w3h)', () => {
  test.each(['::ffff:10.0.0.0/8', '::ffff:0a00:0000/8', '::/1', '::/64'])('%s cannot trust unrelated IPv4 peers', (subnet) => {
    for (const ranges of [subnet, [subnet, '192.0.2.0/24']]) {
      const trust = proxyAddr.compile(ranges);
      expect(trust('198.51.100.77')).toBe(false);
      expect(proxyAddr({
        socket: { remoteAddress: '198.51.100.77' },
        headers: { 'x-forwarded-for': '10.1.2.3, 192.0.2.4' },
      }, trust)).toBe('198.51.100.77');
    }
  });

  test.each(['10.0.0.0/8', '::ffff:10.0.0.0/104'])('%s preserves correctly specified IPv4 trust', (subnet) => {
    const trust = proxyAddr.compile(subnet);
    expect(trust('10.1.2.3')).toBe(true);
    expect(trust('::ffff:10.1.2.3')).toBe(true);
    expect(trust('198.51.100.77')).toBe(false);
    expect(trust('::ffff:198.51.100.77')).toBe(false);
    expect(proxyAddr({ socket: { remoteAddress: '10.1.2.3' }, headers: { 'x-forwarded-for': '192.0.2.9' } }, trust)).toBe('192.0.2.9');
  });

  test('ordinary IPv6 trust and Express default no-proxy behavior remain intact', () => {
    const trust = proxyAddr.compile('2001:db8::/32');
    expect(trust('2001:db8:1::1')).toBe(true);
    expect(trust('2001:db9::1')).toBe(false);
    expect(trust('198.51.100.77')).toBe(false);
    expect(express().get('trust proxy')).toBe(false);
  });
});
