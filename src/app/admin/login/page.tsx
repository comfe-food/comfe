import { LoginForm } from "@/components/admin/login-form";

export const metadata = {
  title: "Entrar · Comfe",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}