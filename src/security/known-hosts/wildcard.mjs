export function matchesWildcard(pattern, value) {
  let expression = '^';
  const escape = character => character.replace(/[\\^$.[\]{}()+|\-/]/g, '\\$&');
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '\\' && index + 1 < pattern.length) expression += `\\${pattern[++index]}`;
    else if (character === '*') expression += '.*';
    else if (character === '?') expression += '.';
    else expression += escape(character);
  }
  return new RegExp(`${expression}$`).test(value);
}
