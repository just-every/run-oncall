export const nativeName = (id: string) => /-[a-f0-9]{12}$/.test(id) ? id.slice(0, -13) : /^[a-f0-9-]{32,}$/i.test(id) ? 'Events source' : id.replaceAll('-', ' ');
