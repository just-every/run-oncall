/** First and last initial of a name; a single word gives one letter. */
export const initials = (name: string) => {
  const words = name.trim().split(/\s+/);
  return [words[0], ...(words.length > 1 ? [words.at(-1)!] : [])].map(word => Array.from(word)[0]).join('').toLocaleUpperCase();
};
