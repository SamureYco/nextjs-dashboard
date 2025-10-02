// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/app/auth"; // tu auth.ts está dentro de /app
export const { GET, POST } = handlers;

// Importante: credenciales requieren Node.js runtime
export const runtime = "nodejs";
