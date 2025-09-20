// middleware.ts
export { auth as middleware } from './auth';

export const config = {
  // No ejecutes middleware para estáticos, imágenes ni tu seed
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/seed|.*\\.(?:png|jpg|jpeg|svg|webp)).*)',
  ],
};
