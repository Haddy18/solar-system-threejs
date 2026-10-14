/* ═══ Datos del Sistema Solar ═══════════════════════════════
 * Elementos orbitales ≈ JPL (epoch J2000):
 *   a   : semieje mayor (UA)      e  : excentricidad
 *   i   : inclinación (°)         L  : longitud media (°)
 *   peri: longitud del perihelio (°)  node: longitud nodo ascendente (°)
 * Posiciones reales (aprox. a ~1 km de exactitud práctica).
 */

export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0); // 1 ene 2000 12:00 TT
export const AU_KM = 149597870.7;
export const EARTH_RADIUS_KM = 6371;
export const MOON_DISTANCE_AU = 384400 / AU_KM; // 0.00257 UA
export const MOON_DISTANCE_ER = 384400 / EARTH_RADIUS_KM; // 60,3 radios terrestres

export const SUN = {
  id: 'sol',
  name: 'Sol',
  type: 'Enana amarilla · G2V',
  radiusKm: 696340,
  color: '#ffb347',
  rotationHours: 609.12, // 25,4 días en el ecuador
  tiltDeg: 7.25,
  info: {
    diámetro: '1.392.700 km',
    masa: '1,989 × 10³⁰ kg',
    'distancia': '0 km (centro)',
    'periodo de rotación': '25,4 días',
    temperatura: '5.500 °C (superficie)',
    edad: '4.600 millones de años',
    desc: 'Una estrella de tipo G2V que concentra el 99,86 % de la masa de todo el sistema. En su núcleo, 600 millones de toneladas de hidrógeno se fusionan en helio cada segundo.',
    facts: [
      'La luz del Sol tarda 8 min 20 s en llegar a la Tierra.',
      'Su gravedad mantiene en órbita a todo lo demás, incluido el cinturón de Kuiper.',
      'Cada segundo irradia al espacio más energía que la humanidad consumió en todo su historia.'
    ]
  }
};

