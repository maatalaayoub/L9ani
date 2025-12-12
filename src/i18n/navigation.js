import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'ar'];

export const { Link, redirect, usePathname, useRouter } = createNavigation({
    locales
});
