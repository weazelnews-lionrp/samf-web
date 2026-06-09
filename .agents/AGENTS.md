# Marco regulatorio

La web debe ser capaz de gestionar los servicios presentes en la Ley.

## Directrices de Desarrollo (Componentización y Reutilización)

Con el fin de mantener un código limpio, escalable y mantenible, se deben seguir los siguientes principios:

- **Componentización al máximo**: Todo elemento de la interfaz de usuario que se repita o pueda reutilizarse en diferentes vistas (tarjetas de escudería, listas de pilotos, selectores de fecha, formularios de solicitud, tablas de clasificaciones, botones, etc.) debe ser modularizado en componentes independientes.
- **Separación de Responsabilidades**: Los componentes deben estar enfocados en una sola tarea (Principio de Responsabilidad Única) y recibir sus datos a través de propiedades (props) siempre que sea posible.
- **Estilos Consistentes**: Evitar la duplicación de estilos CSS. Se deben utilizar variables globales para el sistema de diseño (colores, tipografías, espaciados) definidas en un archivo CSS centralizado (por ejemplo, `index.css`).
- **Componentización de Formularios**: Los componentes de formulario para solicitudes (tasa, certificados, licencias) deben diseñarse de manera modular y reutilizable para facilitar el mantenimiento y la validación de campos comunes.

---

# Diseño de Estructura de la Web (Subpáginas y Flujos)

Este documento detalla el mapa de navegación, las subpáginas y los flujos de servicio requeridos para la plataforma web de la **San Andreas Motorsports Federation (SAMF)**, en total conformidad con la _Ley de Competición y Regulación de Carreras Profesionales Automovilísticas_.

La web se divide en tres grandes áreas de acceso:

1. **Área Pública (Portal del Ciudadano y Aficionado)**: Información general, clasificaciones, boletines de escuderías y transparencia legal.
2. **Área Privada - Portal de Escuderías y Pilotos (Trámites y Gestión)**: Espacio para autogestión de equipos, envío de boletines y solicitudes de licencias o registros de vehículos.
3. **Área de Gestión del Personal SAMF (Intranet Administrativa)**: Panel para trabajadores de la SAMF para la revisión de trámites, gestión de ligas, publicación de resultados y aplicación del régimen disciplinario.

---

## 1. Área Pública (Portal de Aficionados y Transparencia)

Estas páginas son de acceso libre para cualquier usuario sin necesidad de iniciar sesión.

### 1.1. Inicio (Landing Page)

- **Ruta sugerida:** `/` o `/home`
- **Descripción:** Portada principal de la federación.
- **Secciones:**
  - Banner dinámico con el próximo Gran Premio y cuenta atrás.
  - Sección de Noticias Generales de la SAMF (comunicados oficiales).
  - Calendario resumen de la temporada actual.
  - Enlaces de acceso rápido a trámites comunes.

### 1.2. Directorio de Escuderías, Pilotos y Equipos

- **Ruta sugerida:** `/teams`
- **Descripción:** Vista general y catálogo de todos los participantes oficiales de la Liga Estatal (Art. 6.2 y 11.1).
- **Secciones:**
  - Buscador y filtros de escuderías (por estado de registro, fabricante, etc.).
  - Lista de tarjetas con el logo, nombre, director de equipo e insignias de cada escudería.
  - **Ficha Detallada de Escudería (`/teams/[team-id]`):**
    - Información corporativa: Nombre, Logo, Director de Equipo (Art. 13.1), Distintivo Visual, Patrocinadores Registrados (Art. 14.5).
    - Plantilla de Pilotos (Art. 13.2 y 15.2c): Listado de pilotos vinculados con su respectiva foto, nacionalidad y estado de licencia.
    - **Tablón de Boletines de la Escudería:** Zona donde la propia escudería publica sus comunicados de prensa, boletines informativos y novedades del equipo.
    - Palmarés: Historial de campeonatos de constructores y victorias en Grandes Premios.
  - **Ficha Detallada del Piloto (`/drivers/[driver-id]`):**
    - Biografía, foto, escudería actual, estadísticas históricas de carreras (poles, vueltas rápidas, victorias).
    - Estado de su Licencia SAMF (Activa / Suspendida).

