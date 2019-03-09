declare module 'fast-json-parse' {
  export default function parseJson<Val extends {}>(
    data: any
  ): {
    err: Error;
    value: Val;
  };
}
