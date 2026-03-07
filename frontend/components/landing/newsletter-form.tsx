'use client'

import { useState, type FormEvent } from 'react'

export function NewsletterForm() {
  const [email, setEmail] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return

    const subject = encodeURIComponent('Registro de novedades')
    const body = encodeURIComponent(`Hola, quiero registrarme con este correo: ${email}`)
    window.location.href = `mailto:info@marmoleselegance.com?subject=${subject}&body=${body}`
    setEmail('')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Correo electronico"
        className="h-11 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm text-[#2b241f] placeholder:text-[#8a7056]/70 focus:outline-none focus:ring-2 focus:ring-[#b79b7b]/40"
        required
      />
      <button
        type="submit"
        className="h-11 rounded-full bg-[#2b241f] px-6 text-xs uppercase tracking-[0.3em] text-white transition hover:bg-[#1f1a15]"
      >
        Registrarse
      </button>
    </form>
  )
}
