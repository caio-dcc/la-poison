'use server'

import nodemailer from 'nodemailer'
import crypto from 'crypto'

export async function registerBartender(formData: FormData) {
  const name = formData.get('name') as string
  const age = formData.get('age') as string
  const email = formData.get('email') as string

  if (!name || !age || !email) {
    return { success: false, error: 'Por favor, preencha todos os campos.' }
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.resend.com'
  const smtpUser = process.env.SMTP_USER || 'onboarding@resend.dev'
  const smtpPass = process.env.SMTP_PASS || 'resend'
  const recipientEmail = 'dev.caio.marques@gmail.com'

  const uuid = crypto.randomUUID().substring(0, 8)
  const subject = `Barman Registrado no Lapoison - ${name} - ${age} ${uuid}`

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  })

  try {
    await transporter.sendMail({
      from: smtpUser,
      to: recipientEmail,
      subject: subject,
      html: `
        <h2>Novo Bartender Registrado</h2>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Idade:</strong> ${age}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>UUID de Registro:</strong> ${uuid}</p>
      `,
      text: `Novo Bartender Registrado\nNome: ${name}\nIdade: ${age}\nEmail: ${email}\nUUID: ${uuid}`,
    })

    return { success: true }
  } catch (err) {
    console.error('Failed to send email:', err)
    return { success: false, error: 'Falha ao enviar email. Tente novamente mais tarde.' }
  }
}
