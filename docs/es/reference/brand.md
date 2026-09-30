# Guía de marca de TRUSS

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/brand.md).

## Concepto

TRUSS toma su nombre de la estructura de ingeniería: elementos simples unidos con una geometría deliberada forman un conjunto fuerte. La marca usa un triángulo estructural como símbolo principal.

## Marca principal

Usa `assets/logo/truss-gradient.svg` en GitHub, el README, la documentación, sitios web y superficies de producto donde haya color disponible.

### Paleta

| Rol | Color | Hex | Proporción aprox. en la identidad |
|---|---|---:|---:|
| Primario | Azul | `#3B82F6` | 40 % |
| Secundario | Púrpura | `#8B5CF6` | 25 % |
| De apoyo | Cian | `#06B6D4` | 20 % |
| Acento | Esmeralda | `#10B981` | 15 % |

El azul debe seguir dominando visualmente. El púrpura, el cian y el esmeralda diferencian la marca; no des a los cuatro colores el mismo peso visual.

## Variantes

- `truss-gradient.svg`: la opción por defecto sobre superficies oscuras o neutras.
- `truss-blue.svg`: alternativa de color plano y para contextos de interfaz pequeños.
- `truss-white.svg`: fondos monocromos oscuros.
- `truss-black.svg`: fondos monocromos claros.

No recolorees la marca principal de forma arbitraria, ni la rotes, la estires, le añadas sombras ni pongas texto dentro del triángulo.

## Tamaños pequeños

A 32 px o menos, prefiere la marca de azul plano o monocroma si el degradado pierde definición. A 16 px, prioriza la silueta sobre el detalle de color interno.

## Identidad en el CLI

No dibujes el SVG ni un banner ASCII grande en cada comando. Usa la firma compacta de terminal:

```text
△ TRUSS · status
```

Vocabulario de estados:

```text
● complete / ready
◐ active
○ pending
× failed
```

El color en la terminal es opcional. Si se admite, usa azul para la firma de TRUSS, cian para el trabajo activo, esmeralda para el éxito, gris neutro para lo pendiente y rojo solo para los fallos.

## Wordmark

Usa `TRUSS` en mayúsculas con un tracking generoso en las superficies de marca. En comandos y nombres de paquete usa `truss` en minúsculas.
