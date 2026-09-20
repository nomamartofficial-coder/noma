import { Injectable } from '@nestjs/common';
import {
  runInDatabaseTransaction,
  type DatabaseClient,
  type DatabaseTransactionClient,
} from '@noma/database';
import {
  authorizationPolicyRegistry,
  evaluateAuthorization,
  type AuthorizationDecision,
  type TrustedAuthorizationContext,
} from '@noma/platform/access';

export class AuthorizationDeniedError extends Error {
  readonly decision: Extract<AuthorizationDecision, { decision: 'DENY' }>;

  constructor(decision: Extract<AuthorizationDecision, { decision: 'DENY' }>) {
    super('protected operation is unavailable');
    this.name = 'AuthorizationDeniedError';
    this.decision = decision;
  }
}

/** Missing protected resource and denied authority share one public response. */
export class ProtectedDisclosureUnavailableError extends Error {
  constructor() {
    super('protected operation is unavailable');
    this.name = 'ProtectedDisclosureUnavailableError';
  }
}

export interface ProtectedDatabaseOperation<TResult> {
  readonly policyId: string;
  readonly resolveContext: (transaction: DatabaseTransactionClient) => Promise<TrustedAuthorizationContext>;
  readonly execute: (
    transaction: DatabaseTransactionClient,
    decision: Extract<AuthorizationDecision, { decision: 'ALLOW' }>,
  ) => Promise<TResult>;
}

@Injectable()
export class AuthorizationService {
  evaluate(policyId: string, context: TrustedAuthorizationContext): AuthorizationDecision {
    return evaluateAuthorization(authorizationPolicyRegistry, policyId, context);
  }

  async executeProtectedMutation<TResult>(
    database: DatabaseClient,
    operation: ProtectedDatabaseOperation<TResult>,
  ): Promise<TResult> {
    return runInDatabaseTransaction(database, async (transaction) => {
      const decision = this.evaluate(operation.policyId, await operation.resolveContext(transaction));
      if (decision.decision === 'DENY') throw new AuthorizationDeniedError(decision);
      return operation.execute(transaction, decision);
    });
  }

  async executeProtectedRead<TResult>(
    database: DatabaseClient,
    operation: ProtectedDatabaseOperation<TResult>,
  ): Promise<TResult> {
    return runInDatabaseTransaction(database, async (transaction) => {
      const decision = this.evaluate(operation.policyId, await operation.resolveContext(transaction));
      if (decision.decision === 'DENY') throw new AuthorizationDeniedError(decision);
      return operation.execute(transaction, decision);
    });
  }
}

export function publicAuthorizationFailure(error: unknown): Readonly<{ statusCode: 404; body: Readonly<{ status: 'UNAVAILABLE' }> }> {
  if (!(error instanceof AuthorizationDeniedError) && !(error instanceof ProtectedDisclosureUnavailableError)) throw error;
  return Object.freeze({ statusCode: 404 as const, body: Object.freeze({ status: 'UNAVAILABLE' as const }) });
}

/** Apply when a protected disclosure is bound to HTTP; no public route is active yet. */
export function protectedDisclosureHeaders(): Readonly<{ 'Cache-Control': 'no-store' }> {
  return Object.freeze({ 'Cache-Control': 'no-store' as const });
}
