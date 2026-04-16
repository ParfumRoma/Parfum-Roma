# Configuracion Online (Supabase)

Este proyecto ya esta preparado para funcionar online desde cualquier dispositivo.

## 1) Crear proyecto en Supabase
- Crea un proyecto en https://supabase.com
- En `Project Settings > API` copia:
  - `Project URL`
  - `anon public key`

## 2) Crear tabla `products`
En `SQL Editor`, ejecuta:

```sql
create table if not exists public.products (
  id text primary key,
  nombre text not null,
  precio numeric not null,
  descripcion text not null,
  imagen text not null,
  categoria text not null check (categoria in ('arabe', 'disenador')),
  updated_at timestamp with time zone default now()
);
```

## 3) Habilitar RLS y politicas

```sql
alter table public.products enable row level security;

create policy "read products" on public.products
for select to anon, authenticated
using (true);

create policy "write products auth" on public.products
for all to authenticated
using (true)
with check (true);
```

## 4) Crear usuario admin (Auth)
En `Authentication > Users` crea un usuario con email y contrasena.
Ese email/contrasena se usa en `admin.html`.

## 5) Configurar claves en este proyecto
Edita `cloud-config.js` y pega:

```js
window.CLOUD_CONFIG = {
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
  SUPABASE_ANON_KEY: 'TU_ANON_KEY'
};
```

## 6) Deploy
Subi estos archivos junto al resto:
- `cloud-config.js`
- `cloud-db.js`
- `script.js`
- `admin.js`
- `index.html`
- `admin.html`

## Notas
- Si `cloud-config.js` no esta configurado, el sistema cae automaticamente a modo localStorage.
- En modo nube, lo que edites en admin se ve desde cualquier dispositivo.
