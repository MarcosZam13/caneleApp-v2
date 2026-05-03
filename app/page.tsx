// page.tsx — Redirect raíz al dashboard principal
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
