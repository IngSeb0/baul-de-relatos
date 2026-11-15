-- Dragones de los Meses · base de datos (proyecto shncnofgelobyskwghse)
-- Cuentas (partida en la nube y retadores de la arena) + marcador semanal en vivo.
-- El público nunca escribe tablas directamente: todo pasa por funciones que deciden las
-- cantidades y limitan la frecuencia (docs/05 sección 5).

-- ============ utilidades privadas ============
create table public.ajustes (clave text primary key, valor text not null);
alter table public.ajustes enable row level security;            -- sin políticas: solo funciones
insert into public.ajustes values ('sal', gen_random_uuid()::text || gen_random_uuid()::text);

create table public.limites (huella text not null, dia date not null, eventos integer not null default 0, primary key (huella, dia));
alter table public.limites enable row level security;            -- sin políticas

-- Lunes de la semana actual en hora de Bogotá (D-10).
create or replace function public.lunes_actual() returns date
language sql stable set search_path = '' as $$
  select date_trunc('week', now() at time zone 'America/Bogota')::date;
$$;

-- Huella del origen: resumen de (IP + sal secreta + día). La IP no se guarda.
create or replace function public.huella_del_dia(prefijo text) returns text
language sql stable security definer set search_path = '' as $$
  select prefijo || encode(sha256(convert_to(
    coalesce(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), 'desconocido')
    || (select valor from public.ajustes where clave = 'sal')
    || (now() at time zone 'America/Bogota')::date::text, 'UTF8')), 'hex');
$$;
revoke all on function public.huella_del_dia(text) from public, anon, authenticated;

