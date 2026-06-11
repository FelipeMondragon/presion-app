-- Datos de prueba para la app de presión de papá
-- 30 mediciones realistas en los últimos 30 días
-- Insertar solo si no hay mediciones aún
do $$
begin
  if not exists (select 1 from public.measurements limit 1) then
    insert into public.measurements (user_id, systolic, diastolic, pulse, arm, position, notes, measured_at) values
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 118, 78, 72, 'left', 'sitting', 'Después del desayuno', now() - interval '30 days' + time '08:15'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 122, 80, 68, 'right', 'sitting', null, now() - interval '29 days' + time '20:10'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 135, 85, 76, 'left', 'sitting', 'Un poco elevada', now() - interval '28 days' + time '08:05'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 128, 82, 70, 'right', 'sitting', null, now() - interval '27 days' + time '20:00'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 115, 75, 65, 'left', 'lying', 'Bien relajado', now() - interval '26 days' + time '08:20'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 120, 79, 74, 'right', 'sitting', null, now() - interval '25 days' + time '20:05'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 142, 92, 82, 'left', 'sitting', 'Después de comer mucho', now() - interval '24 days' + time '08:10'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 130, 84, 71, 'right', 'sitting', null, now() - interval '23 days' + time '20:15'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 117, 76, 69, 'left', 'lying', 'Mañana tranquila', now() - interval '22 days' + time '08:00'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 124, 81, 73, 'right', 'sitting', null, now() - interval '21 days' + time '20:20'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 138, 88, 78, 'left', 'sitting', 'Estresado con el trabajo', now() - interval '20 days' + time '08:15'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 125, 80, 67, 'right', 'sitting', null, now() - interval '19 days' + time '20:00'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 112, 74, 64, 'left', 'lying', 'Muy descansado', now() - interval '18 days' + time '08:10'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 121, 78, 72, 'right', 'sitting', null, now() - interval '17 days' + time '20:05'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 132, 86, 75, 'left', 'sitting', 'Después de caminar', now() - interval '16 days' + time '08:20'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 119, 77, 70, 'right', 'sitting', null, now() - interval '15 days' + time '20:10'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 126, 82, 69, 'left', 'sitting', 'Normal', now() - interval '14 days' + time '08:00'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 145, 95, 85, 'right', 'sitting', 'Muy elevada', now() - interval '13 days' + time '20:15'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 116, 75, 66, 'left', 'lying', null, now() - interval '12 days' + time '08:05'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 123, 80, 71, 'right', 'sitting', null, now() - interval '11 days' + time '20:00'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 137, 87, 77, 'left', 'sitting', 'Día pesado', now() - interval '10 days' + time '08:15'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 120, 79, 68, 'right', 'sitting', null, now() - interval '9 days' + time '20:10'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 114, 73, 63, 'left', 'lying', 'Fin de semana, sin presión', now() - interval '8 days' + time '08:20'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 129, 83, 72, 'right', 'sitting', null, now() - interval '7 days' + time '20:05'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 140, 90, 80, 'left', 'sitting', 'Después del café', now() - interval '6 days' + time '08:10'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 122, 81, 69, 'right', 'sitting', null, now() - interval '5 days' + time '20:00'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 118, 76, 67, 'left', 'sitting', 'Bien', now() - interval '4 days' + time '08:15'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 127, 82, 73, 'right', 'sitting', null, now() - interval '3 days' + time '20:20'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 131, 85, 74, 'left', 'sitting', 'Un poco elevada', now() - interval '2 days' + time '08:05'),
    ('7ceb5ed9-09c6-41dd-ad39-06b27aca480d', 120, 78, 70, 'right', 'sitting', null, now() - interval '1 day' + time '20:10');
  end if;
end $$;