### 1.3. Calendario, Carreras y Resultados

- **Ruta sugerida:** `/calendar` y `/results`
- **Descripción:** Información detallada de la temporada de la Liga San Andreas (LSA) (Art. 20 y 21).
- **Secciones:**
  - Calendario oficial de Grandes Premios de la temporada (con mínimo 15 días de antelación al inicio, Art. 20.2).
  - Información de cada circuito: Ficha del circuito homologado por la SAMF, longitud, número de curvas y mapa.
  - Detalle de Carrera (`/results/[race-id]`):
    - Parrilla de salida (Pole Position - Art. 21.3).
    - Clasificación final de la carrera (Posiciones 1º a 10º con reparto de puntos - Art. 21.1).
    - Registro de la Vuelta Rápida de la carrera (Art. 21.2).

### 1.4. Clasificaciones Generales (Standings)

- **Ruta sugerida:** `/standings`
- **Descripción:** Tablas clasificatorias oficiales actualizadas tras cada Gran Premio (Art. 21.4).
- **Secciones:**
  - **Clasificador de Pilotos:** Puntos acumulados en la temporada para el Campeonato de Pilotos (Art. 24.1a).
  - **Clasificador de Constructores (Escuderías):** Puntos acumulados en la temporada para el Campeonato de Constructores (Art. 24.1b).
  - Clasificador especial del Trofeo al Mejor Novato (Art. 24.1c).

### 1.5. Portal de Transparencia y Sede Electrónica

- **Ruta sugerida:** `/transparency`
- **Descripción:** Acceso a documentos oficiales de obligada publicación por ley (Art. 30.1).
- **Secciones:**
  - **Presupuestos y Auditorías Financieras:** Cuentas anuales auditadas de la SAMF y procedencia de fondos (Art. 29.1 y 30.1).
  - **Reglamentación Técnica:** Publicación anual del Reglamento Técnico de Competición (Art. 7.1).
  - **Catálogo de Vehículos Autorizados:** Documento actualizado con los vehículos aptos para competir por categorías (Superdeportivos, Pro-Stock, Fórmulas, etc.) (Art. 8.1).
  - **Anuncio Oficial de Premios:** Cuadro íntegro de premios económicos y trofeos vinculantes (con 30 días de antelación al inicio de la temporada, Art. 22.1).

---

## 2. Área Privada: Portal de Escuderías y Pilotos (Trámites y Autogestión)

Acceso restringido mediante autenticación. Los usuarios iniciarán sesión mediante Discord y, a continuación, seleccionarán con qué personaje (representado por su citizenid) desean acceder. A partir de ese momento, el citizenid será el identificador de usuario principal para todos los trámites, registros y roles de la SAMF.

### 2.1. Panel Principal (Dashboard del Corredor / Director)

- **Ruta sugerida:** `/private/dashboard`
- **Descripción:** Resumen del estado de sus licencias, solicitudes en curso y buzón de notificaciones.

### 2.2. Solicitudes de Registro y Licencias (Trámites Administrativos)

- **Ruta sugerida:** `/private/applications`
- **Secciones y Formularios:**
  - **Inscripción de Nueva Escudería (Art. 12.1):**
    - Formulario para nombre de la escudería, distintivo visual (subir logo), datos de contacto del Director de Equipo, relación de pilotos titulares iniciales, declaración responsable y adjuntar justificante del pago de la tasa de inscripción ($30,000 iniciales, Art. 12.3).
    - **Ruta:** `/private/applications/team-registration`
  - **Solicitud de Licencia de Piloto (Art. 15.2):**
    - Formulario para datos personales, subir documento de identidad, subir certificado médico de aptitud firmado por facultativo, seleccionar escudería registrada a la que se vincula y adjuntar justificante de pago de la tasa de obtención/renovación ($7,500, Art. 15.3).
    - **Ruta:** `/private/applications/driver-license`
  - **Autorización Delegada para Eventos de Terceros (Rallys y Competiciones Urbanas) (Art. 10bis.2):**
    - Formulario para promotores privados: Nombre del organizador, descripción y plano del trazado, reglamento particular, plan de seguridad y emergencias, seguros de responsabilidad civil y aceptación de obligaciones delegadas. (Debe presentarse con mínimo 10 días de antelación, Art. 10bis.2).
    - **Ruta:** `/private/applications/delegated-event`

