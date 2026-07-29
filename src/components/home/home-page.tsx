import { ClosingCta } from '@/components/home/closing-cta'
import { CodeShowcase } from '@/components/home/code-showcase'
import { Faq } from '@/components/home/faq'
import { FeatureGrid } from '@/components/home/feature-grid'
import { Footer } from '@/components/home/footer'
import { Hero } from '@/components/home/hero'
import { HowItWorks } from '@/components/home/how-it-works'
import { MarketingHeader } from '@/components/home/marketing-header'
import { Pricing } from '@/components/home/pricing'
import { SecuritySection } from '@/components/home/security-section'

/**
 * Section order follows the question a visitor asks next: what is it, how does
 * it work, what does it look like in my code, what else does it do, can I trust
 * it, what does it cost, and finally the objections.
 */
export function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main>
        <Hero />
        <HowItWorks />
        <CodeShowcase />
        <FeatureGrid />
        <SecuritySection />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  )
}