-- Suma 1 al contador del día de esa huella y dice si sigue dentro del tope.
create or replace function public.dentro_del_limite(prefijo text, tope integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer; hoy date := (now() at time zone 'America/Bogota')::date;
begin
  insert into public.limites (huella, dia, eventos) values (public.huella_del_dia(prefijo), hoy, 1)
  on conflict (huella, dia) do update set eventos = public.limites.eventos + 1
  returning eventos into n;
  if random() < 0.02 then delete from public.limites where dia < hoy - 2; end if;   -- se borran a las 48 h
  return n <= tope;
end $$;
revoke all on function public.dentro_del_limite(text, integer) from public, anon, authenticated;
grant execute on function public.dentro_del_limite(text, integer) to service_role;

-- ============ marcador semanal ============
create table public.marcador_semanal (
  semana date not null, mes smallint not null check (mes between 1 and 12),
  puntos_web integer not null default 0, puntos_roblox integer not null default 0,
  primary key (semana, mes)
);
alter table public.marcador_semanal enable row level security;
-- Son totales públicos por mes, sin nada de ningún jugador: se pueden leer (y oír en vivo).
create policy "el marcador es publico" on public.marcador_semanal for select to anon, authenticated using (true);
alter publication supabase_realtime add table public.marcador_semanal;

create table public.contadores (semana date not null, evento text not null, total bigint not null default 0, primary key (semana, evento));
alter table public.contadores enable row level security;         -- sin políticas

create table public.codigos (codigo text primary key check (codigo ~ '^[A-Z]{4,10}$'), desde timestamptz not null default now(), hasta timestamptz not null);
alter table public.codigos enable row level security;            -- sin políticas

-- El cliente solo dice "pasó tal evento"; los puntos los decide el servidor.
create or replace function public.sumar(p_mes integer, p_evento text) returns json
language plpgsql security definer set search_path = '' as $$
declare pts integer; total integer;
begin
  if p_mes is null or p_mes < 1 or p_mes > 12 then return json_build_object('error', 'mes'); end if;
  pts := case p_evento when 'huevo' then 1 when 'victoria' then 3 when 'derrota' then 1 else null end;
  if pts is null then return json_build_object('error', 'evento'); end if;
  if not public.dentro_del_limite('p:', 40) then return json_build_object('limitado', true); end if;
  insert into public.marcador_semanal (semana, mes, puntos_web) values (public.lunes_actual(), p_mes, pts)
  on conflict (semana, mes) do update set puntos_web = public.marcador_semanal.puntos_web + pts
  returning puntos_web + puntos_roblox into total;
  return json_build_object('total', total);
end $$;

create or replace function public.contar(p_evento text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_evento not in ('mes_elegido', 'revelacion', 'tarjeta_generada', 'regreso') then return; end if;
  if not public.dentro_del_limite('c:', 80) then return; end if;
  insert into public.contadores (semana, evento, total) values (public.lunes_actual(), p_evento, 1)
  on conflict (semana, evento) do update set total = public.contadores.total + 1;
end $$;

create or replace function public.canjear(p_codigo text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  if not public.dentro_del_limite('k:', 30) then return json_build_object('valido', false); end if;
  return json_build_object('valido', exists (
    select 1 from public.codigos c where c.codigo = upper(p_codigo) and now() between c.desde and c.hasta));
end $$;

-- Los 12 meses de la semana actual y el ganador de la semana pasada.
create or replace function public.marcador() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'semana', public.lunes_actual(),
    'meses', (select json_agg(json_build_object('mes', g.mes, 'web', coalesce(m.puntos_web, 0), 'roblox', coalesce(m.puntos_roblox, 0),
                'total', coalesce(m.puntos_web, 0) + coalesce(m.puntos_roblox, 0)) order by g.mes)
              from generate_series(1, 12) as g(mes)
              left join public.marcador_semanal m on m.mes = g.mes and m.semana = public.lunes_actual()),
    'anterior', (select json_build_object('mes', m.mes, 'puntos', m.puntos_web + m.puntos_roblox)
                 from public.marcador_semanal m where m.semana = public.lunes_actual() - 7
                 order by m.puntos_web + m.puntos_roblox desc, m.mes limit 1));
$$;

revoke all on function public.sumar(integer, text), public.contar(text), public.canjear(text), public.marcador() from public;
grant execute on function public.sumar(integer, text), public.contar(text), public.canjear(text), public.marcador() to anon, authenticated;

-- ============ cuentas ============
-- Una fila por cuenta con la partida completa. Solo su dueño la ve.
create table public.partidas (
  usuario uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  datos jsonb not null,
  avance integer not null default 0,
  actualizado timestamptz not null default now(),
  constraint partidas_tamano check (pg_column_size(datos) < 200000)
);
alter table public.partidas enable row level security;
create policy "leer la propia partida" on public.partidas for select to authenticated using ((select auth.uid()) = usuario);
create policy "crear la propia partida" on public.partidas for insert to authenticated with check ((select auth.uid()) = usuario);
create policy "actualizar la propia partida" on public.partidas for update to authenticated using ((select auth.uid()) = usuario) with check ((select auth.uid()) = usuario);
create policy "borrar la propia partida" on public.partidas for delete to authenticated using ((select auth.uid()) = usuario);

-- Dragón que cada cuenta presenta en la arena. Sin nombre ni texto libre.
create table public.retadores (
  usuario uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  mes smallint not null check (mes between 1 and 12),
  rareza text not null check (rareza in ('comun', 'raro', 'epico', 'legendario', 'mitico', 'secreto')),
  stats smallint[] not null check (array_length(stats, 1) = 3 and 40 <= all (stats) and 99 >= all (stats)),
  poder integer not null check (poder between 0 and 1200),
  actualizado timestamptz not null default now()
);
alter table public.retadores enable row level security;
create policy "ver el propio retador" on public.retadores for select to authenticated using ((select auth.uid()) = usuario);
create policy "publicar el propio retador" on public.retadores for insert to authenticated with check ((select auth.uid()) = usuario);
create policy "actualizar el propio retador" on public.retadores for update to authenticated using ((select auth.uid()) = usuario) with check ((select auth.uid()) = usuario);
create policy "retirar el propio retador" on public.retadores for delete to authenticated using ((select auth.uid()) = usuario);
create index retadores_poder on public.retadores (poder);

-- Hasta 5 rivales de poder parecido, sin identificadores.
create or replace function public.rivales_cerca(poder_ref integer)
returns table (mes smallint, rareza text, stats smallint[], poder integer)
language sql stable security definer set search_path = '' as $$
  select r.mes, r.rareza, r.stats, r.poder
  from public.retadores r
  where r.usuario is distinct from (select auth.uid())
    and r.poder between poder_ref - 150 and poder_ref + 150
  order by random() limit 5;
$$;
revoke all on function public.rivales_cerca(integer) from public;
grant execute on function public.rivales_cerca(integer) to anon, authenticated;
