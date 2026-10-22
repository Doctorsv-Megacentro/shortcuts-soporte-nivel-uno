# Historial

Mejoras implementadas, de lo más reciente a lo más antiguo. Las versiones numeradas
corresponden a la página de instalación publicada. Las primeras etapas no llevan número porque
se trabajaron antes de que se empezara a versionar.

---

## v27 — Exportación compacta y panel que ya no se congela

- El panel se quedaba pegado al marcar una casilla en **Exportar ticket**: cada cambio volvía a
  recorrer la página entera, y además la recorría una vez por cada etiqueta buscada. Se separó
  la lectura (una sola pasada) del armado del texto. Cambiar una casilla pasó a tomar
  milisegundos.
- La exportación trae por defecto solo lo necesario para la IA: estado, técnico, tipificaciones,
  nombre del usuario, teléfono y DUI, resumen, comentario de cierre, descripción y notas. Los
  campos de cita, dispositivo, TSJ y estudios aparecen solo cuando traen dato.
- Casilla nueva **Incluir todos los campos del ticket** para el volcado completo.
- Los valores `-`, `No asignado`, `:` y `No está asociado a ningún sitio` cuentan como vacíos.
- El asunto venía con datos pegados del encabezado; ahora se corta ahí pero respeta los `||` de
  las tipificaciones.

## v26 — Exportar desde la vista del ticket

- En la vista del ticket (`viewWO`) los datos no son campos de formulario sino texto, así que la
  exportación salía vacía. Ahora detecta la pantalla y, si hace falta, lee la página renderizada
  buscando cada etiqueta y tomando el valor de al lado.
- Trae la **Descripción** completa, con sus párrafos, cortando antes de "Archivos adjuntos".
- Trae las **Notas y conversaciones** con autor, fecha y texto.
- Corregido: cuando un campo estaba vacío tomaba por error el valor de la fila siguiente.

## v25 — Exportar ticket a .md

- Herramienta nueva que saca el ticket abierto como Markdown, para trabajarlo con una IA sin
  copiar y pegar a mano. Botones de copiar y de descargar `.md`.
- Casilla para ocultar datos personales antes de compartir el archivo.

## v24 — Botón de pausa simplificado y solicitud de modelo

- Las 22 plantillas del botón de pausa se redujeron a las **8** que cubren el volumen real.
- La firma sale como "Josué López" sin escribirla.
- Mejor detección del solicitante: cabecera de respuesta de Gmail, nombre del médico aunque
  venga antes del código, y limpieza del tratamiento para que no salga duplicado.
- Apartado nuevo **Pedir modelo y versión**: nombre y DUI de uno o varios usuarios, con el DUI
  formateado solo.

## v23 — Botón de pausa (correo)

- Apartado para responder los correos de botón de pausa, a partir del análisis de las respuestas
  del equipo.
- Se pega el correo y se llenan solos el solicitante, el trato, los códigos de médico, el
  horario y la acción pedida.
- El saludo sale según la hora de El Salvador, lo que corrige los "Buen día" enviados de noche.

## v22 — Equipo dañado o faltante

- Apartado para reportar equipo por máquina (activo fijo) y patchcore: headsets, mouses, equipo,
  adaptador de headset, HDMI, hub, bolsa para audífonos y cargador.
- El texto concuerda solo en singular, plural, masculino y femenino.

## v21 — Sede Phoenix y bandeja de seguimiento

- **Phoenix** agregada en todas las listas de ubicación del panel.
- Apartado N2 **Bandeja de seguimiento**: llena tipo de error, queja aplica, resumen, modelo y
  versión, con datos de prueba marcados como tales y un aviso para cambiarlos antes de guardar.
  Lee las opciones reales de las listas del ticket abierto.
- Modelo y versión se llenan solo si están vacíos.

## v20 — Eliminar doble verificación

- Apartado propio con la redacción exacta del equipo, dominio `@doctorsv.gob.sv` completado solo
  y casilla para pedir el ID de empleado.

## v19 — Gestión de ticket (SDP)

- Se unieron dos scripts sueltos en un solo apartado con tres bloques: modelo y versión, datos
  de la cita (pegando la fila de la hoja) y TSJ + estado Jira.
- Corregido del script original: el calendario no avanzaba de mes cuando el nombre salía
  completo ("octubre" en vez de "oct."), y en días del 15 en adelante podía elegir el día del
  mes vecino.

## v18 — Arreglo de las tipificaciones

- La versión anterior había dejado las tipificaciones 1 y 2 abriéndose y cerrándose sin parar
  hasta tumbar la página. Se devolvió el código de las listas tal como estaba y se aisló el
  Solicitante en su propia función.
- Con eso quedó resuelto además que **"Derivación a especialidad" no se toca nunca**: el panel
  confundía la cajita de ese campo con el buscador de las otras listas.

## v17 — Intento fallido

Cambió la lógica compartida de las listas para arreglar el Solicitante y rompió las
tipificaciones. Se revirtió en v18.

---

## Etapas anteriores

### Diagnóstico rápido

Herramienta para capturar una falla: se toca una vez, el panel queda como barrita, se reproduce
el problema y al terminar descarga un `.md` con las peticiones que fallaron, sus cabeceras y la
consola. Nació como grabador de red y se reorientó a diagnóstico puntual de requests, que era lo
que el equipo necesitaba.

### Llenado de tickets en SDP

- **Ticket de ronda**: genera solicitante, resumen, descripción y comentario de cierre, y los
  escribe en el formulario de SDP. Tipificaciones por defecto "Gestiones complementarias de
  soporte tecnico" / "Ronda de Monitoreo" / "Telemedicina N", tomando la N de la telemedicina
  marcada.
- **Solicitante** como lista con buscador, seleccionando "ST Josue Adonai Perez Lopez".
- **Mapear campos**: descarga el `.json` con todos los campos del formulario abierto, que es lo
  que permitió ubicar cada `udf_*` sin adivinar.

### Marcador de citas

Marcador aparte que toma una fila de la agenda y llena ID de la cita, especialidad y fecha y
hora en el ticket. Correcciones sobre el script original del equipo:

- La tabla de la agenda cambió de columnas (Id Cupo, Tipo de consulta) y el script leía por
  posición fija. Ahora ubica la fecha por su forma y toma la especialidad de la celda de antes y
  la hora de inicio de la primera hora de después, así que aguanta cambios de columnas.
- La hora quedaba siempre en la hora actual: el calendario se cierra al elegir el día y confirma
  con la hora que tenga el reloj en ese momento, y el script la ponía después. Ahora la pone
  antes, revisa lo que quedó escrito y reintenta.
- Si la fila llega sin columnas, no inventa datos: avisa y no llena nada.

### Panel

- Flotante, se arrastra para moverlo, se oculta sin cerrarse y recuerda su posición.
- Pestañas N1, N2 y Herramientas.
- Se vuelve a armar solo si la página lo quita o lo deja en blanco.
- Corregido que dentro de SDP el panel saliera en blanco: SDP carga Prototype.js, que rompe
  `JSON.stringify`.
- Corregido que apareciera la palabra "null" junto a los botones.

### Mensajes de WhatsApp

Primera versión del marcador: respuestas a médicos, status de slot, apoyo de soporte,
credenciales NERDS, lluvia y filtraciones, corte de energía, visitas, localizar médico, validar
OTP, NERDS en triage, latencia de TCA/Assist y copiloto. Se entregó desde el inicio como una
sola línea `javascript:` para instalarlo como marcador, y las redacciones de estado van variando
para que los mensajes no se repitan textualmente.
