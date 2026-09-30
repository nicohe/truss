# Contrato de compatibilidad con OpenSpec

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/integrations/openspec-compatibility.md).

TRUSS v0.2 admite las versiones estables de OpenSpec de este rango:

```text
>=1.0.0 <2.0.0
```

TRUSS trata OpenSpec como una dependencia obligatoria con dueño independiente. Detecta y evalúa el CLI instalado, pero nunca actualiza, degrada ni sobrescribe OpenSpec de forma automática.

## Estados

- `compatible`: OpenSpec 1.x estable; los workflows pueden continuar.
- `too_old`: la versión es anterior a 1.0.0; los workflows que requieren OpenSpec deben detenerse.
- `unsupported_newer`: la versión es 2.0.0 o posterior; TRUSS debe detenerse hasta que se añada la compatibilidad de forma explícita.
- `unknown`: la versión no se puede interpretar o es una prerelease; no se asume la compatibilidad.
- `missing`: el CLI no está instalado.

Una versión 1.x más reciente la acepta el contrato de v0.2. Una futura versión mayor se rechaza a propósito (fail-closed), porque puede cambiar comandos, la estructura del proyecto o la semántica de los artefactos.

TRUSS no ejecuta `openspec update` en silencio ni instala en silencio otra versión. El usuario conserva el control de los cambios en el ciclo de vida de OpenSpec.
