import { randomUUID } from 'node:crypto';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import { PasswordPolicyError } from '@noma/security';
import { AuthenticationFailure, IdentityProofFailure, type AuthenticationPrincipal } from '@noma/platform/identity';

import { API_RUNTIME_CONFIG } from '../runtime-dependencies.service.js';
import {
  createAuthenticationCookiePolicy,
  readAuthenticationCookie,
  serializeAuthenticationCookie,
  type AuthenticationCookiePolicy,
} from './auth-cookie.js';
import { AuthRuntimeService } from './auth-runtime.service.js';

interface RequestLike {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly socket?: { readonly remoteAddress?: string };
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
}

type ObjectBody = Readonly<Record<string, unknown>>;

function requireObjectBody(value: unknown): ObjectBody {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpException({ code: 'INVALID_REQUEST' }, 400);
  return value as ObjectBody;
}

function requireString(body: ObjectBody, name: string, maximum: number): string {
  const value = body[name];
  if (typeof value !== 'string' || !value || value.length > maximum) {
    throw new HttpException({ code: 'INVALID_REQUEST' }, 400);
  }
  return value;
}

function header(request: RequestLike, name: string): string | undefined {
  const value = Object.entries(request.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  return Array.isArray(value) ? value[0] : value;
}

function clientFamily(request: RequestLike): string | undefined {
  const agent = header(request, 'user-agent') ?? '';
  if (/firefox/i.test(agent)) return 'Firefox';
  if (/edg/i.test(agent)) return 'Edge';
  if (/chrome/i.test(agent)) return 'Chrome';
  if (/safari/i.test(agent)) return 'Safari';
  return agent ? 'Other browser' : undefined;
}

@Controller('api/v1/auth')
export class AuthController {
  readonly #cookiePolicy: AuthenticationCookiePolicy;

  constructor(
    private readonly runtime: AuthRuntimeService,
    @Inject(API_RUNTIME_CONFIG) private readonly config: ServerRuntimeConfig,
  ) {
    this.#cookiePolicy = createAuthenticationCookiePolicy(
      config.applicationEnvironment,
      config.authentication.absoluteMilliseconds,
    );
  }

  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  async register(@Body() candidate: unknown, @Req() request: RequestLike) {
    this.#requireOrigin(request);
    const body = requireObjectBody(candidate);
    this.#rejectUnknownFields(body, ['email', 'password', 'displayName', 'locale']);
    try {
      return await this.#auth().register({
        email: requireString(body, 'email', 320),
        password: requireString(body, 'password', 1_024),
        displayName: requireString(body, 'displayName', 160),
        ...(body.locale === undefined ? {} : { locale: requireString(body, 'locale', 35) }),
        networkSignal: request.socket?.remoteAddress ?? 'unknown-network',
      });
    } catch (error) {
      this.#throwPublic(error, false);
    }
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() candidate: unknown, @Req() request: RequestLike, @Res({ passthrough: true }) response: ResponseLike) {
    this.#requireOrigin(request);
    const body = requireObjectBody(candidate);
    this.#rejectUnknownFields(body, ['email', 'password']);
    try {
      const presentedSessionToken = readAuthenticationCookie(header(request, 'cookie'), this.#cookiePolicy);
      const browserFamily = clientFamily(request);
      const result = await this.#auth().signIn({
        email: requireString(body, 'email', 320),
        password: requireString(body, 'password', 1_024),
        networkSignal: request.socket?.remoteAddress ?? 'unknown-network',
        ...(presentedSessionToken ? { presentedSessionToken } : {}),
        deviceLabel: 'Web browser',
        ...(browserFamily ? { clientFamily: browserFamily } : {}),
      });
      response.setHeader('Set-Cookie', this.#sessionCookie(result.rawSessionToken));
      return this.#principalBody(result.principal);
    } catch (error) {
      this.#throwPublic(error, true);
    }
  }

  @Post('email-verification/request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestEmailVerification(@Body() candidate: unknown, @Req() request: RequestLike) {
    this.#requireOrigin(request);
    const body = requireObjectBody(candidate);
    this.#rejectUnknownFields(body, ['email']);
    try {
      return await this.#proofs().requestEmailVerification({
        email: requireString(body, 'email', 320),
        networkSignal: request.socket?.remoteAddress ?? 'unknown-network',
        correlationId: randomUUID(),
      });
    } catch (error) {
      this.#throwPublic(error, false);
    }
  }

  @Post('email-verification/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmEmailVerification(@Body() candidate: unknown, @Req() request: RequestLike) {
    this.#requireOrigin(request);
    const body = requireObjectBody(candidate);
    this.#rejectUnknownFields(body, ['token']);
    try {
      const presentedSessionToken = readAuthenticationCookie(header(request, 'cookie'), this.#cookiePolicy);
      return await this.#proofs().confirmEmailVerification({
        rawToken: requireString(body, 'token', 128),
        networkSignal: request.socket?.remoteAddress ?? 'unknown-network',
        ...(presentedSessionToken ? { presentedSessionToken } : {}),
      });
    } catch (error) {
      this.#throwPublic(error, false);
    }
  }

  @Post('password-recovery/request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestPasswordRecovery(@Body() candidate: unknown, @Req() request: RequestLike) {
    this.#requireOrigin(request);
    const body = requireObjectBody(candidate);
    this.#rejectUnknownFields(body, ['email']);
    try {
      return await this.#proofs().requestPasswordRecovery({
        email: requireString(body, 'email', 320),
        networkSignal: request.socket?.remoteAddress ?? 'unknown-network',
        correlationId: randomUUID(),
      });
    } catch (error) {
      this.#throwPublic(error, false);
    }
  }

  @Post('password-recovery/complete')
  @HttpCode(HttpStatus.OK)
  async completePasswordRecovery(@Body() candidate: unknown, @Req() request: RequestLike, @Res({ passthrough: true }) response: ResponseLike) {
    this.#requireOrigin(request);
    const body = requireObjectBody(candidate);
    this.#rejectUnknownFields(body, ['token', 'newPassword']);
    try {
      const result = await this.#proofs().completePasswordRecovery({
        rawToken: requireString(body, 'token', 128),
        newPassword: requireString(body, 'newPassword', 1_024),
        networkSignal: request.socket?.remoteAddress ?? 'unknown-network',
        correlationId: randomUUID(),
      });
      response.setHeader('Set-Cookie', this.#clearCookie());
      return result;
    } catch (error) {
      this.#throwPublic(error, false);
    }
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(@Req() request: RequestLike, @Res({ passthrough: true }) response: ResponseLike): Promise<void> {
    this.#requireOrigin(request);
    await this.#auth().signOut(readAuthenticationCookie(header(request, 'cookie'), this.#cookiePolicy));
    response.setHeader('Set-Cookie', this.#clearCookie());
  }

  @Get('session')
  async session(@Req() request: RequestLike) {
    const token = readAuthenticationCookie(header(request, 'cookie'), this.#cookiePolicy);
    if (!token) throw new HttpException({ code: 'AUTHENTICATION_REQUIRED' }, 401);
    try {
      return this.#principalBody(await this.#auth().resolveSession(token));
    } catch (error) {
      this.#throwPublic(error, true);
    }
  }

  #auth() {
    if (!this.runtime.configured()) throw new HttpException({ code: 'AUTHENTICATION_UNAVAILABLE' }, 503);
    return this.runtime.authentication();
  }

  #proofs() {
    if (!this.runtime.configured()) throw new HttpException({ code: 'AUTHENTICATION_UNAVAILABLE' }, 503);
    return this.runtime.verificationRecovery();
  }

  #requireOrigin(request: RequestLike): void {
    if (header(request, 'origin') !== this.config.publicWebOrigin) {
      throw new HttpException({ code: 'ORIGIN_NOT_ALLOWED' }, 403);
    }
  }

  #rejectUnknownFields(body: ObjectBody, allowed: readonly string[]): void {
    if (Object.keys(body).some((key) => !allowed.includes(key))) {
      throw new HttpException({ code: 'INVALID_REQUEST' }, 400);
    }
  }

  #principalBody(principal: AuthenticationPrincipal) {
    return Object.freeze({
      userId: principal.userId,
      sessionId: principal.sessionId,
      accountStatus: principal.accountStatus,
      assurance: principal.assurance,
      issuedAt: principal.issuedAt.toISOString(),
      idleExpiresAt: principal.idleExpiresAt.toISOString(),
      absoluteExpiresAt: principal.absoluteExpiresAt.toISOString(),
    });
  }

  #sessionCookie(rawToken: string): string {
    return serializeAuthenticationCookie(this.#cookiePolicy, rawToken);
  }

  #clearCookie(): string {
    return serializeAuthenticationCookie(this.#cookiePolicy, undefined);
  }

  #throwPublic(error: unknown, signIn: boolean): never {
    if (error instanceof HttpException) throw error;
    if (error instanceof PasswordPolicyError) throw new HttpException({ code: 'PASSWORD_REJECTED' }, 400);
    if (error instanceof IdentityProofFailure) throw new HttpException({ code: error.code }, 400);
    if (error instanceof AuthenticationFailure) {
      if (error.code === 'AUTH_RATE_LIMITED') {
        throw new HttpException({ code: 'AUTH_RATE_LIMITED', retryAfterSeconds: error.retryAfterSeconds }, 429);
      }
      if (error.code === 'AUTH_DEPENDENCY_UNAVAILABLE') {
        throw new HttpException({ code: 'AUTHENTICATION_UNAVAILABLE' }, 503);
      }
      if (error.code === 'ACCOUNT_UNAVAILABLE') {
        throw new HttpException({ code: 'ACCOUNT_UNAVAILABLE' }, 403);
      }
      throw new HttpException({ code: signIn ? 'AUTHENTICATION_FAILED' : 'INVALID_REQUEST' }, 401);
    }
    if (error instanceof Error && /email|password|displayName|locale/i.test(error.message)) {
      throw new HttpException({ code: signIn ? 'AUTHENTICATION_FAILED' : 'INVALID_REQUEST' }, signIn ? 401 : 400);
    }
    throw error;
  }
}
