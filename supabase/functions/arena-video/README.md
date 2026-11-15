Función `arena-video`: cada 10 min (pg_cron 'arena-video-auto') lee el feed público del canal
UCqft0zwed7YVzx7A6qBmhkQ y pone en arena_dias.video_youtube el primer video cuyo título tenga
"Arena". Si el título dice "Día N" va a ese día; si no, al día en que se publicó (acepta hasta 18 h antes).
Solo llena días sin video: para corregir uno, edítalo a mano en arena_dias.
