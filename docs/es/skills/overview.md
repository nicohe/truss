# Skills de TRUSS

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/skills/overview.md).

TRUSS v0.2 incluye siete skills portables para agentes. Son contratos de instrucciones, no comandos de un vendor concreto: Claude Code, Codex, Devin u otro agente pueden leer la misma definición.

| Skill | Propósito | Cuándo usarla |
|---|---|---|
| grill-me | Descubrir requisitos y decisiones que faltan a partir de una idea o un cambio. | Una idea o un cambio poco claros, antes de escribir la spec. |
| grill-with-docs | Descubrir ambigüedades a partir de requisitos o documentación existentes. | Ya existen requisitos, propuestas, diagramas o ejemplos. |
| prototype | Resolver una incertidumbre técnica con un experimento acotado. | Antes de comprometer una decisión técnica incierta. |
| code-review | Revisión independiente sobre Spec, Standards y Risk. | Después de una implementación que pasa la verificación. |
| handoff | Transferir el estado vivo mínimo entre límites de contexto. | Un cambio de agente, runtime, sesión o reviewer. |
| writing-for-agents | Mantener pequeño y fiable el contexto del repositorio pensado para agentes. | `AGENTS.md`, specs, ADRs, workflows y documentación. |
| caveman | Comprimir la comunicación efímera del agente sin cambiar su significado. | Actualizaciones de estado, handoffs y mensajes operativos. |

No hace falta usar todas las skills en cada cambio: carga una skill cuando surja su situación y ninguna en caso contrario (consulta la [gestión de contexto](../concepts/context-management.md)). Para las dos skills de Grill y `prototype`, consulta [Descubrimiento](../workflows/discovery.md).

Las skills viven en `.truss/skills/*.SKILL.md` para que cualquier runtime lea la misma fuente. Los runtime adapters podrán exponer más adelante comandos nativos conservando estos contratos.

## Las skills son archivos, no entradas de un menú

Una skill de TRUSS es un archivo Markdown que el agente lee. No está registrada en ningún agente, así que **no** aparece en el menú `/` de Claude Code, Codex ni Devin, y escribir su nombre como comando no hace nada. En un proyecto que sigue el inicio rápido los archivos están en `.truss/.truss/skills/` (la carpeta `.truss/` propia del clon); `truss skills` los lista, y `truss continue` imprime las rutas reales de tu disposición. Nombra el archivo en tu prompt:

> Review the change `add-retry-policy` with the skill in `.truss/.truss/skills/code-review.SKILL.md`. Read the spec first, then the diff.

### `code-review` y el `/code-review` de Claude Code

Son dos cosas distintas con el mismo nombre. La skill de TRUSS es el archivo de arriba: una revisión en tres ejes (Spec, Standards, Risk) que parte de la spec activa y de la evidencia de verificación. El comando `/code-review` de Claude Code es un comando integrado que revisa el diff actual en busca de errores de corrección, con niveles de esfuerzo y `--fix` ([comandos](https://code.claude.com/docs/en/commands)). No lee tu cambio de OpenSpec salvo que se lo digas. Para ejecutar la revisión de TRUSS en Claude Code, señala la ruta de la skill como en el prompt de arriba; `/code-review` es una pasada extra útil, no un reemplazo.

### `caveman`

`caveman` es manual: TRUSS nunca la activa, y nada en `truss continue` la pide. La pides tú en el prompt, para una salida que se lee una vez y se descarta: mensajes de estado, handoffs, mensajes intermedios entre agentes. Una ilustración de la misma línea de estado en cada modo (la redacción variará):

| Modo | Ejemplo |
|---|---|
| ninguno | I have finished the first two tasks and the tests pass, but I could not run the type check because the build is failing on an unrelated file, so I am going to look at that next. |
| `lite` | First two tasks done, tests pass. Type check blocked by a build failure in an unrelated file; investigating. |
| `full` | Tasks 1-2 done. Tests pass. Typecheck blocked: build fails, unrelated file. Checking. |
| `ultra` | T1-2 ok. Tests ok. Typecheck blocked: unrelated build fail. Checking. |

No la uses para lo que debe conservar su razonamiento: un informe de revisión, una spec, un diseño, un ADR. La propia skill los excluye, porque comprimir puede quitar el «por qué» que hace accionable un hallazgo. Si le pediste a un revisor una copia comprimida, entrega al implementador el informe original y usa la comprimida solo como resumen.

### Políticas y skills externas

BDD y TDD son políticas, definidas por `development.bdd` y `development.tdd` en `.truss/config.yaml`, y `truss continue` dirige al agente hacia ellas. Si además instalas una skill de terceros sobre pruebas, es una instrucción extra en el contexto del agente, y TRUSS no puede saber cuál de las dos manda cuando difieren. Dilo en tu prompt o en tu archivo de guía (por ejemplo, «decide la política TDD de TRUSS; la skill extra solo añade ejemplos»), y comprueba que el vocabulario coincide con el de la política: RED, GREEN, refactor y *vertical slice*.

BDD, TDD, Spec-Anchored, Spec-as-Source, Verification y Review son policies, no skills. OpenSpec y Graphify son integrations. `execute-change` es el workflow central. Esta separación evita crear una skill para cada concepto: las skills son capacidades reutilizables, las policies establecen reglas, los workflows las coordinan y las integrations conectan herramientas externas.

En v0.2 las skills son archivos que el coding agent debe leer y aplicar; TRUSS todavía no controla el runtime. En v0.3+, los runtime adapters podrán cargar estas mismas skills y orquestar su ejecución sin cambiar su semántica.
