# Clearn to GitHub Sync

Extensión Manifest V2 para Firefox y LibreWolf. Permite sincronizar manualmente el ejercicio abierto en Clearn con un repositorio de GitHub.

## Instalación temporal

1. Abre `about:debugging` en Firefox o LibreWolf.
2. Selecciona **Este Firefox** y luego **Cargar complemento temporal**.
3. Selecciona el archivo `manifest.json` de este proyecto.

La instalación temporal puede desaparecer al cerrar el navegador; vuelve a cargar el manifiesto para usarla otra vez.

## Configuración

1. Crea un token de GitHub con acceso de lectura y escritura al contenido del repositorio privado. Para un token fine-grained, concede **Contents: Read and write**.
2. Abre el popup de la extensión, introduce el token y el repositorio con el formato `usuario/repositorio`.
3. Pulsa **Guardar Configuración** y, si lo deseas, **Probar Conexión GitHub**.

El token se guarda en el almacenamiento local del navegador. No lo escribas en los archivos del proyecto ni lo subas al repositorio.

## Sincronizar un ejercicio

Abre el ejercicio en Clearn y deja visible el código en el editor. Pulsa el icono de la extensión y selecciona **Sincronizar ejercicio actual**. La extensión crea o actualiza `README.md` con el enunciado y `solution.py` con el código en una ruta equivalente a:

```text
Introduccion a la Programacion/<evaluacion>/<pregunta>/
```

La sincronización es manual e independiente del botón Guardar de Clearn.

## Licencia y responsabilidad

El código se distribuye bajo la licencia MIT. Consulta [LICENSE](LICENSE) para sus términos y [DISCLAIMER.md](DISCLAIMER.md) para el aviso sobre uso, responsabilidad e integridad académica.