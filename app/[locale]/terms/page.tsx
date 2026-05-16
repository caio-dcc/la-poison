import { Metadata } from 'next'
import Link from 'next/link'
import { generateSEOMetadata } from '@/lib/seo/metadata'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

const content = {
  pt: {
    title: 'Termos de Uso — LaPoison',
    heading: 'Termos de Uso',
    lastUpdated: 'Última atualização: 15 de maio de 2026',
    intro:
      'Ao acessar ou usar o LaPoison, você concorda com estes Termos de Uso. Leia-os com atenção antes de usar nossos serviços.',
    sections: [
      {
        title: 'Aceitação dos termos',
        body: 'Ao criar uma conta ou usar qualquer parte do serviço LaPoison, você confirma que leu, entendeu e concorda em cumprir estes termos. Se não concordar, não use o serviço.',
      },
      {
        title: 'Descrição do serviço',
        body: 'O LaPoison é uma plataforma de receitas de coquetéis que oferece: catálogo de drinks, chatbot AI para sugestões personalizadas (com limite gratuito e plano Pro), e ferramentas para gerenciar inventário de bar.',
      },
      {
        title: 'Contas de usuário',
        body: 'Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.',
      },
      {
        title: 'Planos e pagamentos',
        body: 'O plano Pro é cobrado mensalmente (R$19,90) ou anualmente (R$159). Assinaturas se renovam automaticamente. Você pode cancelar a qualquer momento pelo portal de cliente. Reembolsos não são oferecidos por períodos parciais.',
      },
      {
        title: 'Uso aceitável',
        body: 'Você concorda em não usar o serviço para: violar leis aplicáveis, enviar spam ou conteúdo malicioso, tentar acessar sistemas não autorizados, ou fazer engenharia reversa de qualquer parte da plataforma.',
      },
      {
        title: 'Propriedade intelectual',
        body: 'O conteúdo original do LaPoison (código, design, textos) é protegido por direitos autorais. Receitas de coquetéis são baseadas em fontes públicas (CocktailDB) e de domínio público. O uso do serviço não transfere nenhum direito de propriedade intelectual.',
      },
      {
        title: 'Limitação de responsabilidade',
        body: 'O LaPoison é fornecido "como está", sem garantias. Não nos responsabilizamos por danos indiretos, perda de dados ou interrupções de serviço. Nossa responsabilidade máxima é limitada ao valor pago nos últimos 3 meses.',
      },
      {
        title: 'Alterações nos termos',
        body: 'Podemos atualizar estes termos a qualquer momento. Notificaremos por e-mail alterações materiais. O uso continuado após a notificação constitui aceitação dos novos termos.',
      },
      {
        title: 'Lei aplicável',
        body: 'Estes termos são regidos pelas leis do Brasil. Quaisquer disputas serão resolvidas no foro da comarca de São Paulo, SP.',
      },
      {
        title: 'Contato',
        body: 'Para dúvidas sobre estes termos: contato@lapoison.com',
      },
    ],
    backHome: 'Voltar ao início',
  },
  en: {
    title: 'Terms of Service — LaPoison',
    heading: 'Terms of Service',
    lastUpdated: 'Last updated: May 15, 2026',
    intro:
      'By accessing or using LaPoison, you agree to these Terms of Service. Please read them carefully before using our services.',
    sections: [
      {
        title: 'Acceptance of terms',
        body: 'By creating an account or using any part of the LaPoison service, you confirm that you have read, understood, and agree to be bound by these terms. If you do not agree, do not use the service.',
      },
      {
        title: 'Service description',
        body: 'LaPoison is a cocktail recipe platform that provides: a drinks catalog, an AI chatbot for personalized suggestions (with a free tier and Pro plan), and tools to manage bar inventory.',
      },
      {
        title: 'User accounts',
        body: 'You are responsible for maintaining the confidentiality of your password and for all activities under your account. Notify us immediately of any unauthorized use.',
      },
      {
        title: 'Plans and payments',
        body: 'The Pro plan is billed monthly (R$19.90) or annually (R$159). Subscriptions auto-renew. You may cancel at any time through the customer portal. Refunds are not offered for partial periods.',
      },
      {
        title: 'Acceptable use',
        body: 'You agree not to use the service to: violate applicable laws, send spam or malicious content, attempt unauthorized system access, or reverse-engineer any part of the platform.',
      },
      {
        title: 'Intellectual property',
        body: "LaPoison's original content (code, design, text) is protected by copyright. Cocktail recipes are based on public sources (CocktailDB) and are in the public domain. Use of the service does not transfer any intellectual property rights.",
      },
      {
        title: 'Limitation of liability',
        body: 'LaPoison is provided "as is" without warranties. We are not liable for indirect damages, data loss, or service interruptions. Our maximum liability is limited to amounts paid in the last 3 months.',
      },
      {
        title: 'Changes to terms',
        body: 'We may update these terms at any time. We will notify you by email of material changes. Continued use after notification constitutes acceptance of the new terms.',
      },
      {
        title: 'Governing law',
        body: 'These terms are governed by the laws of Brazil. Any disputes will be resolved in the courts of São Paulo, SP.',
      },
      {
        title: 'Contact',
        body: 'For questions about these terms: contato@lapoison.com',
      },
    ],
    backHome: 'Back to home',
  },
  es: {
    title: 'Términos de Servicio — LaPoison',
    heading: 'Términos de Servicio',
    lastUpdated: 'Última actualización: 15 de mayo de 2026',
    intro:
      'Al acceder o usar LaPoison, aceptas estos Términos de Servicio. Léelos detenidamente antes de usar nuestros servicios.',
    sections: [
      {
        title: 'Aceptación de los términos',
        body: 'Al crear una cuenta o usar cualquier parte del servicio LaPoison, confirmas que has leído, comprendido y aceptas cumplir estos términos. Si no estás de acuerdo, no uses el servicio.',
      },
      {
        title: 'Descripción del servicio',
        body: 'LaPoison es una plataforma de recetas de cócteles que ofrece: catálogo de bebidas, chatbot de IA para sugerencias personalizadas (con nivel gratuito y plan Pro), y herramientas para gestionar inventario de bar.',
      },
      {
        title: 'Cuentas de usuario',
        body: 'Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades bajo tu cuenta. Notifícanos inmediatamente cualquier uso no autorizado.',
      },
      {
        title: 'Planes y pagos',
        body: 'El plan Pro se cobra mensualmente (R$19,90) o anualmente (R$159). Las suscripciones se renuevan automáticamente. Puedes cancelar en cualquier momento a través del portal de cliente. No se ofrecen reembolsos por períodos parciales.',
      },
      {
        title: 'Uso aceptable',
        body: 'Aceptas no usar el servicio para: violar leyes aplicables, enviar spam o contenido malicioso, intentar acceder a sistemas no autorizados, o realizar ingeniería inversa de cualquier parte de la plataforma.',
      },
      {
        title: 'Propiedad intelectual',
        body: 'El contenido original de LaPoison (código, diseño, textos) está protegido por derechos de autor. Las recetas de cócteles se basan en fuentes públicas (CocktailDB) y son de dominio público. El uso del servicio no transfiere ningún derecho de propiedad intelectual.',
      },
      {
        title: 'Limitación de responsabilidad',
        body: 'LaPoison se proporciona "tal cual" sin garantías. No somos responsables de daños indirectos, pérdida de datos o interrupciones del servicio. Nuestra responsabilidad máxima está limitada a los montos pagados en los últimos 3 meses.',
      },
      {
        title: 'Cambios en los términos',
        body: 'Podemos actualizar estos términos en cualquier momento. Te notificaremos por correo electrónico sobre cambios materiales. El uso continuado tras la notificación constituye aceptación de los nuevos términos.',
      },
      {
        title: 'Ley aplicable',
        body: 'Estos términos se rigen por las leyes de Brasil. Cualquier disputa se resolverá en los tribunales de São Paulo, SP.',
      },
      {
        title: 'Contacto',
        body: 'Para preguntas sobre estos términos: contato@lapoison.com',
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
      pathname: `/${locale}/terms`,
    },
    baseUrl
  )
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
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
