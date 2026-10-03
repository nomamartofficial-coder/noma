import { randomUUID } from 'node:crypto';

import { Body, Controller, Header, HttpCode, HttpException, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import type { AccessApprovalOperation, AccessEnvironment, AccessReviewOutcome, AccessScopeType } from '@noma/platform/access';
import { createAuthenticationCookiePolicy, readAuthenticationCookie } from '../auth/auth-cookie.js';
import { AuthRuntimeService } from '../auth/auth-runtime.service.js';
import { API_RUNTIME_CONFIG } from '../runtime-dependencies.service.js';
import { decideAuthorizedAccessAssignment, executeAuthorizedAccessAssignment, requestAuthorizedAccessAssignment } from './access-assignment-workflow.js';
import { readAuthorizedScopedAssignments, type AssignmentFilter } from './access-assignment-disclosure.js';
import { readAuthorizedApprovalQueue, type ApprovalFilter } from './access-approval-disclosure.js';
import { readAuthorizedExportApprovalQueue } from './access-review-export-approval-disclosure.js';
import { resolveAccessAdminContext } from './access-context.js';
import { attestAuthorizedAccessReviewItem } from './access-review-attestation.js';
import { readAuthorizedAccessReviewQueue } from './access-review-disclosure.js';
import {
  decideAuthorizedAccessReviewExport, executeAuthorizedAccessReviewExport, requestAuthorizedAccessReviewExport,
} from './access-review-export-workflow.js';
import { AuthorizationDeniedError, AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

interface RequestLike { readonly headers: Readonly<Record<string, string | string[] | undefined>> }
interface ResponseLike { setHeader(name: string, value: string): void }
type BodyObject = Readonly<Record<string, unknown>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SCOPES: readonly AccessScopeType[] = Object.freeze([
  'SELF', 'SELLER', 'INSTITUTION', 'ORDER', 'CASE', 'ASSIGNMENT', 'FULFILMENT_LOCATION', 'QUEUE', 'CARRIER', 'PLATFORM',
]);
const OUTCOMES: readonly AccessReviewOutcome[] = Object.freeze(['RETAIN_CONFIRMED', 'REVOKE_REQUESTED', 'NEEDS_FOLLOW_UP']);
const FILTERS = Object.freeze(['ALL', 'DUE', 'OVERDUE', 'COMPLETED', 'UNRESOLVED'] as const);
const ASSIGNMENT_FILTERS = Object.freeze(['ALL', 'ACTIVE', 'EXPIRED', 'REVOKED', 'TEMPORARY'] as const);
const APPROVAL_FILTERS = Object.freeze(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const);

function header(request: RequestLike, name: string): string | undefined {
  const value = Object.entries(request.headers).find(([key]) => key.toLowerCase() === name)?.[1];
  return Array.isArray(value) ? value[0] : value;
}

function bodyObject(candidate: unknown, allowed: readonly string[], required: readonly string[]): BodyObject {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
  const body = candidate as BodyObject;
  if (Object.keys(body).some((key) => !allowed.includes(key)) || required.some((key) => !(key in body))) {
    throw new HttpException({ status: 'UNAVAILABLE' }, 404);
  }
  return body;
}

function string(body: BodyObject, key: string, maximum = 500): string {
  const value = body[key];
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum || value !== value.trim()
    || /[\u0000-\u001f\u007f]/u.test(value)) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
  return value;
}

function uuid(body: BodyObject, key: string): string {
  const value = string(body, key, 36);
  if (!UUID.test(value)) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
  return value;
}

function key(body: BodyObject, name: string): string {
  const value = string(body, name, 160);
  if (!KEY.test(value)) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
  return value;
}

function instant(body: BodyObject, name: string): Date {
  const value = string(body, name, 35);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
  return parsed;
}

function integer(body: BodyObject, name: string, max: number): number {
  const value = body[name];
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > max) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
  return value as number;
}