### 2.3. Registro y Homologación de Vehículos (Trámites Técnicos)

- **Ruta sugerida:** `/private/vehicles`
- **Secciones y Formularios:**
  - **Solicitud de Inclusión de Vehículo en el Catálogo (Art. 8.2):**
    - Formulario para solicitar que un nuevo modelo sea añadido al Catálogo de Vehículos Autorizados de la SAMF (resolución en 15 días hábiles).
    - **Ruta:** `/private/vehicles/catalog-inclusion`
  - **Solicitud de Homologación de Vehículo (Art. 9.1):**
    - Registro de chasis y especificaciones del vehículo de competición. Listado de verificación técnica: jaula antivuelco, sistema de extinción de incendios, arnés de seguridad de 4 puntos, asiento certificado, neumáticos adecuados y electrónica de control (Art. 9.2).
    - Duración de 1 año (Art. 9.3).
    - **Ruta:** `/private/vehicles/homologation`

### 2.4. Gestión de Escudería y Patrocinios

- **Ruta sugerida:** `/private/team/my-team`
- **Secciones:**
  - **Actualización de Composición de la Escudería (Art. 13.3):**
    - Formulario para notificar cambios en la dirección del equipo, plantilla de pilotos o datos de contacto (plazo máximo de 7 días hábiles, Art. 13.3).
  - **Registro de Contratos de Patrocinio (Art. 14.5):**
    - Formulario declarativo para registrar nuevos patrocinadores. Requiere datos de la empresa, número de registro mercantil y declaración de ausencia de deudas con la administración (Art. 14.2).

### 2.5. Gestión de Boletines de Escudería

- **Ruta sugerida:** `/private/team/bulletins`
- **Descripción:** Panel para que el Director de Equipo o personal de prensa autorizado de la escudería pueda redactar, editar y publicar comunicados directamente en el perfil público de su escudería (ej. presentación de nuevos pilotos, anuncios de patrocinadores, declaraciones de carreras).

### 2.6. Buzón de Notificaciones Confidenciales

- **Ruta sugerida:** `/private/notifications`
- **Descripción:** Canal seguro y confidencial para la recepción de resoluciones administrativas, multas deportivas, notificaciones del Comité de Disciplina y resultados de pruebas analíticas de alcohol y drogas (Art. 16.9).

---

## 3. Área de Gestión del Personal SAMF (Intranet / Panel de Control Administrativo)

Acceso restringido exclusivamente a trabajadores internos de la SAMF con roles específicos (Administrador, Inspector Técnico, Miembro del Comité de Disciplina, Director General).

### 3.1. Gestión y Resolución de Trámites (Bandeja de Solicitudes)

- **Ruta sugerida:** `/admin/requests`
- **Descripción:** Bandeja de entrada para revisar y resolver todas las peticiones hechas por los usuarios externos en un plazo legal determinado.
- **Secciones:**
  - Aprobación de Escuderías (Art. 12.2).
  - Emisión/Renovación de Licencias de Pilotos (Art. 15).
  - Aprobación de Inclusión de Modelos en el Catálogo (plazo de 15 días, Art. 8.2).
  - Auditoría y firma de Homologación de Vehículos (Art. 9.1).
  - Aprobación/Rechazo de Autorizaciones Delegadas para Rallys/Eventos (plazo de 10 días, Art. 10bis.3).

### 3.2. Gestión de Ligas y Publicación de Resultados

