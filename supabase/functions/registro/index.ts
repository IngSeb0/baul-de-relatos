// Registro con nombre de jugador y contraseña. No pide correo: la cuenta usa una dirección
// interna que no existe (dominio reservado .invalid) y nunca recibe mensajes.
// Limita los registros por origen y día.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DOMINIO = "jugador.invalid";
// Supabase exige mayúscula, minúscula, número y símbolo: se añade un sufijo fijo para que
// cualquier contraseña de 6+ caracteres cumpla. El cliente añade el mismo sufijo al entrar.
const SUFIJO = "Aa1!";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "metodo" }, 405);
  let datos: { usuario?: unknown; clave?: unknown };
  try { datos = await req.json(); } catch { return responder({ error: "formato" }, 400); }
  const usuario = typeof datos.usuario === "string" ? datos.usuario.trim().toLowerCase() : "";
  const clave = typeof datos.clave === "string" ? datos.clave : "";
  if (!/^[a-z0-9_]{3,16}$/.test(usuario)) return responder({ error: "usuario" }, 400);
  if (clave.length < 6 || clave.length > 72) return responder({ error: "clave" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "" } },
  });
  // como mucho 5 cuentas nuevas por origen y día
  const { data: permitido, error: errLimite } = await admin.rpc("dentro_del_limite", { prefijo: "r:", tope: 8 });
  if (errLimite) return responder({ error: "servidor" }, 500);
  if (!permitido) return responder({ error: "limite" }, 429);

  const { error } = await admin.auth.admin.createUser({
    email: `${usuario}@${DOMINIO}`, password: clave + SUFIJO, email_confirm: true, user_metadata: { usuario },
  });
  if (error) {
    const repetido = /already|registered|exists/i.test(error.message);
    if (!repetido && /password/i.test(error.message)) return responder({ error: "clave" }, 400);
    return responder({ error: repetido ? "existe" : "servidor", detalle: repetido ? undefined : error.message }, repetido ? 409 : 500);
  }
  return responder({ ok: true });
});