@Controller('api/v1/admin/access')
export class AccessAdminController {
  readonly #cookiePolicy;

  constructor(
    private readonly runtime: AuthRuntimeService,
    private readonly authorization: AuthorizationService,
    @Inject(API_RUNTIME_CONFIG) private readonly config: ServerRuntimeConfig,
  ) {
    this.#cookiePolicy = createAuthenticationCookiePolicy(config.applicationEnvironment, config.authentication.absoluteMilliseconds);
  }

  #actor(request: RequestLike) {
    if (header(request, 'origin') !== this.config.publicWebOrigin
      || header(request, 'x-csrf-token') !== 'noma-admin-v1') {
      throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    }
    const rawSessionToken = readAuthenticationCookie(header(request, 'cookie'), this.#cookiePolicy);
    if (!rawSessionToken || !this.runtime.configured()) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    const environment = this.config.applicationEnvironment;
    if (environment === 'development') throw new HttpException({ status: 'UNAVAILABLE' }, 503);
    return { rawSessionToken, environment: environment as AccessEnvironment, at: new Date(), correlationId: randomUUID() };
  }

  async #safe<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof AuthorizationDeniedError || error instanceof ProtectedDisclosureUnavailableError) {
        throw new HttpException({ status: 'UNAVAILABLE' }, 404);
      }
      // Never serialize an ORM exception or sensitive Access fact to the browser.
      throw new HttpException({ status: 'UNAVAILABLE' }, 503);
    }
  }

  async #requestAssignment(candidate: unknown, request: RequestLike, operation: AccessApprovalOperation) {
    const grant = operation === 'ASSIGNMENT_GRANT' || operation === 'TEMPORARY_ACCESS_GRANT';
    const allowed = grant
      ? ['authorityAssignmentId', 'scopeId', 'scopeType', 'subjectType', 'targetId', 'roleTemplateId', 'validFrom', 'validUntil', 'reason', 'idempotencyKey', 'expiresAt']
      : ['authorityAssignmentId', 'scopeId', 'scopeType', 'subjectType', 'targetId', 'roleTemplateId', 'validFrom', 'validUntil', 'reason', 'idempotencyKey', 'expiresAt', 'roleAssignmentId', 'expectedVersion'];
    const body = bodyObject(candidate, allowed, allowed.filter((name) => name !== 'validUntil'));
    const actor = this.#actor(request);
    const subjectType = string(body, 'subjectType', 24);
    const scopeType = string(body, 'scopeType', 24) as AccessScopeType;
    if ((subjectType !== 'HUMAN' && subjectType !== 'SERVICE_PRINCIPAL') || !SCOPES.includes(scopeType)) {
      throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    }
    const targetId = uuid(body, 'targetId');
    const subject = subjectType === 'HUMAN'
      ? { subjectType: 'HUMAN' as const, userId: targetId }
      : { subjectType: 'SERVICE_PRINCIPAL' as const, servicePrincipalId: targetId };
    return this.#safe(() => requestAuthorizedAccessAssignment(this.runtime.database(), this.authorization, {
      ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId: uuid(body, 'scopeId'),
      auditEventId: randomUUID(), operationId: key(body, 'idempotencyKey'),
      approvalRequestId: randomUUID(), operation, subject, roleTemplateId: uuid(body, 'roleTemplateId'),
      scopeType, requestedValidFrom: instant(body, 'validFrom'),
      requestedValidUntil: body.validUntil === undefined || body.validUntil === null ? null : instant(body, 'validUntil'),
      reason: string(body, 'reason'), expiresAt: instant(body, 'expiresAt'), idempotencyKey: key(body, 'idempotencyKey'),
      ...(grant ? {} : { revocationTarget: {
        assignmentId: uuid(body, 'roleAssignmentId'), expectedVersion: integer(body, 'expectedVersion', 1_000_000),
      } }),
    }));
  }

  @Post('assignments/grant/request') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  grantRequest(@Body() body: unknown, @Req() request: RequestLike) { return this.#requestAssignment(body, request, 'ASSIGNMENT_GRANT'); }

  @Post('assignments/revoke/request') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  revokeRequest(@Body() body: unknown, @Req() request: RequestLike) { return this.#requestAssignment(body, request, 'ASSIGNMENT_REVOKE'); }

  @Post('temporary/grant/request') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  temporaryGrantRequest(@Body() body: unknown, @Req() request: RequestLike) { return this.#requestAssignment(body, request, 'TEMPORARY_ACCESS_GRANT'); }

  @Post('temporary/revoke/request') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  temporaryRevokeRequest(@Body() body: unknown, @Req() request: RequestLike) { return this.#requestAssignment(body, request, 'TEMPORARY_ACCESS_REVOKE'); }

  @Post('approvals/decide') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  decide(@Body() candidate: unknown, @Req() request: RequestLike) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'approvalRequestId', 'decision', 'reason'],
      ['authorityAssignmentId', 'scopeId', 'approvalRequestId', 'decision', 'reason']);
    const decision = string(body, 'decision', 7);
    if (decision !== 'APPROVE' && decision !== 'REJECT') throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    const actor = this.#actor(request);
    return this.#safe(() => decideAuthorizedAccessAssignment(this.runtime.database(), this.authorization, {
      ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId: uuid(body, 'scopeId'),
      approvalRequestId: uuid(body, 'approvalRequestId'), decision, reason: string(body, 'reason'),
      auditEventId: randomUUID(), decisionId: randomUUID(), operationId: randomUUID(),
    }));
  }

  @Post('approvals/query') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  approvals(@Body() candidate: unknown, @Req() request: RequestLike) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'filter', 'pageSize', 'afterId'],
      ['authorityAssignmentId', 'scopeId', 'filter', 'pageSize']);
    const filter = string(body, 'filter', 16) as ApprovalFilter;
    if (!APPROVAL_FILTERS.includes(filter)) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    const actor = this.#actor(request);
    const scopeId = uuid(body, 'scopeId');
    return this.#safe(() => readAuthorizedApprovalQueue(this.runtime.database(), this.authorization, {
      scopeId, filter, pageSize: integer(body, 'pageSize', 100),
      ...(body.afterId === undefined ? {} : { afterId: uuid(body, 'afterId') }),
      resolveContext: (transaction) => resolveAccessAdminContext(transaction, {
        ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId,
        actionId: 'access.approval.read', evaluatedAt: actor.at,
      }),
    }));
  }

  async #executeAssignment(candidate: unknown, request: RequestLike, operation: AccessApprovalOperation) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'approvalRequestId', 'idempotencyKey'],
      ['authorityAssignmentId', 'scopeId', 'approvalRequestId', 'idempotencyKey']);
    const actor = this.#actor(request);
    return this.#safe(async () => {
      const approvalRequestId = uuid(body, 'approvalRequestId');
      const exact = await this.runtime.database().approvalRequest.findFirst({
        where: { id: approvalRequestId, scopeId: uuid(body, 'scopeId'), operation },
        include: { revocationTarget: true },
      });
      if (!exact) throw new ProtectedDisclosureUnavailableError();
      const grant = operation === 'ASSIGNMENT_GRANT' || operation === 'TEMPORARY_ACCESS_GRANT';
      return executeAuthorizedAccessAssignment(this.runtime.database(), this.authorization, {
        ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId: uuid(body, 'scopeId'),
        approvalRequestId, roleAssignmentId: grant ? approvalRequestId
          : exact.revocationTarget?.roleAssignmentId ?? (() => { throw new ProtectedDisclosureUnavailableError(); })(),
        ...(operation === 'TEMPORARY_ACCESS_GRANT' ? { temporaryGrantId: randomUUID() } : {}),
        ...(grant ? { reviewCycleId: randomUUID(), reviewItemId: randomUUID() } : {}),
        effectId: randomUUID(), containmentTransitionId: randomUUID(), auditEventId: randomUUID(),
        idempotencyKey: key(body, 'idempotencyKey'), operationId: key(body, 'idempotencyKey'),
      });
    });
  }

  @Post('assignments/grant/execute') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  grant(@Body() body: unknown, @Req() request: RequestLike) { return this.#executeAssignment(body, request, 'ASSIGNMENT_GRANT'); }

  @Post('assignments/revoke/execute') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  revoke(@Body() body: unknown, @Req() request: RequestLike) { return this.#executeAssignment(body, request, 'ASSIGNMENT_REVOKE'); }

  @Post('temporary/grant/execute') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  temporaryGrant(@Body() body: unknown, @Req() request: RequestLike) { return this.#executeAssignment(body, request, 'TEMPORARY_ACCESS_GRANT'); }

  @Post('temporary/revoke/execute') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  temporaryRevoke(@Body() body: unknown, @Req() request: RequestLike) { return this.#executeAssignment(body, request, 'TEMPORARY_ACCESS_REVOKE'); }

  @Post('assignments/query') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  assignments(@Body() candidate: unknown, @Req() request: RequestLike) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'filter', 'pageSize', 'afterId'],
      ['authorityAssignmentId', 'scopeId', 'filter', 'pageSize']);
    const filter = string(body, 'filter', 16) as AssignmentFilter;
    if (!ASSIGNMENT_FILTERS.includes(filter)) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    const actor = this.#actor(request);
    const scopeId = uuid(body, 'scopeId');
    return this.#safe(() => readAuthorizedScopedAssignments(this.runtime.database(), this.authorization, {
      scopeId, filter, pageSize: integer(body, 'pageSize', 100),
      ...(body.afterId === undefined ? {} : { afterId: uuid(body, 'afterId') }),
      resolveContext: (transaction) => resolveAccessAdminContext(transaction, {
        ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId,
        actionId: 'access.assignment.read', evaluatedAt: actor.at,
      }),
    }));
  }

  @Post('reviews/query') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  reviewQueue(@Body() candidate: unknown, @Req() request: RequestLike) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'filter', 'pageSize', 'cursor'],
      ['authorityAssignmentId', 'scopeId', 'filter', 'pageSize']);
    const filter = string(body, 'filter', 16) as (typeof FILTERS)[number];
    if (!FILTERS.includes(filter)) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    const actor = this.#actor(request);
    const scopeId = uuid(body, 'scopeId');
    return this.#safe(() => readAuthorizedAccessReviewQueue(this.runtime.database(), this.authorization, {
      scopeId, filter, pageSize: integer(body, 'pageSize', 100),
      ...(body.cursor === undefined ? {} : { cursor: string(body, 'cursor', 512) }),
      resolveContext: (transaction) => resolveAccessAdminContext(transaction, {
        ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId,
        actionId: 'access.review.read', evaluatedAt: actor.at,
      }),
    }));
  }

  @Post('reviews/attest') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  attest(@Body() candidate: unknown, @Req() request: RequestLike) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'reviewItemId', 'expectedItemVersion', 'outcome', 'reason', 'operationId'],
      ['authorityAssignmentId', 'scopeId', 'reviewItemId', 'expectedItemVersion', 'outcome', 'reason', 'operationId']);
    const outcome = string(body, 'outcome', 24) as AccessReviewOutcome;
    if (!OUTCOMES.includes(outcome)) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    const actor = this.#actor(request);
    return this.#safe(() => attestAuthorizedAccessReviewItem(this.runtime.database(), this.authorization, {
      ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId: uuid(body, 'scopeId'),
      reviewItemId: uuid(body, 'reviewItemId'), expectedItemVersion: integer(body, 'expectedItemVersion', 1_000_000),
      outcome, reason: string(body, 'reason'), operationId: key(body, 'operationId'),
      attestationId: randomUUID(), auditEventId: randomUUID(),
      ...(outcome === 'REVOKE_REQUESTED' ? { revocationRequestId: randomUUID() } : {}),
      ...(outcome === 'REVOKE_REQUESTED' ? { revocationAuditEventId: randomUUID() } : {}),
      ...(outcome !== 'NEEDS_FOLLOW_UP' ? { nextCycleId: randomUUID(), nextItemId: randomUUID() } : {}),
    }));
  }

  @Post('exports/request') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  requestExport(@Body() candidate: unknown, @Req() request: RequestLike) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'filter', 'rowCeiling', 'reason', 'idempotencyKey'],
      ['authorityAssignmentId', 'scopeId', 'filter', 'rowCeiling', 'reason', 'idempotencyKey']);
    const filter = string(body, 'filter', 16) as (typeof FILTERS)[number];
    if (!FILTERS.includes(filter)) throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    const actor = this.#actor(request);
    return this.#safe(() => requestAuthorizedAccessReviewExport(this.runtime.database(), this.authorization, {
      ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId: uuid(body, 'scopeId'),
      filter, rowCeiling: integer(body, 'rowCeiling', 500), reason: string(body, 'reason'),
      idempotencyKey: key(body, 'idempotencyKey'), operationId: key(body, 'idempotencyKey'),
      exportRequestId: randomUUID(), auditEventId: randomUUID(),
    }));
  }

  @Post('exports/decide') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  decideExport(@Body() candidate: unknown, @Req() request: RequestLike) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'exportRequestId', 'decision', 'reason'],
      ['authorityAssignmentId', 'scopeId', 'exportRequestId', 'decision', 'reason']);
    const decision = string(body, 'decision', 7);
    if (decision !== 'APPROVE' && decision !== 'REJECT') throw new HttpException({ status: 'UNAVAILABLE' }, 404);
    const actor = this.#actor(request);
    return this.#safe(() => decideAuthorizedAccessReviewExport(this.runtime.database(), this.authorization, {
      ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId: uuid(body, 'scopeId'),
      exportRequestId: uuid(body, 'exportRequestId'), decision, reason: string(body, 'reason'),
      operationId: randomUUID(), decisionId: randomUUID(), auditEventId: randomUUID(),
    }));
  }

  @Post('exports/approvals/query') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  exportApprovals(@Body() candidate: unknown, @Req() request: RequestLike) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'pageSize', 'afterId'],
      ['authorityAssignmentId', 'scopeId', 'pageSize']);
    const actor = this.#actor(request);
    const scopeId = uuid(body, 'scopeId');
    return this.#safe(() => readAuthorizedExportApprovalQueue(this.runtime.database(), this.authorization, {
      scopeId, pageSize: integer(body, 'pageSize', 100),
      ...(body.afterId === undefined ? {} : { afterId: uuid(body, 'afterId') }),
      resolveContext: (transaction) => resolveAccessAdminContext(transaction, {
        ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId,
        actionId: 'access.review.export.approval.read', evaluatedAt: actor.at,
      }),
    }));
  }

  @Post('exports/execute') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  async executeExport(@Body() candidate: unknown, @Req() request: RequestLike, @Res({ passthrough: true }) response: ResponseLike) {
    const body = bodyObject(candidate,
      ['authorityAssignmentId', 'scopeId', 'exportRequestId'],
      ['authorityAssignmentId', 'scopeId', 'exportRequestId']);
    const actor = this.#actor(request);
    const result = await this.#safe(() => executeAuthorizedAccessReviewExport(this.runtime.database(), this.authorization, {
      ...actor, authorityAssignmentId: uuid(body, 'authorityAssignmentId'), scopeId: uuid(body, 'scopeId'),
      exportRequestId: uuid(body, 'exportRequestId'), exportEffectId: randomUUID(),
      operationId: randomUUID(), auditEventId: randomUUID(),
    }));
    for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
    return result.body;
  }
}
