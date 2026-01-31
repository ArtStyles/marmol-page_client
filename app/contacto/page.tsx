import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ContactSection } from '@/components/sections/contact-section'

export default function ContactoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1ea]">
      <Navbar />
      <main className="flex-1">
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
