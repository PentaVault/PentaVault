type FaqItem = {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What happens if PentaVault is down?',
    answer:
      'Proxied calls depend on the gateway, so treat it like any upstream dependency. For paths that must survive an outage, use compatibility mode: the CLI and SDK can cache resolved values for the lifetime of a process, so a running service keeps working.',
  },
  {
    question: 'Is this just environment variables with extra steps?',
    answer:
      'Environment variables hand every process the real key, forever, with no record of who read it. A proxy token is scoped to one provider and environment, expires on a schedule you set, can be bound to a device or IP, and every use is attributable.',
  },
  {
    question: 'Can I use it with providers you do not support natively?',
    answer:
      'Yes. Alongside first-class support for OpenAI, Anthropic, GitHub, Stripe and Supabase, a generic allowlist proxy covers any HTTP upstream. Anything that cannot be proxied can still be stored and read in compatibility mode.',
  },
  {
    question: 'How do secrets get into CI?',
    answer:
      'Issue a proxy token scoped to the environment your pipeline needs and expose it as a single CI secret. Rotating upstream keys then never requires touching CI configuration again.',
  },
  {
    question: 'Who can see a secret value?',
    answer:
      'Only members whose project role permits reads, and only through an authorised request. Values are decrypted per request rather than held in plaintext, and every read is written to the audit log with actor, route and source IP.',
  },
  {
    question: 'Can I self-host?',
    answer:
      'Yes. PentaVault runs as a Fastify API against PostgreSQL. Bring your own key-encryption key so encrypted material is only ever readable inside your own infrastructure.',
  },
]

export function Faq() {
  return (
    <section className="border-t border-border bg-background py-20" id="faq">
      <div className="mx-auto max-w-3xl px-6 sm:px-10">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Questions worth asking
          </h2>
        </div>

        <div className="mt-12 divide-y divide-border border-y border-border">
          {FAQ_ITEMS.map((item) => (
            <details className="group py-5" key={item.question}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <span className="text-sm font-medium text-foreground">{item.question}</span>
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
