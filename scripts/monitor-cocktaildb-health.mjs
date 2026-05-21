#!/usr/bin/env node
/**
 * monitor-cocktaildb-health.mjs
 *
 * Monitora a saúde do CocktailDB API a cada 30 minutos.
 * Se as URLs caírem, envia email para dev.caio.marques@gmail.com
 *
 * Uso:
 *   node --env-file=.env scripts/monitor-cocktaildb-health.mjs
 */

import nodemailer from 'nodemailer'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.resend.com'
const SMTP_USER = process.env.SMTP_USER || 'onboarding@resend.dev'
const SMTP_PASS = process.env.SMTP_PASS || 'resend'
const RECIPIENT_EMAIL = 'dev.caio.marques@gmail.com'

let lastStatus = 'unknown'

async function checkCocktailDBHealth() {
  try {
    // Testar endpoint do CocktailDB
    const res = await fetch('https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=11007', {
      timeout: 10000,
    })

    if (!res.ok) {
      return { status: 'error', code: res.status, message: `HTTP ${res.status}` }
    }

    const data = await res.json()
    if (!data.drinks || !data.drinks.length) {
      return { status: 'error', code: 'EMPTY', message: 'API retornou drinks vazio' }
    }

    return { status: 'ok', code: 200, message: 'API funcionando' }
  } catch (err) {
    return { status: 'error', code: 'TIMEOUT', message: err.message }
  }
}

async function sendEmail(subject, body) {
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    await transporter.sendMail({
      from: SMTP_USER,
      to: RECIPIENT_EMAIL,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''),
    })

    console.log(`✉️  Email enviado: ${subject}`)
  } catch (err) {
    console.error(`❌ Erro ao enviar email: ${err.message}`)
  }
}

async function main() {
  console.log('🔍 LaPoison — CocktailDB Health Monitor')
  console.log(`Iniciado em ${new Date().toISOString()}\n`)

  // Check a cada 30 minutos
  setInterval(async () => {
    const health = await checkCocktailDBHealth()
    const timestamp = new Date().toISOString()

    if (health.status === 'error' && lastStatus !== 'error') {
      console.log(`[${timestamp}] ❌ FALHA: ${health.message}`)
      lastStatus = 'error'

      await sendEmail(
        '🚨 AS URLS DO COCKTAILSDB CAIRAM',
        `
          <h2>⚠️ Alerta de Falha - CocktailDB</h2>
          <p><strong>Timestamp:</strong> ${timestamp}</p>
          <p><strong>Status:</strong> ${health.status}</p>
          <p><strong>Código:</strong> ${health.code}</p>
          <p><strong>Mensagem:</strong> ${health.message}</p>
          <hr/>
          <p>As imagens dos coquetéis podem não estar carregando no site.</p>
          <p>URL testada: https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=11007</p>
        `
      )
    } else if (health.status === 'ok' && lastStatus === 'error') {
      console.log(`[${timestamp}] ✅ RECUPERADO: ${health.message}`)
      lastStatus = 'ok'

      await sendEmail(
        '✅ CocktailDB Restaurado',
        `
          <h2>Serviço Restaurado</h2>
          <p>O CocktailDB voltou a funcionar normalmente.</p>
          <p><strong>Timestamp:</strong> ${timestamp}</p>
        `
      )
    } else {
      const icon = health.status === 'ok' ? '✅' : '❌'
      console.log(`[${timestamp}] ${icon} ${health.message}`)
      lastStatus = health.status
    }
  }, 30 * 60 * 1000) // 30 minutos

  // Check imediato
  const health = await checkCocktailDBHealth()
  lastStatus = health.status
  const icon = health.status === 'ok' ? '✅' : '❌'
  console.log(`[${new Date().toISOString()}] ${icon} ${health.message}\n`)
  console.log('Monitorando... (verifique a cada 30 min)')
}

main().catch(e => { console.error(e); process.exit(1) })
