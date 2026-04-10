import { redirect } from 'next/navigation'

export default function HomePage() {
  // Landing deshabilitado temporalmente:
  // el acceso inicial debe ser el login administrativo.
  redirect('/admin')
}
