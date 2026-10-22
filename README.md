# Atajos N1

Panel de atajos para el soporte técnico N1 de DoctorSV. Es un **marcador del navegador**
(bookmarklet): no se instala nada, no necesita permisos de administrador y no sale de la
máquina donde se usa.

Sirve para dos cosas:

- **Redactar los mensajes repetitivos** del grupo N1 TIC en WhatsApp Web y las respuestas por
  correo, sin escribirlos a mano cada vez.
- **Llenar y leer tickets de ServiceDesk Plus** (`atencion.telesalud.gob.sv`) sin copiar y
  pegar campo por campo.

---

## Cómo instalarlo

1. Descarga este repositorio (botón **Code → Download ZIP**) y descomprímelo.
2. Abre **`instalar.html`** con doble clic. Se abre en el navegador.
3. Arrastra el botón **⚡ Atajos N1** a la barra de marcadores.

Si la barra de marcadores no se ve, en Chrome se activa con `Ctrl + Shift + B`.

**Para actualizarlo:** clic derecho sobre el marcador → Editar, y reemplaza la URL por todo el
contenido de `dist/atajos-n1.marcador.txt`.

> El archivo `.txt` es solo el texto del marcador, para copiar y pegar. `instalar.html` es la
> forma cómoda: trae el botón listo para arrastrar y además muestra el código por si se
> necesita a mano.

## Cómo se usa

Abre WhatsApp Web o un ticket de SDP y toca el marcador. Aparece un panel flotante que se
puede mover arrastrando la barra de arriba, ocultar con `–` y cerrar con `✕`. Si la página se
recarga, se vuelve a tocar el marcador.

---

## Qué trae

### Pestaña N1 — mensajes

| Apartado | Para qué |
|---|---|
| Responder a médicos | Verificado / Solventado / Enseguida / Con gusto |
| Gestionando / Escalado (SDP) | Toma el N.º de ticket, el TSJ y las tipificaciones del ticket abierto y arma la línea para Google Chat |
| Credenciales NERDS | Alta, restablecimiento de contraseña y doble verificación |
| Eliminar doble verificación | Completa el dominio `@doctorsv.gob.sv` y pide el ID de empleado si hace falta |
| Botón de pausa (correo) | Pega el correo del solicitante y arma la respuesta; 8 plantillas |
| Pedir modelo y versión | Solicita modelo y versión de la app de uno o varios usuarios por nombre y DUI |
| Status de slot | Estado del slot, con redacciones que van variando |
| Apoyo de soporte | Solicitud de apoyo en un puesto |
| Equipo dañado o faltante | Máquina, patchcore y qué falta o está dañado |
| Ticket de ronda | Genera los cuatro campos del ticket y los llena en SDP |
| Respuestas al grupo | Frases de un clic |
| Lluvia / filtraciones, Corte de energía, Visita, Localizar médico | Reportes del día a día |
| Validar OTP, NERDS en triage, Latencia TCA / Assist, Copiloto | Casos técnicos |

### Pestaña N2

| Apartado | Para qué |
|---|---|
| Bandeja de seguimiento | Llena tipo de error, queja aplica, resumen, modelo y versión. Por ahora con datos de prueba marcados como tales |

### Pestaña Herramientas

| Apartado | Para qué |
|---|---|
| Diagnóstico rápido | Graba red y consola mientras se reproduce una falla y descarga un `.md` con lo que falló |
| Exportar ticket a .md | Saca el ticket abierto como Markdown, para trabajarlo con una IA sin copiar a mano |
| Gestión de ticket (SDP) | Llena modelo, datos de la cita y TSJ + estado Jira |
| Mapear campos de esta página | Lista los campos del formulario abierto en un `.json` |
| Grabar red y consola | Las opciones del diagnóstico, en detalle |

### Marcador aparte: citas

`dist/cita-sdp.marcador.txt` es un segundo marcador. Se copia una fila de la agenda, se toca el
marcador, se pega en el cuadro y llena el ID de la cita, la especialidad y la fecha y hora
(con la **hora de inicio**) en el ticket de SDP.

---

## Para quien le dé mantenimiento

```
src/n1-atajos.js        el panel completo, comentado en español
src/cita-sdp.js         el marcador de citas
build/instalar.tpl.html plantilla de la página de instalación
build/construir.mjs     compila: genera dist/ e instalar.html
dist/                   lo que se instala (generado, no se edita a mano)
pruebas/                pruebas con jsdom sobre copias simuladas de SDP
```

### Compilar

```bash
npm install          # terser y jsdom
node build/construir.mjs
```

Genera `dist/n1-atajos.min.js`, `dist/atajos-n1.marcador.txt`, sus equivalentes del marcador de
citas e `instalar.html`.

### Probar

```bash
node pruebas/smoke.js salida.txt          # recorre todas las acciones del panel
node pruebas/tfull2.js dist/n1-atajos.min.js   # llenado del ticket de ronda en SDP
node pruebas/tvista.js dist/n1-atajos.min.js   # exportar el ticket a .md
node pruebas/tcita.js dist/cita-sdp.min.js     # el marcador de citas
```

Las pruebas corren sobre **copias simuladas** del formulario de SDP hechas con jsdom, no contra
el SDP real. Sirven para no romper lo que ya funcionaba; la prueba de verdad siempre es abrir
un ticket.

### Cosas que conviene saber antes de tocar el código

- **El panel vive en un `iframe`** propio para que los estilos de WhatsApp o de SDP no lo
  deformen. Se arma con el ayudante `h()` y nunca con `innerHTML`.
- **SDP carga Prototype.js**, que le agrega `toJSON` a `Array` y rompe `JSON.stringify`. Por eso
  existe `jsonStr()`; si se usa `JSON.stringify` directo, el panel sale en blanco dentro de SDP.
- **Las listas de SDP son select2 v3** y comparten un solo desplegable (`#select2-drop`). Al
  escribir en el buscador hay que asegurarse de estar dentro de la lista que se abrió: tomar
  "la primera caja visible de la página" hace que se escriba en **Derivación a especialidad**,
  que es un campo que no se debe tocar nunca.
- **La pantalla de crear ticket** antepone `udf_fields.` a los nombres de los campos; la vista
  del ticket no. `buscar()` prueba las dos formas.
- **En la vista del ticket los datos no son campos de formulario**, son texto. Por eso el
  exportador tiene dos caminos: leer campos o leer la página.
- **El calendario de la fecha de la cita** se cierra al elegir el día y confirma con la hora que
  tenga el reloj en ese momento. La hora se pone **antes** de tocar el día.

---

## Privacidad

Todo corre en el navegador de quien lo usa. No envía datos a ningún servidor, no guarda nada
fuera del `localStorage` del propio navegador (preferencias del panel) y los archivos que genera
se descargan a la máquina.

Aun así, los tickets traen datos de pacientes. **Exportar ticket a .md** tiene una casilla para
ocultar nombre, DUI y teléfono antes de pegar el contenido en una IA externa.

## Historial

Las mejoras que se han ido implementando están en [HISTORIAL.md](HISTORIAL.md).
