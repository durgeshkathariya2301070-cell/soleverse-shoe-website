// Joins class names and ignores empty values: cn('a', false, 'b') -> 'a b'
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