export const PLANETS = [
  {
    id: 'mercurio',
    name: 'Mercurio',
    type: 'Planeta rocoso',
    radiusKm: 2439.7,
    color: '#9a8f85',
    rotationHours: 1407.6,
    tiltDeg: 0.03,
    el: { a: 0.38709927, e: 0.20563593, i: 7.00497902, L: 252.2503235, peri: 77.45779628, node: 48.33076593 },
    tex: { kind: 'rocky', w: 768, h: 384, base: [138, 126, 116], dark: [70, 63, 58], light: [196, 184, 170], craters: 150, seed: 11 },
    info: {
      'diámetro': '4.879 km',
      masa: '3,30 × 10²³ kg',
      'distancia al Sol': '57,9 M km · 0,39 UA',
      'periodo orbital': '88 días',
      rotación: '58,6 días',
      lunas: '0',
      temperatura: '167 °C (media)',
      gravedad: '3,7 m/s²',
      desc: 'El planeta más pequeño y cercano al Sol. Sin atmósfera que amortigüe el calor, sus días superan los 400 °C y sus noches caen a −180 °C.',
      facts: [
        'Un día solar en Mercurio dura 176 días terrestres: dos de sus años.',
        'Su órbita es la más excéntrica de los ocho planetas (e = 0,206).',
        'Su núcleo de hierro ocupa cerca del 85 % de su radio.'
      ]
    }
  },
  {
    id: 'venus',
    name: 'Venus',
    type: 'Planeta rocoso',
    radiusKm: 6051.8,
    color: '#e6c98a',
    rotationHours: 5832.5, // retrógrada
    tiltDeg: 177.4,
    el: { a: 0.72333566, e: 0.00677672, i: 3.39467605, L: 181.9790995, peri: 131.60246718, node: 76.67984255 },
    tex: { kind: 'venus', w: 768, h: 384, base: [226, 196, 132], dark: [150, 116, 64], light: [255, 238, 196], seed: 23 },
    atmosphere: { color: 0xffd9a0, power: 3.0, intensity: 1.15 },
    clouds: { kind: 'venusClouds', opacity: 0.85, speed: 2.2 },
    info: {
      'diámetro': '12.104 km',
      masa: '4,87 × 10²⁴ kg',
      'distancia al Sol': '108,2 M km · 0,72 UA',
      'periodo orbital': '225 días',
      rotación: '243 días (retrógrada)',
      lunas: '0',
      temperatura: '464 °C (media)',
      gravedad: '8,87 m/s²',
      desc: 'Gemelo de la Tierra por tamaño, pero un infierno de invernadero: una atmósfera de CO₂ a 92 atm de presión hace que llueva ácido sulfúrico.',
      facts: [
        'Gira al revés: el Sol sale por el oeste.',
        'Es el cuerpo más caliente del sistema, aunque Mercurio está más cerca del Sol.',
        'Su superficie presiona como si estuvieras a 900 m de profundidad en el mar.'
      ]
    }
  },
  {
    id: 'tierra',
    name: 'Tierra',
    type: 'Planeta rocoso',
    radiusKm: 6371,
    color: '#4a90d9',
    rotationHours: 23.934,
    tiltDeg: 23.44,
    el: { a: 1.00000261, e: 0.01671123, i: -0.00001531, L: 100.46457166, peri: 102.93768193, node: 0 },
    tex: { kind: 'earth', w: 1024, h: 512, seed: 42 },
    atmosphere: { color: 0x5fa8ff, power: 2.4, intensity: 1.5 },
    clouds: { kind: 'earthClouds', opacity: 0.85, speed: 1.0 },
    hasMoon: true,
    info: {
      'diámetro': '12.742 km',
      masa: '5,97 × 10²⁴ kg',
      'distancia al Sol': '149,6 M km · 1 UA',
      'periodo orbital': '365,25 días',
      rotación: '23 h 56 min',
      lunas: '1 (La Luna)',
      temperatura: '15 °C (media)',
      gravedad: '9,81 m/s²',
      desc: 'El único lugar conocido con agua líquida estable, tectónica de placas y vida. Su magnetosfera y su ozono filtran la radiación que volvería estéril a la superficie.',
      facts: [
        'El 71 % de su superficie es agua; solo el 2,9 % es tierra firme.',
        'La Luna se aleja 3,8 cm al año y frenó la rotación terrestre de 6 a 24 horas.',
        'Junto con Venus, es uno de los dos únicos planetas con órbita casi circular.'
      ]
    }
  },
  {
    id: 'marte',
    name: 'Marte',
    type: 'Planeta rocoso',
    radiusKm: 3389.5,
    color: '#c1553a',
    rotationHours: 24.623,
    tiltDeg: 25.19,
    el: { a: 1.52371034, e: 0.0933941, i: 1.84969142, L: -4.55343205, peri: -23.94362959, node: 49.55953891 },
    tex: { kind: 'rocky', w: 768, h: 384, base: [176, 88, 54], dark: [96, 44, 28], light: [224, 158, 116], craters: 90, caps: 1, seed: 77 },
    atmosphere: { color: 0xffb08a, power: 3.4, intensity: 0.55 },
    info: {
      'diámetro': '6.779 km',
      masa: '6,42 × 10²³ kg',
      'distancia al Sol': '227,9 M km · 1,52 UA',
      'periodo orbital': '687 días',
      rotación: '24 h 37 min',
      lunas: '2 (Fobos, Deimos)',
      temperatura: '−65 °C (media)',
      gravedad: '3,71 m/s²',
      desc: 'El planeta rojo: óxido de hierro en todo su suelo. Conserva cauces secos, lagos y una atmósfera tenue que delatan un pasado con agua corriente.',
      facts: [
        'Olympus Mons, 21,9 km de alto, es el volcán más grande del sistema.',
        'Valles Marineris mide 4.000 km: un cañón que cruzaría toda España.',
        'Sus lunas son irregulares: posibles asteroides capturados.'
      ]
    }
  },
  {
    id: 'jupiter',
    name: 'Júpiter',
    type: 'Gigante gaseoso',
    radiusKm: 69911,
    color: '#d9a066',
    rotationHours: 9.925,
    tiltDeg: 3.13,
    el: { a: 5.202887, e: 0.04838624, i: 1.30439695, L: 34.39644051, peri: 14.72847983, node: 100.47390909 },
    tex: { kind: 'gas', w: 1024, h: 512, bands: 'jupiter', spot: true, seed: 101 },
    atmosphere: { color: 0xffd9b0, power: 3.2, intensity: 0.7 },
    info: {
      'diámetro': '139.820 km',
      masa: '1,90 × 10²⁷ kg',
      'distancia al Sol': '778,5 M km · 5,20 UA',
      'periodo orbital': '11,86 años',
      rotación: '9 h 56 min',
      lunas: '95 confirmadas',
      temperatura: '−110 °C (nubes)',
      gravedad: '24,79 m/s² (nubes)',
      desc: 'El gigante del sistema: más de dos veces el resto de los planetas juntos. Es una bola de hidrógeno y helio sin superficie sólida, con vientos de 600 km/h.',
      facts: [
        'La Gran Mancha Roja es una tormenta de 350 años y 1,3 Tierras de ancho.',
        'Su día es el más corto: gira en menos de 10 horas.',
        'Su campo magnético es 20.000 veces más potente que el terrestre.'
      ]
    }
  },
  {
    id: 'saturno',
    name: 'Saturno',
    type: 'Gigante gaseoso',
    radiusKm: 58232,
    color: '#e3cf9e',
    rotationHours: 10.656,
    tiltDeg: 26.73,
    el: { a: 9.53667594, e: 0.05386179, i: 2.48599187, L: 49.95424423, peri: 92.59887831, node: 113.66242448 },
    tex: { kind: 'gas', w: 1024, h: 512, bands: 'saturn', seed: 202 },
    rings: 'saturn',
    atmosphere: { color: 0xffe9c4, power: 3.2, intensity: 0.65 },
    info: {
      'diámetro': '116.460 km',
      masa: '5,68 × 10²⁶ kg',
      'distancia al Sol': '1.432 M km · 9,54 UA',
      'periodo orbital': '29,45 años',
      rotación: '10 h 39 min',
      lunas: '146 confirmadas',
      temperatura: '−140 °C (nubes)',
      gravedad: '10,44 m/s²',
      desc: 'El señor de los anillos: millones de fragmentos de hielo de entre 1 µm y 10 m que forman un sistema de 282.000 km de ancho y ~100 m de grosor.',
      facts: [
        'Su densidad media (0,687 g/cm³) es inferior a la del agua.',
        'Los anillos son jóvenes: quizá tengan solo 100 millones de años.',
        'Titán tiene lagos y lluvia de metano; es el único satélite con atmósfera densa.'
      ]
    }
  },
  {
    id: 'urano',
    name: 'Urano',
    type: 'Gigante de hielo',
    radiusKm: 25362,
    color: '#8fd8dd',
    rotationHours: 17.24, // retrógrada
    tiltDeg: 97.77,
    el: { a: 19.18916464, e: 0.04725744, i: 0.77263783, L: 313.23810451, peri: 170.9542763, node: 74.01692503 },
    tex: { kind: 'ice', w: 768, h: 384, base: [136, 214, 220], accent: [96, 178, 190], seed: 303 },
    rings: 'urano',
    atmosphere: { color: 0xa8f0ff, power: 3.0, intensity: 0.75 },
    info: {
      'diámetro': '50.724 km',
      masa: '8,68 × 10²⁵ kg',
      'distancia al Sol': '2.867 M km · 19,19 UA',
      'periodo orbital': '84 años',
      rotación: '17 h 14 min (retrógrada)',
      lunas: '28 confirmadas',
      temperatura: '−195 °C (nubes)',
      gravedad: '8,87 m/s²',
      desc: 'Gira tumbado: su eje está inclinado 97,8°, probablemente por un impacto gigante. Sus polos reciben 42 años de luz y 42 de oscuridad.',
      facts: [
        'Es el planeta más frío del sistema: −224 °C.',
        'Sus anillos oscuros y estrechos fueron descubiertos en 1977.',
        'Su color verdoso viene del metano que absorbe la luz roja.'
      ]
    }
  },
  {
    id: 'neptuno',
    name: 'Neptuno',
    type: 'Gigante de hielo',
    radiusKm: 24622,
    color: '#4f6fe0',
    rotationHours: 16.11,
    tiltDeg: 28.32,
    el: { a: 30.06992276, e: 0.00859048, i: 1.77004347, L: -55.12002969, peri: 44.96476227, node: 131.78422574 },
    tex: { kind: 'ice', w: 768, h: 384, base: [62, 96, 216], accent: [34, 58, 158], spots: true, seed: 404 },
    atmosphere: { color: 0x7fa0ff, power: 3.0, intensity: 0.85 },
    info: {
      'diámetro': '49.244 km',
      masa: '1,02 × 10²⁶ kg',
      'distancia al Sol': '4.515 M km · 30,07 UA',
      'periodo orbital': '164,8 años',
      rotación: '16 h 6 min',
      lunas: '16 confirmadas',
      temperatura: '−200 °C (nubes)',
      gravedad: '11,15 m/s²',
      desc: 'El planeta más lejano y más azul, descubierto por matemáticas antes que por telescopio: su órbita se predijo a partir de las perturbaciones de Urano.',
      facts: [
        'Tiene los vientos más rápidos del sistema: hasta 2.100 km/h.',
        'Tritón orbita al revés y probablemente sea un planeta enano capturado.',
        'Desde su descubrimiento en 1846 solo ha completado una vuelta al Sol.'
      ]
    }
  }
];

