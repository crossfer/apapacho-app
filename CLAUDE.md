# Apapacho Homes — App

Plataforma de home care de lujo para propiedades en San Diego y Los Angeles.
Web app en `app.apapachohomes.com` que conecta clientes (propietarios), staff (operarios) y admins.

## Concepto del negocio

Apapacho Homes ofrece servicios premium de mantenimiento del hogar a propietarios de lujo:
mexicanos con segunda residencia en California y americanos con múltiples propiedades.
El diferenciador clave es la **transparencia total**: cada servicio queda documentado con
foto, timestamp y estatus visible para el cliente en tiempo real.

Servicios:
- Limpieza del hogar (general, alberca, jardín, post-evento)
- Organización de espacios (closets, cocinas, garajes)
- Decoración de temporada (Navidad, Halloween, Easter, 4th of July)
- Domótica y seguridad (instalación y mantenimiento)
- Movilidad y recreación (bicis, e-scooters, patines, motos eléctricas, tablas)

---

## Stack tecnológico

| Capa | Herramienta |
|------|-------------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage (fotos) | Supabase Storage |
| Real-time | Supabase Realtime |
| i18n | next-intl |
| Componentes UI | shadcn/ui |
| Deploy | Vercel |
| Email transaccional | Resend |
| Calendario admin | @fullcalendar/react |

---

## Estructura de carpetas

```
app/
├── (auth)/
│   ├── login/
│   └── forgot-password/
├── (admin)/
│   ├── layout.tsx              # sidebar admin
│   ├── dashboard/
│   ├── calendario/             # react-big-calendar con todas las órdenes
│   ├── clientes/
│   │   ├── page.tsx            # lista de clientes
│   │   └── [id]/               # perfil + propiedades + historial
│   ├── proveedores/
│   │   ├── page.tsx            # lista de staff / proveedores
│   │   └── [id]/               # perfil + órdenes asignadas
│   ├── ordenes/
│   │   ├── page.tsx
│   │   ├── nueva/
│   │   └── [id]/
│   └── propiedades/
├── (staff)/
│   ├── layout.tsx              # vista móvil-first para operarios
│   ├── dashboard/              # mis órdenes de hoy
│   └── ordenes/[id]/           # detalle + botón cambio estatus + cámara
├── (client)/
│   ├── layout.tsx              # vista cliente premium
│   ├── dashboard/
│   ├── servicios/
│   └── historial/
└── api/
    ├── auth/
    └── webhooks/

components/
├── ui/                     # shadcn/ui components
├── admin/
├── staff/
└── client/

lib/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   └── middleware.ts
├── utils.ts
└── constants.ts

messages/
├── es.json                 # español
└── en.json                 # english

types/
└── database.types.ts       # generado desde Supabase
```

---

## Roles y permisos

### Admin
El panel de admin tiene sidebar con las siguientes secciones:

**Dashboard** — resumen del día: órdenes de hoy, en progreso, completadas, pendientes de asignar.

**Calendario** — vista mensual/semanal de todas las órdenes de servicio.
  - Cada evento muestra: tipo de servicio, propiedad, staff asignado y estatus (color por estatus)
  - Se puede hacer clic en un evento para ver el detalle o editar
  - Filtros por ciudad (San Diego / LA), por staff, por tipo de servicio
  - Usar la librería `react-big-calendar` o `@fullcalendar/react`

**Clientes** — CRUD completo de clientes y sus propiedades.
  - Lista de clientes con buscador, filtro por ciudad
  - Perfil de cliente: datos, propiedades, historial de servicios
  - Crear/editar cliente y asignarle propiedades
  - Botón para invitar al cliente (le manda email de bienvenida con link de acceso)

**Proveedores / Staff** — CRUD completo de operarios y proveedores externos.
  - Lista de staff con nombre, teléfono, especialidades, ciudad(es) donde opera
  - Ver órdenes asignadas a cada operario
  - Perfil del operario: foto, historial de servicios realizados, calificación interna
  - Especialidades: array de service_types que puede atender
  - Diferencia entre staff interno y proveedor externo (`staff_type: 'internal' | 'external'`)
  - Proveedores externos pueden tener empresa, RFC, datos de pago

**Órdenes de servicio** — lista y gestión de todas las órdenes.
  - Crear nueva orden: seleccionar cliente → propiedad → tipo de servicio → staff → fecha
  - Ver detalle de cada orden: estatus, actualizaciones, fotos, ubicación GPS del staff
  - Reasignar staff, cambiar fecha, cancelar

**Reportes** — próximamente (v2)

