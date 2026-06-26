export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installConsoleFileLogger } = await import(
      "@/lib/logging/install-console"
    );
    installConsoleFileLogger();
  }
}
