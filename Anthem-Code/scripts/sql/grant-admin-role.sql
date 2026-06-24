-- แก้ YOUR_USER_UUID เป็น auth.users.id ของบัญชีที่จะเข้า /admin

INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_UUID'::uuid, 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

SELECT ur.user_id, ur.role, p.email, p.display_name
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin';