export const MOON = {
  id: 'luna',
  name: 'La Luna',
  type: 'Satélite natural de la Tierra',
  radiusKm: 1737.4,
  color: '#b8b6b1',
  rotationHours: 655.7, // síncrona
  tiltDeg: 6.68,
  tex: { kind: 'rocky', w: 512, h: 256, base: [176, 174, 168], dark: [86, 85, 82], light: [222, 220, 214], craters: 220, seed: 5 },
  info: {
    'diámetro': '3.475 km',
    masa: '7,35 × 10²² kg',
    'distancia a la Tierra': '384.400 km',
    'periodo orbital': '27,3 días',
    rotación: '27,3 días (síncrona)',
    'gravedad': '1,62 m/s²',
    temperatura: '−53 °C (media)',
    desc: 'El único satélite natural de la Tierra y el único otro cuerpo que pisamos. Su ausencia de atmósfera conserva huellas de impactos de hace 4.000 millones de años.',
    facts: [
      'Se aleja 3,8 cm de la Tierra cada año.',
      'Muestra siempre la misma cara: rotación y órbita están acopladas.',
      'Las mareas oceánicas son su obra maestra gravitatoria.'
    ]
  }
};

export const BELT = {
  id: 'cinturon',
  name: 'Cinturón de asteroides',
  inner: 2.1,
  outer: 3.35,
  count: 2600,
  color: '#9c948a'
};

export const KUIPER = {
  id: 'kuiper',
  name: 'Cinturón de Kuiper',
  inner: 30,
  outer: 50,
  count: 4200,
  color: '#9fc8ff'
};

/** Lista completa para chips, atajos y etiquetas */
export const ALL_BODIES = [SUN, ...PLANETS, MOON];
