create table public.ciudad_amistades (
  emisor uuid not null default auth.uid() references auth.users(id) on delete cascade,
  receptor uuid not null references auth.users(id) on delete cascade,
  aceptada boolean not null default false,
  primary key (emisor, receptor),
  check (emisor <> receptor)
);
create unique index ciudad_amistades_pareja on public.ciudad_amistades
  (least(emisor, receptor), greatest(emisor, receptor));
create index ciudad_amistades_receptor on public.ciudad_amistades (receptor);
alter table public.ciudad_amistades enable row level security;
revoke all on public.ciudad_amistades from anon, authenticated;
grant select, delete on public.ciudad_amistades to authenticated;
grant insert (receptor), update (aceptada) on public.ciudad_amistades to authenticated;
create policy ciudad_amistades_lectura on public.ciudad_amistades for select to authenticated
  using ((select auth.uid()) in (emisor, receptor));
create policy ciudad_amistades_solicitar on public.ciudad_amistades for insert to authenticated
  with check (emisor = (select auth.uid()) and not aceptada);
create policy ciudad_amistades_aceptar on public.ciudad_amistades for update to authenticated
  using (receptor = (select auth.uid()) and not aceptada)
  with check (receptor = (select auth.uid()) and aceptada);
create policy ciudad_amistades_quitar on public.ciudad_amistades for delete to authenticated
  using ((select auth.uid()) in (emisor, receptor));

-- Cada cuenta conserva solo su último mensaje.
create table public.ciudad_chat (
  jugador uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  mensaje text not null check (char_length(mensaje) between 1 and 100),
  cuando timestamptz not null default now()
);
create index ciudad_chat_reciente on public.ciudad_chat (cuando desc);
alter table public.ciudad_chat enable row level security;
revoke all on public.ciudad_chat from anon, authenticated;
grant select on public.ciudad_chat to authenticated;
grant insert (jugador, mensaje), update (jugador, mensaje) on public.ciudad_chat to authenticated;
create policy ciudad_chat_lectura on public.ciudad_chat for select to authenticated
  using (cuando > now() - interval '20 minutes' or jugador = (select auth.uid()));
create policy ciudad_chat_enviar on public.ciudad_chat for insert to authenticated
  with check (jugador = (select auth.uid()));
create policy ciudad_chat_reemplazar on public.ciudad_chat for update to authenticated
  using (jugador = (select auth.uid())) with check (jugador = (select auth.uid()));

create function public.filtrar_chat_ciudad() returns trigger
language plpgsql set search_path = '' as $$
declare
  trozo text;
  normal text;
  limpio text := '';
begin
  if tg_op = 'UPDATE' and old.cuando > now() - interval '3 seconds' then
    raise exception 'Espera tres segundos entre mensajes';
  end if;
  new.cuando := now();
  new.mensaje := regexp_replace(trim(new.mensaje), '[[:space:]]+', ' ', 'g');
  if char_length(new.mensaje) not between 1 and 100 then raise exception 'Mensaje de 1 a 100 caracteres'; end if;
  if new.mensaje ~* '(@|https?://|www[.]|[0-9][0-9 .()+-]{5,}[0-9])' then
    raise exception 'Evita compartir enlaces o datos de contacto';
  end if;
  foreach trozo in array regexp_split_to_array(new.mensaje, ' ') loop
    normal := regexp_replace(translate(lower(trozo), 'áéíóúü013457', 'aeiouuoieast'), '[^a-z]', '', 'g');
    if normal ~ '^(put[ao]|mierd|joder|jodid|cabron|imbecil|verga|pendej|maricon|coñ|cono|malparid|culer|carajo|gilipoll|gonorre|fuck|shit|bitch|asshole)' then
      trozo := '••••';
    end if;
    limpio := limpio || case when limpio = '' then '' else ' ' end || trozo;
  end loop;
  new.mensaje := limpio;
  return new;
end;
$$;
revoke execute on function public.filtrar_chat_ciudad() from public, anon, authenticated;
create trigger ciudad_chat_moderar before insert or update on public.ciudad_chat
  for each row execute function public.filtrar_chat_ciudad();
