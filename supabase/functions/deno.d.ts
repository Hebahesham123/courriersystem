// Type declarations for Deno runtime in Supabase Edge Functions
// This file helps TypeScript understand Deno types in the local IDE

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined
  }
  
  function serve(handler: (req: Request) => Promise<Response> | Response): void
  
  const env: Env
}

// JSR module declarations
declare module 'jsr:@supabase/supabase-js@2' {
  export function createClient(url: string, key: string): any
}

declare module 'jsr:@supabase/functions-js/edge-runtime.d.ts' {
  // Edge runtime types
}