Accede desde desktop principalmente; también funcional en móvil.

### Staff (operario)
- Ve solo las órdenes asignadas a él
- Actualiza el estatus de cada orden (pendiente → en proceso → completado)
- Al cambiar el estatus, la app captura automáticamente:
  - **Fecha y hora exacta** del dispositivo (`Date.now()` en UTC)
  - **Ubicación GPS** vía `navigator.geolocation.getCurrentPosition()` — latitud, longitud y precisión
  - Si el usuario deniega la ubicación, se guarda igualmente el timestamp y se marca `location_denied: true`
- Sube fotos al completar (o durante) el servicio
- Agrega notas o comentarios
- Vista optimizada para móvil (usan el celular en campo)
- El botón de cambio de estatus debe ser grande y prominente — acción principal de la vista

### Client (propietario)
- Ve solo sus propiedades y sus servicios
- Puede ver estatus en tiempo real, historial completo, fotos
- Puede solicitar un nuevo servicio (formulario simple)
- Recibe notificaciones push/email cuando un servicio se completa
- Idioma auto-detectado (ES/EN), puede cambiarlo manualmente
- Vista premium y limpia — no ve nada del back-office

---

## Modelo de datos (Supabase)

### profiles
```sql
id          uuid references auth.users primary key
role        text check (role in ('admin','staff','client'))
full_name   text
phone       text
avatar_url  text
language    text default 'auto'  -- 'es' | 'en' | 'auto'
created_at  timestamptz default now()
```

### properties
```sql
id          uuid primary key default gen_random_uuid()
client_id   uuid references profiles(id)
name        text          -- ej: "Residencia San Diego"
address     text
city        text          -- 'San Diego' | 'Los Angeles'
notes       text
created_at  timestamptz default now()
```

### service_orders
```sql
id            uuid primary key default gen_random_uuid()
property_id   uuid references properties(id)
staff_id      uuid references profiles(id)
service_type  text  -- 'cleaning' | 'organization' | 'decoration' | 'smart_home' | 'mobility'
service_sub   text  -- ej: 'pool', 'closet', 'christmas', 'bike'
status        text  -- 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
scheduled_at  timestamptz
completed_at  timestamptz
notes         text
created_at    timestamptz default now()
```

### service_updates
```sql
id               uuid primary key default gen_random_uuid()
order_id         uuid references service_orders(id)
staff_id         uuid references profiles(id)
status           text        -- el nuevo estatus en este update
note             text
-- Captura automática al cambiar estatus desde el dispositivo del staff:
timestamp_device timestamptz -- fecha/hora del dispositivo en el momento exacto
latitude         numeric(10,7)
longitude        numeric(10,7)
location_accuracy numeric     -- precisión en metros (de la API del browser)
location_denied  boolean default false  -- true si el staff negó permisos de ubicación
created_at       timestamptz default now()
```

### service_photos
```sql
id          uuid primary key default gen_random_uuid()
order_id    uuid references service_orders(id)
update_id   uuid references service_updates(id)
storage_path text   -- path en Supabase Storage
caption     text
created_at  timestamptz default now()
```

### vendors (proveedores externos)
```sql
id            uuid primary key default gen_random_uuid()
profile_id    uuid references profiles(id)  -- su cuenta de acceso (role='staff')
company_name  text
tax_id        text        -- RFC o EIN
specialties   text[]      -- ej: ['cleaning','mobility','smart_home']
cities        text[]      -- ej: ['San Diego','Los Angeles']
staff_type    text default 'internal' check (staff_type in ('internal','external'))
payment_info  text        -- notas de pago (encriptadas o solo admin puede ver)
active        boolean default true
created_at    timestamptz default now()
```

