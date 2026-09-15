@AGENTS.md

# China History — Guía del proyecto para Claude Code

## Qué es esto
App de portfolio para aprender LangChain/LangGraph. El usuario elige un lugar (mapa) y un año (slider), y el sistema genera una imagen reconstruyendo cómo era ese lugar en ese momento — con dos modos: hito histórico documentado (si se encuentra) o reconstrucción ambiental genérica (fallback). Toda la lógica y el detalle de arquitectura están en `china-history-contexto-claude-code.md` en este mismo repo — léelo antes de tocar el módulo `historical-agent`.

## Stack
- Backend: `china-history-api` — NestJS + TypeScript + MongoDB (Mongoose), puerto **3003**
- Frontend: `china-history-web` — Next.js + TypeScript + Mapbox GL JS, puerto 3000
- IA: LangChain + LangGraph
- Búsqueda web para el agente: Tavily
- Generación de imágenes: proveedor aún sin decidir (candidatos: Replicate/Fal.ai con SDXL Turbo o FLUX Schnell — prioridad velocidad, no DALL-E 3)

## Comandos
```bash
# Backend
cd china-history-api
npm run start:dev        # localhost:3003

# Frontend
cd china-history-web
npm run dev               # localhost:3000
```

## Reglas del proyecto (no romper)

- **Caché primero, siempre**: cualquier nodo que consulte año+lugar debe mirar MongoDB antes de llamar a un LLM, búsqueda web o generación de imagen. No se vuelve a pagar por una combinación ya resuelta.
- **Nunca filtrar por fiabilidad**: todo hito/hallazgo se muestra siempre, aunque la fiabilidad sea "baja". La fiabilidad es solo una etiqueta informativa (alta/media/baja), nunca una condición para ocultar el resultado.
- **Dos ramas siempre en paralelo** en el nodo de investigación: contexto ambiental (casi siempre hay algo, sin gran escrutinio) + hito específico (si existe, con evaluación de fiabilidad).
- **Nodos separados y probables de forma aislada**: no encadenar un nodo nuevo de LangGraph hasta que el anterior funcione solo con datos de prueba. El usuario prefiere ir sustituyendo piezas del esqueleto una a una, no construir el grafo completo de golpe.
- **CHGIS es la fuente de verdad geográfica** para 222 a.C.–1911 d.C. Antes de esa fecha no hay dataset equivalente — usar puntos arqueológicos conocidos, nunca inventar fronteras.

## Estilo de trabajo con el usuario

- Explica el porqué antes de dar la solución completa; el usuario aprende mejor con pistas y preguntas que con código ya cerrado.
- Full-stack JS/TS con experiencia previa en NestJS, Next.js, MongoDB y el patrón BFF — no hace falta explicar estos conceptos desde cero.
- Antes de implementar un nodo nuevo, confirma con el usuario las decisiones de diseño que sigan abiertas (revisa la sección "Estado actual del desarrollo" del `.md` de contexto).