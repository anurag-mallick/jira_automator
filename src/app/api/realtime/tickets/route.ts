export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Store active connections
const clients = new Set<ReadableStreamDefaultController>();

// Broadcast to all connected clients
function broadcast(event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);
  
  clients.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (e) {
      // Client disconnected, remove from set
      clients.delete(controller);
    }
  });
}

// Export broadcast function for use in other routes
export { broadcast };

export async function GET(req: NextRequest) {
  // Verify authentication from cookie or query param
  const token = req.cookies.get('auth-token')?.value || 
                new URL(req.url).searchParams.get('token');
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const user = await verifyToken(token);
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }
  } catch (e) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add client to set
      clients.add(controller);
      
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status":"connected"}\n\n`));

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          clearInterval(heartbeat);
          clients.delete(controller);
        }
      }, 30000);

      // Clean up on close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        clients.delete(controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}