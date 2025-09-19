import postgres from 'postgres';

// Conexión
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// Función que hace la consulta
async function listInvoices() {
  const data = await sql`
    SELECT invoices.amount, customers.name
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.amount = 666;
  `;

  return data;
}

// API Route en Next.js (app router)
export async function GET() {
  const invoices = await listInvoices();
  return Response.json(invoices);
}
