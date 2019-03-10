export = createProgram;

interface Prog {
  command(usage: string): Prog;
  version(version: string): Prog;
  describe(desc: string): Prog;
  example(example: string): Prog;
  option(declaration: string, desc: string, value?: any): Prog;
  action(handler: any): Prog;
  parse(arv: any): Prog;
  help(): Prog;
}

declare function createProgram(name: any): Prog;
