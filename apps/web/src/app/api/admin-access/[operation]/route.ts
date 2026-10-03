import { forwardAccessOperation, isAccessForwardOperation } from '../../../../admin/access-forwarder.server';

export const dynamic = 'force-dynamic';

type Context = Readonly<{ params: Promise<Readonly<{ operation: string }>> }>;

async function exact(request: Request, context: Context): Promise<Response> {
  const { operation } = await context.params;
  if (!isAccessForwardOperation(operation)) {
    return Response.json({ status: 'UNAVAILABLE' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  return forwardAccessOperation(request, operation);
}

export async function POST(request: Request, context: Context): Promise<Response> {
  return exact(request, context);
}

export async function GET(request: Request, context: Context): Promise<Response> {
  return exact(request, context);
}
