import LoginForm from "./ui/LoginForm";

export const runtime = "nodejs";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Select your name and enter your 8-digit password.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
