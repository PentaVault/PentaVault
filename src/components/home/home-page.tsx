import { FeatureGrid } from '@/components/home/feature-grid'
import { Footer } from '@/components/home/footer'
import { Hero } from '@/components/home/hero'
import { MarketingHeader } from '@/components/home/marketing-header'
import { Pricing } from '@/components/home/pricing'

export function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <MarketingHeader />
      <main>
        <Hero />
        <FeatureGrid />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