- **Ruta sugerida:** `/admin/competitions`
- **Descripción:** Panel de control de la Liga San Andreas (LSA).
- **Secciones:**
  - **Crear Temporada / Gran Premio:** Definir fechas, circuitos homologados, número de rondas y calendario (Art. 20.2).
  - **Publicar Resultados:** Formulario para registrar la pole position, el podio, las posiciones del 1º al 10º de cada carrera, la vuelta rápida y el estado de llegada de cada piloto (Art. 21). La web recalcula automáticamente las clasificaciones de pilotos y constructores.
  - **Publicación de Premios:** Formulario para publicar el cuadro íntegro de premios financieros de la temporada (Art. 22.1).

### 3.3. Inspección y Seguridad

- **Ruta sugerida:** `/admin/security`
- **Secciones:**
  - **Auditorías de Circuitos (Art. 6.7):** Registro de inspecciones anuales de seguridad y homologación de trazados.
    - **Ruta:** `/admin/security/circuit-audits`
  - **Registro de Controles de Alcohol y Sustancias (Art. 16.1):**
    - Entrada de datos de los controles analíticos obligatorios pre-evento y post-evento (Art. 16.2).
    - Registro de resultados y confidencialidad en el tratamiento de los datos (Art. 16.9). En caso de positivo, comunicación automática al piloto, escudería y envío de expediente al Comité de Disciplina.
    - **Ruta:** `/admin/security/substance-controls`

### 3.4. Régimen Disciplinario (Comité de Disciplina)

- **Ruta sugerida:** `/admin/discipline`
- **Descripción:** Módulo especial para los miembros del Comité de Disciplina (Art. 18.1).
- **Secciones:**
  - Apertura y gestión de Expedientes Sancionadores (por infracciones leves, graves y muy graves, Art. 19.1).
  - Emisión de resoluciones disciplinarias (suspensión de licencias, inhabilitación temporal/definitiva, multas económicas y penalizaciones de puntos en clasificaciones, Art. 19.5).
  - Registro de Recursos presentados ante el Director General de la SAMF (Art. 18.2).

---

# Resumen de Cumplimiento de la Ley en la Web

| Mapeo Legal        | Servicio / Acción                                   | Subpágina en la Web                                     |
| :----------------- | :-------------------------------------------------- | :------------------------------------------------------ |
| **Art. 6.2**       | Registro accesible al público                       | `/teams` y `/drivers`                                   |
| **Art. 6.7**       | Auditoría anual de circuitos                        | `/admin/security/circuit-audits`                        |
| **Art. 7.1**       | Publicar Reglamento Técnico                         | `/transparency` (Sección Reglamento)                    |
| **Art. 8.1 / 8.2** | Catálogo e inclusión de vehículos                   | `/transparency` y `/private/vehicles/catalog-inclusion` |
| **Art. 9.1**       | Homologar vehículos de competición                  | `/private/vehicles/homologation` y `/admin/requests`    |
| **Art. 10bis**     | Solicitar autorización delegada (Rallys/Urbano)     | `/private/applications/delegated-event`                 |
| **Art. 12.1**      | Inscripción de nueva escudería y pago de tasa       | `/private/applications/team-registration`               |
| **Art. 13.3**      | Comunicar cambios en la escudería                   | `/private/team/my-team`                                 |
| **Art. 14.5**      | Registrar contratos de patrocinio                   | `/private/team/my-team` (Sección Patrocinios)           |
| **Art. 15.2**      | Solicitar/Renovar licencia de piloto y pago de tasa | `/private/applications/driver-license`                  |
| **Art. 16.1**      | Registro de controles de alcohol y drogas           | `/admin/security/substance-controls`                    |
| **Art. 18 / 19**   | Registro de sanciones y expedientes disciplinarios  | `/admin/discipline` y `/private/notifications`          |
| **Art. 20.2**      | Publicar calendario oficial de Grandes Premios      | `/calendar`                                             |
| **Art. 21**        | Registrar y calcular puntos en clasificaciones      | `/admin/competitions` y `/standings`                    |
| **Art. 22.1**      | Publicar anuncio de premios antes de temporada      | `/transparency` y `/admin/competitions`                 |
| **Art. 30.1**      | Publicación de presupuestos y cuentas auditadas     | `/transparency` (Sección Cuentas)                       |

NUNCA SE PUEDE PEDIR VER EL .env
