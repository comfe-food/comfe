import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/static-config";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como a Comfe trata os teus dados pessoais: só nome e telemóvel, para processar o pedido.",
};

export default function PrivacyPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl">Política de Privacidade</h1>

      <div className="mt-6 space-y-5 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg">Que dados recolhemos</h2>
          <p className="mt-1">
            Só recolhemos o <strong>nome</strong> e o <strong>número de
            telemóvel</strong>, e apenas porque são necessários para preparar e
            entregar o teu pedido e para enviar o pedido de pagamento MB WAY.
          </p>
        </section>

        <section>
          <h2 className="text-lg">Para que usamos</h2>
          <p className="mt-1">
            Os dados servem exclusivamente para processar a encomenda, contactar-te
            em caso de dúvida e cumprir as obrigações legais de registo de
            faturação. Não os usamos para marketing nem os vendemos a terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg">Pagamentos</h2>
          <p className="mt-1">
            O pagamento é feito por MB WAY, na tua própria aplicação, junto do
            nosso agregador de pagamentos. A Comfe não tem acesso aos dados do teu
            cartão ou da tua conta bancária.
          </p>
        </section>

        <section>
          <h2 className="text-lg">Quanto tempo guardamos</h2>
          <p className="mt-1">
            Guardamos os pedidos durante 12 meses, para efeitos de faturação e de
            resolução de problemas. Passado esse prazo, os dados são anonimizados
            ou apagados.
          </p>
        </section>

        <section>
          <h2 className="text-lg">Os teus direitos</h2>
          <p className="mt-1">
            Podes pedir acesso, correção ou apagamento dos teus dados a qualquer
            momento, por WhatsApp ou telefone. Respondemos o mais rápido possível.
          </p>
        </section>

        <section>
          <h2 className="text-lg">Contacto</h2>
          <p className="mt-1">
            Para qualquer questão sobre privacidade, fala connosco pelo WhatsApp
            ou pelo telefone indicado na página inicial.
          </p>
        </section>
      </div>

      <p className="mt-8">
        <Link href="/" className="btn btn-secondary">
          ← {t("backToMenu")}
        </Link>
      </p>
    </main>
  );
}
