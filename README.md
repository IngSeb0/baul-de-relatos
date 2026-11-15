# Baúl de Relatos · La Arena + Dragones de los Meses

Sitio estático para Vercel:

| Ruta | Qué es |
|---|---|
| `/` | **La Arena**: 30 días, un superviviente. Estado en vivo, cuenta, video que da agua, palabra secreta, votos y mudanzas. |
| `/juego/` | **Dragones de los Meses**: juego web (build de `Dragones-Juego-Roblox/juego-web/dist`). |

Las dos páginas comparten la misma cuenta (nombre de jugador + contraseña, sin correo) del proyecto de Supabase **Dragones de los Meses** (`shncnofgelobyskwghse`).

## Cómo funciona La Arena (todo en la base de datos)
- Tablas `arena_dias`, `arena_jugadores`, `arena_diario`, `arena_acciones`. Con RLS y sin permisos directos: la web solo usa funciones (`arena_estado`, `arena_ficha`, `arena_yo`, `arena_entrar`, `arena_video`, `arena_palabra`, `arena_votar`, `arena_mudar`).
- Cada acción vale una vez por día por cuenta (clave primaria `ig + día + tipo`). La palabra tiene un solo intento por día.
- **Cierre automático:** `pg_cron` ejecuta `arena_cerrar_noche()` todos los días a las 05:00 UTC (medianoche de Bogotá): tormenta en la zona menos votada (desde el día 4), −1 agua, −1 comida cada 2 noches, fogata cada 3 noches, botiquín, caídos y mudanzas forzadas (Volcán cierra el día 10, Desierto el 17, Pantano el 23).

## Lo único que haces cada día
En Supabase → Table Editor → `arena_dias`, llena la fila del día:
- `video_youtube`: id del video (lo que va después de `youtu.be/`, `v=` o `shorts/`).
- `palabra`: la palabra secreta que dices en ese video.
- `evento`, `zona_a`, `zona_b` (desde el día 4) y `bestia` si el evento es una bestia (el arma protege).

## Seguridad
- Cabeceras en `vercel.json`: CSP estricta (sin scripts en línea en `/`; `/juego/` usa su CSP con hash), HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors none.
- La clave de Supabase en el código es la **anon pública** (pensada para el navegador); la seguridad está en RLS y en las funciones.
- Pendiente en el panel de Supabase: Authentication → Attack Protection → activar *Leaked password protection*; Authentication → Providers → Email → desactivar *Allow new users to sign up* (el registro va por la función `registro`).

## Actualizar el juego
Desde `Dragones-Juego-Roblox/juego-web/`: `npm run build` y copiar `dist/*` a `juego/` (sin `_headers`: las cabeceras están en `vercel.json`; si cambia el hash del script, actualiza la CSP de `/juego/`).
