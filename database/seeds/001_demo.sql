-- Caso ficticio del anteproyecto. Cargar solo en un entorno local de demostración.
INSERT INTO sources (id, name, status) VALUES
  ('rematecr-proposal-demo', 'Caso ficticio · Propuesta RemateCR AI v0.2', 'demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO assets (id, slug, title, category, summary, price, source_id, status) VALUES
  ('8bc03336-95d8-4a7c-a441-33e59c34c5a1', 'vehiculo-a', 'Vehículo A', 'vehicle',
   'Ejemplo del anteproyecto para comparar el precio publicado con el costo total estimado.',
   4000000, 'rematecr-proposal-demo', 'published'),
  ('8bc03336-95d8-4a7c-a441-33e59c34c5a2', 'vehiculo-b', 'Vehículo B', 'vehicle',
   'Ejemplo del anteproyecto para comparar el precio publicado con el costo total estimado.',
   4600000, 'rematecr-proposal-demo', 'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO asset_costs (id, asset_id, label, amount, sort_order) VALUES
  ('repair', '8bc03336-95d8-4a7c-a441-33e59c34c5a1', 'Reparaciones estimadas', 1200000, 1),
  ('other',  '8bc03336-95d8-4a7c-a441-33e59c34c5a1', 'Otros gastos estimados', 500000, 2),
  ('repair', '8bc03336-95d8-4a7c-a441-33e59c34c5a2', 'Reparaciones estimadas', 300000, 1),
  ('other',  '8bc03336-95d8-4a7c-a441-33e59c34c5a2', 'Otros gastos estimados', 500000, 2)
ON CONFLICT (asset_id, id) DO NOTHING;

INSERT INTO users (id, name, email, password_hash, role_id) VALUES
  ('3586c397-3804-429b-ad86-97c237366f01', 'Comprador de demostración', 'comprador@example.test',
   '$2b$12$5/s3uCSbO2Q5Dwuh5WV9U.iqqktEX2uIP3QHoIwt1QfE9RoDUZt5.', 'buyer'),
  ('3586c397-3804-429b-ad86-97c237366f02', 'Segundo comprador de demostración', 'comprador2@example.test',
   '$2b$12$l1rzM9gmXBB6uHG2Tc7qcewjvRkn.mnT./6XV817FsdLvMmBsxXsW', 'buyer'),
  ('3586c397-3804-429b-ad86-97c237366f03', 'Administrador de demostración', 'admin@example.test',
   '$2b$12$xvo6dPqNXXD9EEV.k6m3zu90N6siNgQPbVpzVFdofSoUpxYFAxqBS', 'admin'),
  ('3586c397-3804-429b-ad86-97c237366f04', 'Auditor de demostración', 'auditor@example.test',
   '$2b$12$1ySKwxGr7F50XyMMpysmxe4Sj4Ipyv684GpXK4m8IuY/Eef.OZrfO', 'auditor')
ON CONFLICT (id) DO NOTHING;
