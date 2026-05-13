import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log(`Function "hello" up and running!`)

serve(async req => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
})