### notifications
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references profiles(id)
order_id    uuid references service_orders(id)
type        text  -- 'service_completed' | 'service_started' | 'new_order'
read        boolean default false
created_at  timestamptz default now()
```

---

## Row Level Security (RLS)

Reglas clave a implementar en Supabase:

- `profiles`: cada usuario solo puede leer/editar su propio perfil; admin puede leer todos
- `properties`: client solo ve las suyas; staff ve las asignadas; admin ve todas
- `service_orders`: client ve las de sus propiedades; staff ve las asignadas a él; admin ve todas
- `service_updates` y `service_photos`: misma lógica que service_orders
- `notifications`: cada usuario solo ve las suyas

---

## Flujos principales

### Flujo de servicio (happy path)
1. Admin crea orden → asigna propiedad, tipo de servicio, staff, fecha → aparece en el Calendario
2. Staff recibe notificación con los detalles de la orden
3. Staff llega, presiona **"Iniciar servicio"** — la app pide permiso de ubicación y captura lat/lng + timestamp
4. Staff sube fotos durante el servicio si aplica
5. Staff presiona **"Completar"** → captura ubicación + timestamp + fotos finales + nota opcional
6. Sistema notifica al cliente (email + in-app)
7. Cliente ve en su app: fotos, hora exacta, nombre del operario y un mapa con el punto donde se realizó
8. El evento en el Calendario del admin cambia de color a "completado"

### Captura de ubicación en el staff (implementación)
```typescript
// Llamar antes de cada cambio de estatus
async function captureLocation(): Promise<LocationData> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ denied: true, timestamp: new Date() })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy:  pos.coords.accuracy,
        timestamp: new Date(),
        denied:    false,
      }),
      () => resolve({ denied: true, timestamp: new Date() }),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })
}
```
El resultado se guarda en `service_updates` junto con el nuevo estatus.

### Flujo de reparación (ej: bicicleta)
- Estatus más granular: `received` → `diagnosing` → `in_repair` → `ready` → `delivered`
- En cada cambio el cliente ve la actualización en tiempo real

### Flujo de cliente nuevo
1. Admin crea cuenta del cliente en Supabase Auth
2. Cliente recibe email de bienvenida con link para crear su password
3. Al ingresar por primera vez: onboarding simple (idioma, ver su propiedad)

---

## Internacionalización (i18n)

Usar `next-intl`. La app detecta el idioma del dispositivo al cargar.
El usuario puede cambiarlo manualmente y se guarda en `profiles.language`.

Todos los textos van en `messages/es.json` y `messages/en.json`.
Nunca hardcodear strings en español o inglés dentro de los componentes.

---

## Convenciones de código

- TypeScript estricto (`strict: true`)
- Componentes en PascalCase, archivos en kebab-case
- Server Components por default; Client Components solo cuando se necesite interactividad
- Fetch de datos siempre en Server Components o Route Handlers — nunca `useEffect` + fetch
- Supabase client del servidor: `createServerClient` (con cookies)
- Supabase client del browser: `createBrowserClient` (solo para realtime y uploads)
- Formularios: React Hook Form + Zod para validación
- Imágenes de servicio: subir a Supabase Storage bucket `service-photos`, carpeta `{order_id}/`
- Fechas: siempre en UTC en la DB, formatear con `Intl.DateTimeFormat` según el locale del usuario

---

## Paleta de colores de marca

```
Verde Agave  #4F6D5A   — color principal oscuro, fondos, nav
Terracota    #C56A3D   — acento cálido, íconos
Arena        #E9D8B4   — fondo claro, cards
Nogal        #6B4A34   — texto oscuro, headers
Bugambilia   #B83E7A   — CTAs, acciones primarias, badges
Dorado       #B68A4C   — logo, detalles decorativos
```

---

## Variables de entorno necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=https://app.apapachohomes.com
```

---

## Comandos útiles

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Generar tipos de Supabase
npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.types.ts

# Build
npm run build
```

---

## Prioridad de desarrollo

1. **Setup**: Next.js + Supabase + Auth + RLS + i18n + `@fullcalendar/react`
2. **Admin — Clientes**: CRUD de clientes y propiedades, invite por email
3. **Admin — Proveedores/Staff**: CRUD de operarios internos y proveedores externos, especialidades
4. **Admin — Órdenes**: crear y asignar órdenes de servicio
5. **Admin — Calendario**: vista mensual/semanal de órdenes, filtros por staff/ciudad/tipo
6. **Staff — Órdenes**: lista de mis órdenes, detalle, cambio de estatus con GPS + timestamp automático, subida de fotos
7. **Cliente — Dashboard**: sus propiedades, servicios activos, historial, fotos con hora y operario
8. **Real-time**: actualizaciones en vivo para cliente y admin cuando staff actualiza
9. **Notificaciones**: email al cliente al completar servicio
10. **Polish**: animaciones, empty states, loading skeletons, PWA manifest

---

## Notas importantes

- La app es para propietarios de lujo: la UI del cliente debe ser **premium, limpia y simple**.
  El cliente no debe ver ningún elemento de back-office.
- El staff usa la app principalmente en móvil desde el campo: su vista debe ser
  **mobile-first, grande y fácil de usar con una mano**.
- Siempre mostrar el nombre del operario y la hora exacta junto a cada foto —
  eso es el diferenciador de confianza con el cliente.
