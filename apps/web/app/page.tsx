import { redirect } from 'next/navigation'

// Redireciona a raiz para o login
export default function Home() {
  redirect('/login')
}
