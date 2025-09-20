'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
// ⬇️  IMPORTS PARA AUTH
import { signIn } from "../auth"; 
import { AuthError } from 'next-auth';
import Auth0 from 'next-auth/providers/auth0';
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/** ===== Zod schema ===== */
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    required_error: 'Please select a customer.',
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z
    .coerce.number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    required_error: 'Please select an invoice status.',
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

/** ===== State para useActionState (¡exportado!) ===== */
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

/** ===== CREATE ===== */
export async function createInvoice(prevState: State, formData: FormData) {
  // 1) Validación
  const validated = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    } satisfies State;
  }

  // 2) Preparar datos
  const { customerId, amount, status } = validated.data;
  const amountInCents = Math.round(amount * 100);
  const date = new Date().toISOString().split('T')[0];

  // 3) Insertar
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch {
    return { message: 'Database Error: Failed to Create Invoice.' } satisfies State;
  }

  // 4) Revalidar y redirigir
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

/** ===== UPDATE ===== */
export async function updateInvoice(id: string, formData: FormData) {
  const parsed = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    } satisfies State;
  }

  const { customerId, amount, status } = parsed.data;
  const amountInCents = Math.round(amount * 100);

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error(error);
    return { message: 'Database Error: Failed to Update Invoice.' } satisfies State;
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

/** ===== DELETE ===== */
export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (err) {
    console.error(err);
    return { message: 'Database Error: Failed to Delete Invoice.' } satisfies State;
  }
  revalidatePath('/dashboard/invoices');
}
// ===== AUTHENTICATE (para el login-form) =====
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    // credentials provider; el formData debe tener "email" y "password"
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
