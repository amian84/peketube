# Límites del reproductor embebido (OQ-11-003 A)

PekeTube usa la **IFrame Player API** de Google. No se puede eliminar al 100 % el branding ni redirigir los controles nativos de YouTube a rutas de esta app.

## Lo que hace la app

- `controls=0`, iframe con `pointer-events: none`, capa propia para play/pausa y doble clic ±10 s.
- Barra de progreso y seeking propios.
- Al terminar: overlay «Siguiente en PekeTube» con enlaces `/watch/...`.
- Si el vídeo no es embebible: salto automático al siguiente.

## Lo que no es posible (ToS / API)

- Hacer que «Más vídeos», el logo o «Ver en YouTube» del iframe apunten a PekeTube.
- Garantizar cero salida a youtube.com en todos los dispositivos y versiones del player.

## Referencias

- [Player parameters](https://developers.google.com/youtube/player_parameters)
- [IFrame API](https://developers.google.com/youtube/iframe_api_reference)
