> Traducción al español. La referencia canónica es [la versión en inglés](../../en/guides/where-to-put-truss.md).

# Elegir dónde vive TRUSS

Un proyecto con más de una parte (una API y un worker, un motor de cálculo y un plano de control, varios módulos) puede usar TRUSS de tres maneras. Esta guía te ayuda a elegir una y dice qué le hace cada opción a la configuración, la verificación, el cambio activo y las specs.

Todo lo que aparece como comportamiento se ejecutó en repositorios desechables. Los consejos, como cuándo separar, son una recomendación y se marcan como tal.

## Las tres disposiciones

| | Un TRUSS en la raíz, con `components` | Un TRUSS por carpeta de proyecto | Un TRUSS por módulo |
|---|---|---|---|
| Dónde está `.truss/` | la raíz del repositorio | dentro de cada carpeta de proyecto (`calculation/.truss/`, `control-plane/.truss/`) | dentro de la carpeta de cada módulo |
| Configuración y `verification.commands` | una, para todo el repositorio | una por carpeta | una por módulo |
| `verify` se ejecuta desde | la raíz, para todos los componentes | cada carpeta | la carpeta de cada módulo |
| Cambio activo | uno a la vez, entre todos los componentes | uno a la vez **por carpeta** | uno a la vez por módulo |
| Evidencia y estado | un `.truss/verification/latest.json` y un `state.json` | separados en cada una | separados en cada uno |
| `openspec/` | el de la raíz, o uno dentro de un componente | uno por carpeta | uno por módulo |
| Un cambio que toca dos partes | un solo cambio | dos cambios sin vínculo entre ellos | dos cambios sin vínculo |
| Conviene cuando | las partes comparten un pipeline y cambian juntas a menudo | cada parte tiene su propio paquete, pipeline y release | un módulo ya es un proyecto por sí mismo |

**Recomendación.** Empieza por la primera columna. Pasa a la segunda cuando las partes tengan su propio gestor de paquetes, verificación y release, y quieras trabajar en ambas a la vez. Evita la tercera salvo que un módulo ya sea un proyecto en la práctica; un módulo que es solo una carpeta dentro de `src/` no necesita su propio TRUSS.

## Disposición 1: un TRUSS y `components`

Declara cada parte bajo `components` en `.truss/config.yaml`:

```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```

Después, `truss new "Add retry" --component api` crea el cambio para ese componente. `truss components` muestra lo que TRUSS resolvió. Estas reglas vienen de la [resolución de componentes](../reference/components.md) y es fácil tropezar con ellas:

- **Un componente es una carpeta con su propio código.** TRUSS busca `src`, `app`, `apps`, `lib` o `packages` y `test`, `tests`, `__tests__` o `spec` **dentro de la carpeta del componente**. Una parte que es solo una subcarpeta de `src/` de otro componente no es un componente propio; `truss components` informaría `source: not detected` para ella.
- **Su archivo de guía es el `AGENTS.md` del propio componente si el archivo existe, aunque esté vacío.** Un `apps/worker/AGENTS.md` vacío hace que la guía efectiva de `worker` sea vacía, y no se usa el `AGENTS.md` de la raíz. Sin un archivo en la carpeta, TRUSS recurre al de la raíz. Si un componente tiene un `AGENTS.md`, escribe algo en él.
- **`openspec/` es del componente solo si es un proyecto OpenSpec de verdad.** Sin carpeta `openspec/` en el componente, sus cambios van al `openspec/` de la raíz. Con una creada por `openspec init` (ejecútalo dentro de la carpeta del componente), van allí. Una carpeta creada a mano no basta: `truss components` dice entonces `OpenSpec: component`, pero OpenSpec ignora la carpeta, y `truss new --component api` crea el cambio en el `openspec/` de la raíz.
- **Una sola lista de comandos de verificación.** `truss verify` se ejecuta desde la raíz del repositorio, sea cual sea el componente del cambio activo. Un comando que deba revisar solo un componente tiene que decirlo él mismo.
- **Un cambio activo a la vez.** Empezar un cambio en otro componente lo convierte en el activo; el primero sigue abierto en OpenSpec, y `truss use` vuelve a él.

## Disposición 2: un TRUSS por carpeta de proyecto

Así está organizado el repositorio de abajo:

```text
my-project/                (un repositorio Git)
  calculation/
    .truss/                su propia configuración, estado y evidencia
    openspec/
  control-plane/
    .truss/
    openspec/
```

TRUSS funciona dentro de una subcarpeta de un repositorio Git. En una prueba con un `.truss/` en cada una de dos carpetas del mismo repositorio, `init`, `doctor`, `new` y `status` fueron independientes en cada una: cada una tenía su propio cambio activo, y el de `calculation/` no aparecía en `control-plane/`. Ignora cada `.truss/` (consulta [usar TRUSS en un repositorio compartido](shared-repo.md#ignorar-truss-sin-tocar-gitignore)) y ejecuta cada comando de TRUSS desde dentro de la carpeta a la que pertenece.

Lo que cuesta: nada conecta a los dos. No hay cambio compartido, ni evidencia compartida, ni configuración compartida. Un cambio en una parte no aparece en el `status` de la otra.

## Un cambio que cruza dos proyectos TRUSS

Con la disposición 2, una funcionalidad que toca ambas partes son dos cambios, uno en cada una. TRUSS no los vincula. Un patrón que funciona (una recomendación, no algo que TRUSS imponga):

1. Decide primero el contrato entre las partes (la forma de un mensaje o de una API) y dale **un solo dueño**: la parte que lo provee.
2. Haz primero el cambio del proveedor y commitea su spec, para que la spec del consumidor pueda referirse a ella.
3. Haz el cambio del consumidor contra ese contrato, con una prueba que lo ejercite.
4. Nombra el otro cambio en cada proposal, para que un lector pueda encontrar ambos.

Si te encuentras haciendo esto a menudo, es señal de que las partes pertenecen a la disposición 1, con un solo cambio que cruza componentes.

## Cuándo separar un módulo en su propio proyecto

Sepáralo (una recomendación) cuando tenga su propio gestor de paquetes y dependencias, su propio pipeline de verificación, su propia release y personas que trabajen en él por separado. Mantenlo dentro de un componente cuando comparta el paquete y el pipeline del componente: las reglas del módulo van entonces en un `src/<módulo>/AGENTS.md` y en las specs, no en un TRUSS aparte.

## Véase también

- [Resolución de componentes](../reference/components.md)
- [Primeros pasos, monorepos](../getting-started.md#7-monorepos)
- [Usar TRUSS en un repositorio compartido](shared-repo.md)
- [Estado duradero frente a efímero](../concepts/durable-vs-ephemeral.md)
