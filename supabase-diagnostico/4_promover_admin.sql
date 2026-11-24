-- ============================================================
-- PROMOVER USUÁRIO A ADMIN
-- Rode DEPOIS de criar o usuário no painel Auth.
-- Substitua o email abaixo pelo email que você cadastrou.
-- ============================================================

-- 1. Veja todos os usuários cadastrados no Auth
SELECT u.email, u.created_at::date AS criado_em, p.role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- 2. Promova o usuário a admin (DESCOMENTE a linha abaixo e ajuste o email)
-- UPDATE profiles
-- SET role = 'admin', updated_at = now()
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@energiza.com');

-- 3. Confirme que virou admin
-- SELECT id, name, email, role FROM profiles WHERE role = 'admin';
--
-- SELECT u.email, p.role
-- FROM auth.users u
-- LEFT JOIN profiles p ON p.id = u.id;
