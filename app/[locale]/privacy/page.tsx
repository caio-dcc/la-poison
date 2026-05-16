import { Metadata } from 'next'
import Link from 'next/link'
import { generateSEOMetadata } from '@/lib/seo/metadata'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

const content = {
  pt: {
    title: 'Política de Privacidade — LaPoison',
    heading: 'Política de Privacidade',
    lastUpdated: 'Última atualização: 15 de maio de 2026',
    intro:
      'Esta Política de Privacidade descreve como a LaPoison coleta, usa e protege suas informações pessoais quando você usa nosso site e serviços.',
    sections: [
      {
        title: 'Informações que coletamos',
        body: 'Coletamos informações que você nos fornece diretamente, como nome e endereço de e-mail ao criar uma conta. Também coletamos automaticamente dados de uso, como páginas visitadas, consultas de busca e interações com o chatbot.',
      },
      {
        title: 'Como usamos suas informações',
        body: 'Usamos suas informações para fornecer e melhorar nossos serviços, personalizar sua experiência, processar pagamentos de assinatura e enviar comunicações relacionadas ao serviço.',
      },
      {
        title: 'Compartilhamento de informações',
        body: 'Não vendemos suas informações pessoais. Compartilhamos dados apenas com provedores de serviços necessários para operar a plataforma (Supabase para banco de dados, Stripe para pagamentos, Vercel para hospedagem).',
      },
      {
        title: 'Cookies',
        body: 'Usamos cookies essenciais para autenticação e preferências de idioma. Podemos usar cookies de análise para entender como nosso site é utilizado. Você pode desativar cookies não essenciais nas configurações do navegador.',
      },
      {
        title: 'Segurança',
        body: 'Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações. Senhas são armazenadas com hash; dados em trânsito são protegidos por TLS.',
      },
      {
        title: 'Seus direitos (LGPD)',
        body: 'Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito de acessar, corrigir ou excluir seus dados pessoais. Para exercer esses direitos, entre em contato conosco pelo e-mail abaixo.',
      },
      {
        title: 'Contato',
        body: 'Para dúvidas sobre esta política, entre em contato: contato@lapoison.com',
      },
    ],
    backHome: 'Voltar ao início',
  },
  en: {
    title: 'Privacy Policy — LaPoison',
    heading: 'Privacy Policy',
    lastUpdated: 'Last updated: May 15, 2026',
    intro:
      'This Privacy Policy describes how LaPoison collects, uses, and protects your personal information when you use our website and services.',
    sections: [
      {
        title: 'Information we collect',
        body: 'We collect information you provide directly, such as your name and email address when creating an account. We also automatically collect usage data, such as pages visited, search queries, and chatbot interactions.',
      },
      {
        title: 'How we use your information',
        body: 'We use your information to provide and improve our services, personalize your experience, process subscription payments, and send service-related communications.',
      },
      {
        title: 'Information sharing',
        body: 'We do not sell your personal information. We share data only with service providers necessary to operate the platform (Supabase for database, Stripe for payments, Vercel for hosting).',
      },
      {
        title: 'Cookies',
        body: 'We use essential cookies for authentication and language preferences. We may use analytics cookies to understand how our site is used. You can disable non-essential cookies in your browser settings.',
      },
      {
        title: 'Security',
        body: 'We implement technical and organizational security measures to protect your information. Passwords are stored hashed; data in transit is protected by TLS.',
      },
      {
        title: 'Your rights (GDPR)',
        body: 'Under applicable data protection laws, you have the right to access, correct, or delete your personal data. To exercise these rights, contact us at the email below.',
      },
      {
        title: 'Contact',
        body: 'For questions about this policy, contact us: contato@lapoison.com',
      },
    ],
    backHome: 'Back to home',
  },
  es: {
    title: 'Política de Privacidad — LaPoison',
    heading: 'Política de Privacidad',
    lastUpdated: 'Última actualización: 15 de mayo de 2026',
    intro:
      'Esta Política de Privacidad describe cómo LaPoison recopila, usa y protege tu información personal cuando usas nuestro sitio web y servicios.',
    sections: [
      {
        title: 'Información que recopilamos',
        body: 'Recopilamos información que nos proporcionas directamente, como nombre y correo electrónico al crear una cuenta. También recopilamos automáticamente datos de uso, como páginas visitadas, búsquedas e interacciones con el chatbot.',
      },
      {
        title: 'Cómo usamos tu información',
        body: 'Usamos tu información para proporcionar y mejorar nuestros servicios, personalizar tu experiencia, procesar pagos de suscripción y enviar comunicaciones relacionadas con el servicio.',
      },
      {
        title: 'Compartir información',
        body: 'No vendemos tu información personal. Compartimos datos solo con proveedores de servicios necesarios para operar la plataforma (Supabase para base de datos, Stripe para pagos, Vercel para hosting).',
      },
      {
        title: 'Cookies',
        body: 'Usamos cookies esenciales para autenticación y preferencias de idioma. Podemos usar cookies de análisis para entender cómo se usa nuestro sitio. Puedes desactivar las cookies no esenciales en la configuración de tu navegador.',
      },
      {
        title: 'Seguridad',
        body: 'Implementamos medidas de seguridad técnicas y organizativas para proteger tu información. Las contraseñas se almacenan con hash; los datos en tránsito están protegidos por TLS.',
      },
      {
        title: 'Tus derechos (RGPD)',
        body: 'Según las leyes de protección de datos aplicables, tienes derecho a acceder, corregir o eliminar tus datos personales. Para ejercer estos derechos, contáctanos en el correo electrónico a continuación.',
      },
      {
        title: 'Contacto',
        body: 'Para preguntas sobre esta política, contáctanos: contato@lapoison.com',
      },
    ],
    backHome: 'Volver al inicio',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const page = content[locale as keyof typeof content] || content.pt
  return generateSEOMetadata(
    {
      title: page.title,
      description: page.intro,
      pathname: `/${locale}/privacy`,
    },
    baseUrl
  )
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const page = content[locale as keyof typeof content] || content.pt

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white/95 rounded-2xl shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-evergreen mb-2">{page.heading}</h1>
          <p className="text-sm text-shadow-grey/60 mb-8">{page.lastUpdated}</p>
          <p className="text-shadow-grey leading-relaxed mb-8">{page.intro}</p>

          <div className="space-y-8">
            {page.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-lg font-bold text-evergreen mb-2">{section.title}</h2>
                <p className="text-shadow-grey leading-relaxed">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100">
            <Link
              href={`/${locale}`}
              className="text-evergreen hover:text-hunter-green font-medium transition-colors"
            >
              &larr; {page.backHome}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
