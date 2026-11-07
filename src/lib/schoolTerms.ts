/**
 * Irish school class and year groups.
 *
 * The stored value is a stable slug; the label is what an SNA or teacher
 * actually says in a staffroom. Keep this list and the select in
 * AddStudentDialog in step with each other.
 */
export const CLASS_GROUPS: { value: string; label: string }[] = [
  { value: 'ecce', label: 'Pre-school / ECCE' },
  { value: 'junior-infants', label: 'Junior Infants' },
  { value: 'senior-infants', label: 'Senior Infants' },
  { value: '1st-class', label: '1st Class' },
  { value: '2nd-class', label: '2nd Class' },
  { value: '3rd-class', label: '3rd Class' },
  { value: '4th-class', label: '4th Class' },
  { value: '5th-class', label: '5th Class' },
  { value: '6th-class', label: '6th Class' },
  { value: '1st-year', label: '1st Year' },
  { value: '2nd-year', label: '2nd Year' },
  { value: '3rd-year', label: '3rd Year' },
  { value: 'transition-year', label: 'Transition Year' },
  { value: '5th-year', label: '5th Year' },
  { value: '6th-year', label: '6th Year' },
  { value: 'lca', label: 'Leaving Certificate Applied (LCA)' },
  { value: 'special-class', label: 'Special class' },
  { value: 'special-school', label: 'Special school' },
]

const BY_VALUE = new Map(CLASS_GROUPS.map(g => [g.value, g.label]))

/**
 * Turn a stored class value into something readable. Profiles created before
 * this list existed hold free text or an older slug, so fall back to tidying
 * up whatever is there rather than showing a raw slug.
 */
export function classLabel(value?: string): string {
  if (!value) return ''
  const known = BY_VALUE.get(value)
  if (known) return known
  return value
    .split('-')
    .map(part => (part.length <= 3 && /\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ')
}
