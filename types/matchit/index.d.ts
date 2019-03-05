declare module 'matchit' {
  interface DefinitionObj {
    old: string;
    type: 0 | 1 | 2 | 3;
    val: string;
  }

  export function parse(route: string): Array<DefinitionObj>;

  export function match(
    url: string,
    routes: Array<Array<DefinitionObj>>
  ): Array<DefinitionObj>;

  export function exec<KeyVal extends {}>(
    url: string,
    match: Array<DefinitionObj>
  ): KeyVal;
}
