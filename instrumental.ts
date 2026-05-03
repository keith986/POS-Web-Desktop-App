export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb } = await import("./app/_lib/initDb");
    await initDb();
  }
}