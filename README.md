# Sistema Solar · Three.js

**En vivo → <http://212.227.41.107/solar-system/>** ·
**Repo → <https://github.com/Haddy18/solar-system-threejs>**

Simulación interactiva del Sistema Solar hecha con **Three.js**: órbitas
keplerianas reales, texturas 100 % procedurales (sin descargas), bloom,
etiquetas, panel de datos en español y dos modos de escala.

Todo funciona **sin conexión**: Three.js está incluido en `vendor/` y cada
textura se genera por código con ruido determinista.

---

## Cómo ejecutarlo

Los módulos ES necesitan un servidor HTTP (no vale abrir `index.html` con
doble clic):

**Windows** — doble clic en `start.bat` (arranca el servidor y abre el
navegador en `http://localhost:8080`).

**macOS / Linux**

```bash
bash start.sh
# o manualmente
python3 -m http.server 8080     # o: npm start
```

Después abre <http://localhost:8080>.

---

## Qué incluye

| | |
|---|---|
| **Órbitas reales** | Elementos orbitales JPL (epoch J2000) resueltos con la ecuación de Kepler por Newton-Raphson: excentricidad, inclinación, nodo ascendente y perihelio reales. |
| **Posiciones actuales** | Los planetas están donde están de verdad en la fecha simulada (se puede viajar en el tiempo). |
| **Sol animado** | Superficie con granulación fbm en shader GLSL, oscurecimiento al limbo, manchas oscuras, doble corona y halos aditivos con bloom. |
| **Texturas procedurales** | Continentes, océano con mapa de rugosidad (brillo del agua), casquetes polares, cráteres, bandas de gigantes gaseosos, Gran Mancha Roja, Mancha Oscura de Neptuno, nubes en capa aparte. |
| **Atmósferas** | Halo fresnel aditivo en Tierra, Venus, Marte y los gigantes. |
| **Anillos** | Saturno con división de Cassini y hendidura de Encke; anillos tenues de Urano; UV radiales propios. |
| **Satélites y cinturones** | La Luna (órbita inclinada 5,1° y excentricidad reales), 2.600 asteroides instanciados y 4.200 objetos del cinturón de Kuiper. |
| **Dos escalas** | *Visual* (todo visible) y *real* (1 unidad = 1 radio terrestre; el vacío a escala de verdad). |
| **Tiempo** | Pausa, 0,01 → 1.000 días/s, fecha simulada, botón «Hoy». |
| **Cámara** | Vuelo animado al seleccionar un cuerpo, seguimiento, órbita libre, auto-rotación cuando estás quieto. |
| **Extras** | Bloom (UnrealBloomPass), Vía Láctea de fondo, etiquetas CSS2D, panel de datos con curiosidades, atajos de teclado, responsive. |

## Controles

- **Arrastrar** orbitar · **rueda** acercar/alejar · **clic** en un planeta para explorarlo
- `Espacio` pausar/reanudar · `←` `→` velocidad · `1`…`9` ir a Sol…Neptuno
- `F` seguir/soltar · `Esc` cerrar · `O` órbitas · `L` etiquetas · `R` escala real · `?` ayuda

### Enlaces directos

```
http://localhost:8080/#saturno              vuela hasta Saturno
http://localhost:8080/?instant=1#tierra     sin vuelo (foto fija)
http://localhost:8099/?real=1&instant=1#luna  en escala real
```

## Estructura

```
index.html            HUD + importmap
css/style.css         interfaz (glass, responsive)
js/
  main.js             renderer, bloom, cámara, tiempo, teclado, bucle
  config.js           datos de todos los cuerpos (español) + elementos orbitales
  kepler.js           ecuación de Kepler, perifocal → eclíptica → three.js
  scale.js            modos de escala (visual / real)
  solar.js            construcción y animación de la escena
  textures.js         generación procedural de texturas
  shaders.js          shader del Sol y halos de atmósfera
  noise.js            Perlin 2D + ruido de valor 3D sembrado
  camera.js           vuelos y seguimiento de cuerpos
  ui.js               HUD: tiempo, panel, chips, conmutadores
vendor/three/         Three.js r186 + addons (controls, CSS2D, postprocessing)
```

## Despliegue (VPS)

Al estilo de `opencode-runner`: la configuración vive en **`.env`** (local,
ignorado por git) a partir de la plantilla versionada **`.env.example`**; las
credenciales no se copian nunca en el repo, las aporta el helper del
escritorio (`VPS_SSH`), y con `VPS_SSH` vacío se usarían clave ssh (CI).

```bash
cp .env.example .env      # VPS_HOST, VPS_SSH_PORT, VPS_DEPLOY_PATH, SITE_URL…
bash scripts/deploy.sh --dry-run   # qué viajaría, sin tocar nada
bash scripts/deploy.sh             # sube, intercambia y verifica la URL
```

- El sitio se publica en `/var/www/html/solar-system/` y lo sirve nginx
  gracias a un bloque `location /solar-system/` (con `alias`) en el virtual
  host que captura la IP; el despliegue es atómico (`…​.tmp` + intercambio),
  así que el sitio nunca queda a medias.
- El script termina comprobando que `/`, `js/main.js` y el módulo de Three.js
  devuelven 200.

## Notas técnicas

- **Unidades internas**: posiciones en UA; cada modo aplica su propio factor
  (`100 u/UA` visual, `23.479 u/UA` real) y su curva de radios
  (`√km` visual, `km/6371` real, de modo que la Tierra mide 1 unidad en ambos
  y la Luna puede situarse en radios terrestres).
- `logDepthBuffer` + `near 0,001 / far 10⁷` permiten convivir el detalle
  lunar y el cinturón de Kuiper en la misma escena.
- Las texturas son deterministas (semillas fijas): la misma escena en cada
  carga. Para variar el detalle, cambia las semillas en `config.js`.
- Rendimiento: planetas con geometría adaptativa (96×64 gigantes, 64×40
  rocosos), asteroides con `InstancedMesh`, estrellas como `Points`, ratio de
  píxel limitado a 1,75.

## Créditos

- Datos: NASA/JPL (elementos orbitales y fichas de planetas).
- Three.js © the Three.js Authors (MIT), incluido en `vendor/three`.
- Texturas y fondo: generados por este proyecto, sin assets externos.
